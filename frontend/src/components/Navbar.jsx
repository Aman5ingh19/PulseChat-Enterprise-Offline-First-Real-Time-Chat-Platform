import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export default function Navbar({ onOpenInspector, onOpenNewChat }) {
  const { user, logout } = useAuth();
  const {
    isBrowserOnline,
    isSimulatedOffline,
    isEffectivelyOnline,
    wsStatus,
    isSyncing,
    pendingOutboxCount,
    lastSyncTime,
    triggerSync,
    toggleSimulatedOffline,
  } = useChat();

  const getStatusBadge = () => {
    if (isSimulatedOffline) {
      return (
        <span className="badge badge-simulated" title="Simulated offline mode enabled. WebSocket severed.">
          <span className="status-dot simulated pulse" />
          Offline (Simulated)
        </span>
      );
    }
    if (!isBrowserOnline) {
      return (
        <span className="badge badge-offline" title="Browser reports no internet connectivity">
          <span className="status-dot offline pulse" />
          No Network
        </span>
      );
    }
    if (wsStatus === 'CONNECTED') {
      return (
        <span className="badge badge-online" title="Real-time WebSocket connected and active">
          <span className="status-dot online" />
          Online
        </span>
      );
    }
    if (wsStatus === 'CONNECTING') {
      return (
        <span className="badge badge-syncing">
          <span className="status-dot syncing spin" />
          Connecting...
        </span>
      );
    }
    return (
      <span className="badge badge-offline">
        <span className="status-dot offline" />
        Disconnected
      </span>
    );
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
      }}
    >
      {/* Brand logo & title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--accent-glow)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
              PulseChat
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              Offline-First
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            IndexedDB + STOMP WebSocket Sync
          </div>
        </div>
      </div>

      {/* Network status & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {getStatusBadge()}

        {/* Simulate Offline Toggle */}
        <button
          onClick={toggleSimulatedOffline}
          className="btn"
          style={{
            background: isSimulatedOffline ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-tertiary)',
            color: isSimulatedOffline ? '#d8b4fe' : 'var(--text-secondary)',
            border: isSimulatedOffline ? '1px solid #c084fc' : '1px solid var(--border-subtle)',
            padding: '6px 12px',
            fontSize: '0.8rem',
          }}
          title="Toggle simulated offline mode to test IndexedDB queuing without disabling your Wi-Fi"
        >
          <span style={{ fontSize: '1rem' }}>{isSimulatedOffline ? '🔌' : '⚡'}</span>
          <span>{isSimulatedOffline ? 'Simulating Offline' : 'Simulate Offline'}</span>
        </button>

        {/* Sync Button */}
        <button
          onClick={triggerSync}
          disabled={!isEffectivelyOnline || isSyncing}
          className="btn btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '0.8rem',
            position: 'relative',
          }}
          title={
            lastSyncTime
              ? `Last synced at ${lastSyncTime}. Click to synchronize outbox and fetch new messages.`
              : 'Click to synchronize pending messages'
          }
        >
          <svg
            className={isSyncing ? 'spin' : ''}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>

          {pendingOutboxCount > 0 && (
            <span
              style={{
                background: '#f59e0b',
                color: '#000',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
                marginLeft: '4px',
              }}
            >
              {pendingOutboxCount}
            </span>
          )}
        </button>

        {/* IndexedDB Inspector Button */}
        <button
          onClick={onOpenInspector}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          title="Inspect local Dexie IndexedDB tables and outbox contents"
        >
          <span>💾 Storage ({pendingOutboxCount} pending)</span>
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* User Profile & Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.15)',
              }}
              title={`${user.displayName} (@${user.username})`}
            >
              {(user.displayName || user.username || 'U')[0].toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
                {user.displayName || user.username}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                @{user.username}
              </span>
            </div>
            <button
              onClick={logout}
              className="btn btn-ghost btn-icon"
              title="Logout and clear local database"
              style={{ marginLeft: '6px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
