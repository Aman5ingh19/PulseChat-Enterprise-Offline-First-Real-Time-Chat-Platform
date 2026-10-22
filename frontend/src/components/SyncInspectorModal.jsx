import React, { useState, useEffect } from 'react';
import { db, getPendingOutboxMessages, getLastSyncTimestamp } from '../db/indexedDb';
import { useChat } from '../context/ChatContext';

export default function SyncInspectorModal({ isOpen, onClose }) {
  const { triggerSync, isSyncing, isEffectivelyOnline } = useChat();
  const [activeTab, setActiveTab] = useState('outbox'); // outbox, stats, raw
  const [outboxItems, setOutboxItems] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [stats, setStats] = useState({ messages: 0, outbox: 0, conversations: 0 });

  const loadData = async () => {
    try {
      const items = await getPendingOutboxMessages();
      setOutboxItems(items);

      const ts = await getLastSyncTimestamp();
      setLastSync(ts);

      const msgCount = await db.messages.count();
      const outboxCount = await db.outbox.count();
      const convCount = await db.conversations.count();
      setStats({ messages: msgCount, outbox: outboxCount, conversations: convCount });
    } catch (e) {
      console.error('Failed to inspect IndexedDB', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      const interval = setInterval(loadData, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearOutbox = async () => {
    if (window.confirm('Are you sure you want to discard pending outbox messages?')) {
      await db.outbox.clear();
      await loadData();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>💾</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                IndexedDB & Sync Inspector
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Inspect Dexie.js offline tables, outbox queue, and synchronization state
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            ✕
          </button>
        </div>

        {/* Quick Stats bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            padding: '16px 24px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Outbox Queue</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: stats.outbox > 0 ? '#fbbf24' : '#34d399' }}>
              {stats.outbox} pending
            </div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cached Messages</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6' }}>
              {stats.messages}
            </div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last Server Sync</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af', marginTop: '4px' }}>
              {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Tabs & Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('outbox')}
              className={`btn ${activeTab === 'outbox' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              Outbox Queue ({stats.outbox})
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`btn ${activeTab === 'architecture' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              How Sync Works
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {stats.outbox > 0 && (
              <button
                onClick={handleClearOutbox}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#f87171' }}
              >
                Clear Outbox
              </button>
            )}
            <button
              onClick={async () => {
                await triggerSync();
                await loadData();
              }}
              disabled={isSyncing || !isEffectivelyOnline}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              {isSyncing ? 'Syncing...' : 'Sync Outbox Now'}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', maxHeight: '400px' }}>
          {activeTab === 'outbox' && (
            <div>
              {outboxItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                  <p style={{ fontWeight: 600 }}>Outbox is empty!</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    All local messages have been synchronized with the Spring Boot backend.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {outboxItems.map((item) => (
                    <div
                      key={item.clientMessageId}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                          PENDING SYNC • Conv #{item.conversationId}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(item.clientCreatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#f3f4f6', margin: '4px 0' }}>
                        {item.content}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          color: 'var(--text-muted)',
                          marginTop: '6px',
                        }}
                      >
                        UUID: {item.clientMessageId}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'architecture' && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              <h4 style={{ color: '#fff', marginBottom: '8px' }}>Idempotent Sync Mechanism</h4>
              <p style={{ marginBottom: '12px' }}>
                1. <strong>Local Write First:</strong> Every message generated on the client receives a UUID (<code style={{ color: '#818cf8' }}>clientMessageId</code>) and is persisted to IndexedDB before any network transmission.
              </p>
              <p style={{ marginBottom: '12px' }}>
                2. <strong>Offline Outbox:</strong> When offline, the message remains stored in the <code style={{ color: '#fbbf24' }}>outbox</code> table with status <code style={{ color: '#fbbf24' }}>PENDING</code>.
              </p>
              <p style={{ marginBottom: '12px' }}>
                3. <strong>Reconnection & Batch Sync:</strong> When connectivity is reestablished, the sync service sends a batch <code style={{ color: '#34d399' }}>POST /api/v1/sync</code> payload with pending outbox messages and the <code style={{ color: '#818cf8' }}>lastSyncTimestamp</code>.
              </p>
              <p style={{ marginBottom: '12px' }}>
                4. <strong>Deduplication at DB Layer:</strong> The MySQL database has a unique constraint on <code style={{ color: '#818cf8' }}>client_message_id</code>. If a sync request retries, duplicates are skipped safely without creating ghost messages.
              </p>
              <p>
                5. <strong>Two-Way Reconciliation:</strong> The backend persists the outbox messages, acknowledges them back with their server-assigned auto-increment IDs, and returns any missed messages from other participants.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
