import Dexie from 'dexie';

/**
 * OfflineChatDB handles all local offline-first persistence using Dexie (IndexedDB).
 *
 * Design principles:
 * 1. clientMessageId (UUID) is the primary key for local messages.
 * 2. When offline, messages are saved in `messages` table with status='PENDING'
 *    AND queued in the `outbox` table.
 * 3. When connectivity returns, the sync service flushes the `outbox` via POST /api/v1/sync.
 * 4. When the server acknowledges the message, we update status to 'SENT',
 *    attach the server ID, and remove it from `outbox`.
 */
class OfflineChatDB extends Dexie {
  constructor() {
    super('OfflineChatDB');

    this.version(1).stores({
      conversations: 'id, otherParticipantId, updatedAt',
      messages: 'clientMessageId, id, conversationId, [conversationId+clientCreatedAt], status, synced',
      outbox: 'clientMessageId, conversationId, createdAt',
      users: 'id, username',
      syncMeta: 'key',
    });
  }
}

export const db = new OfflineChatDB();

/**
 * Enqueue a message created locally (either while offline or waiting for WS ack).
 */
export async function enqueueOutboxMessage({ conversationId, content, senderId, senderName, clientMessageId }) {
  const uuid = clientMessageId || crypto.randomUUID();
  const now = new Date().toISOString();

  const messageRecord = {
    clientMessageId: uuid,
    id: null,
    conversationId: Number(conversationId),
    senderId,
    senderName,
    content,
    status: 'PENDING',
    clientCreatedAt: now,
    serverReceivedAt: null,
    synced: 0,
  };

  const outboxRecord = {
    clientMessageId: uuid,
    conversationId: Number(conversationId),
    content,
    clientCreatedAt: now,
    createdAt: Date.now(),
    retryCount: 0,
  };

  await db.transaction('rw', db.messages, db.outbox, db.conversations, async () => {
    await db.messages.put(messageRecord);
    await db.outbox.put(outboxRecord);

    // Update conversation preview locally
    const conv = await db.conversations.get(Number(conversationId));
    if (conv) {
      await db.conversations.update(Number(conversationId), {
        lastMessagePreview: content,
        lastMessageAt: now,
        updatedAt: now,
      });
    }
  });

  return messageRecord;
}

/**
 * Fetch all pending messages in outbox for syncing.
 */
export async function getPendingOutboxMessages() {
  return await db.outbox.orderBy('createdAt').toArray();
}

/**
 * Mark a message as acknowledged by the server.
 */
export async function markMessageAcknowledged(clientMessageId, serverId, serverReceivedAt) {
  const now = serverReceivedAt || new Date().toISOString();

  await db.transaction('rw', db.messages, db.outbox, async () => {
    const existing = await db.messages.get(clientMessageId);
    if (existing) {
      await db.messages.update(clientMessageId, {
        id: serverId,
        status: 'SENT',
        serverReceivedAt: now,
        synced: 1,
      });
    }
    // Remove from outbox
    await db.outbox.delete(clientMessageId);
  });
}

/**
 * Save incoming message from WebSocket or Sync.
 */
export async function saveIncomingMessage(msg) {
  if (!msg || !msg.conversationId) return;

  const clientMsgId = msg.clientMessageId || `srv-${msg.id}`;

  const messageRecord = {
    clientMessageId: clientMsgId,
    id: msg.id,
    conversationId: Number(msg.conversationId),
    senderId: msg.sender?.id,
    senderName: msg.sender?.displayName || msg.sender?.username,
    content: msg.content,
    status: msg.status || 'DELIVERED',
    clientCreatedAt: msg.clientCreatedAt || msg.serverReceivedAt,
    serverReceivedAt: msg.serverReceivedAt,
    synced: 1,
  };

  await db.transaction('rw', db.messages, db.conversations, async () => {
    // If we already have this by clientMessageId, update it; otherwise put
    await db.messages.put(messageRecord);

    const conv = await db.conversations.get(Number(msg.conversationId));
    if (conv) {
      await db.conversations.update(Number(msg.conversationId), {
        lastMessagePreview: msg.content,
        lastMessageAt: msg.serverReceivedAt || msg.clientCreatedAt,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  return messageRecord;
}

/**
 * Save a batch of messages fetched from server history or sync.
 */
export async function saveBatchMessages(messages) {
  if (!messages || messages.length === 0) return;

  await db.transaction('rw', db.messages, async () => {
    for (const msg of messages) {
      const clientMsgId = msg.clientMessageId || `srv-${msg.id}`;
      await db.messages.put({
        clientMessageId: clientMsgId,
        id: msg.id,
        conversationId: Number(msg.conversationId),
        senderId: msg.sender?.id,
        senderName: msg.sender?.displayName || msg.sender?.username,
        content: msg.content,
        status: msg.status || 'SENT',
        clientCreatedAt: msg.clientCreatedAt || msg.serverReceivedAt,
        serverReceivedAt: msg.serverReceivedAt,
        synced: 1,
      });
    }
  });
}

/**
 * Get messages for a given conversation sorted chronologically.
 */
export async function getConversationMessages(conversationId) {
  const numericId = Number(conversationId);
  return await db.messages
    .where('conversationId')
    .equals(numericId)
    .sortBy('clientCreatedAt');
}

/**
 * Cache list of conversations.
 */
export async function cacheConversations(conversations) {
  if (!conversations || conversations.length === 0) return;

  await db.transaction('rw', db.conversations, async () => {
    for (const c of conversations) {
      await db.conversations.put({
        id: c.id,
        type: c.type,
        otherParticipantId: c.otherParticipant?.id,
        otherParticipant: c.otherParticipant,
        lastMessagePreview: c.lastMessagePreview,
        lastMessageAt: c.lastMessageAt,
        unreadCount: c.unreadCount || 0,
        updatedAt: c.lastMessageAt || new Date().toISOString(),
      });
    }
  });
}

/**
 * Get cached conversations sorted by latest activity.
 */
export async function getCachedConversations() {
  return await db.conversations.orderBy('updatedAt').reverse().toArray();
}

/**
 * Read and update last sync timestamp.
 */
export async function getLastSyncTimestamp() {
  const record = await db.syncMeta.get('lastSyncTimestamp');
  return record ? record.value : null;
}

export async function setLastSyncTimestamp(isoTimestamp) {
  await db.syncMeta.put({ key: 'lastSyncTimestamp', value: isoTimestamp });
}

/**
 * Clear all tables (used when user logs out to avoid cross-user data leaks).
 */
export async function clearLocalDatabase() {
  await db.transaction('rw', db.conversations, db.messages, db.outbox, db.users, db.syncMeta, async () => {
    await db.conversations.clear();
    await db.messages.clear();
    await db.outbox.clear();
    await db.users.clear();
    await db.syncMeta.clear();
  });
}
