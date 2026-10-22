import { syncApi } from './api';
import {
  getPendingOutboxMessages,
  markMessageAcknowledged,
  saveIncomingMessage,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
} from '../db/indexedDb';

/**
 * SyncService coordinates the synchronization of offline messages
 * when the client recovers internet connectivity.
 *
 * Synchronization flow:
 * 1. Pulls all pending messages currently stored in the Dexie `outbox` table.
 * 2. Fetches the `lastSyncTimestamp` from IndexedDB.
 * 3. Sends POST /api/v1/sync to the backend.
 * 4. Backend idempotently persists new outbox messages and returns:
 *    - acknowledgedMessages: { [clientMessageId]: serverId }
 *    - newIncomingMessages: List of messages sent by other participants since lastSyncTimestamp
 *    - duplicatesSkipped: Count of messages previously processed
 * 5. Updates IndexedDB:
 *    - Acknowledged messages marked 'SENT', updated with serverId, removed from outbox
 *    - New incoming messages saved to `messages` and `conversations`
 *    - Updates `lastSyncTimestamp` to now
 */
class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = new Set();
  }

  async performSync() {
    if (this.isSyncing) {
      console.log('Sync already in progress — skipping concurrent call');
      return { inProgress: true };
    }

    const token = localStorage.getItem('chat_token');
    if (!token) {
      return { skipped: true, reason: 'Not authenticated' };
    }

    this.isSyncing = true;
    this._notifySyncStatus({ syncing: true });

    try {
      const pending = await getPendingOutboxMessages();
      let lastSync = await getLastSyncTimestamp();

      // If never synced before, default to 7 days ago to fetch recent history
      if (!lastSync) {
        lastSync = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      const syncRequest = {
        pendingMessages: pending.map((item) => ({
          clientMessageId: item.clientMessageId,
          conversationId: item.conversationId,
          content: item.content,
          clientCreatedAt: item.clientCreatedAt,
        })),
        lastSyncTimestamp: lastSync,
      };

      const syncTimeStart = new Date().toISOString();
      const response = await syncApi.sync(syncRequest);

      // 1. Process server acknowledgements
      const ackMap = response.acknowledgedMessages || {};
      for (const [clientMsgId, serverId] of Object.entries(ackMap)) {
        await markMessageAcknowledged(clientMsgId, serverId);
      }

      // 2. Process new incoming messages from other participants
      const incoming = response.newIncomingMessages || [];
      for (const msg of incoming) {
        await saveIncomingMessage(msg);
      }

      // 3. Update the last sync timestamp checkpoint
      await setLastSyncTimestamp(syncTimeStart);

      const result = {
        success: true,
        acknowledgedCount: Object.keys(ackMap).length,
        newIncomingCount: incoming.length,
        duplicatesSkipped: response.duplicatesSkipped || 0,
        syncedAt: syncTimeStart,
        newIncomingMessages: incoming,
      };

      this._notifySyncStatus({ syncing: false, result });
      return result;
    } catch (err) {
      console.error('Sync failed:', err);
      const errorResult = {
        success: false,
        error: err.response?.data?.message || err.message || 'Sync failed',
      };
      this._notifySyncStatus({ syncing: false, error: errorResult.error });
      return errorResult;
    } finally {
      this.isSyncing = false;
    }
  }

  onSyncStatusChange(callback) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  _notifySyncStatus(data) {
    this.syncListeners.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error('Error in sync status listener', e);
      }
    });
  }
}

export const syncService = new SyncService();
