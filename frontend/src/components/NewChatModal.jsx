import React, { useState, useEffect } from 'react';
import { userApi } from '../services/api';
import { useChat } from '../context/ChatContext';

export default function NewChatModal({ isOpen, onClose }) {
  const { startDirectConversation } = useChat();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startingChatWith, setStartingChatWith] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const results = await userApi.search(query);
        if (active) setUsers(results);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, query]);

  if (!isOpen) return null;

  const handleSelectUser = async (user) => {
    setStartingChatWith(user.id);
    const conv = await startDirectConversation(user.id);
    setStartingChatWith(null);
    if (conv) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '80vh',
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
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Start New Conversation</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            ✕
          </button>
        </div>

        {/* Search input */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <input
            type="text"
            placeholder="Search by username or name..."
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        {/* User list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', maxHeight: '350px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              No other users found.
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {(u.displayName || u.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f3f4f6', fontSize: '0.9rem' }}>
                      {u.displayName || u.username}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      @{u.username} • {u.email}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  disabled={startingChatWith === u.id}
                >
                  {startingChatWith === u.id ? 'Opening...' : 'Chat'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
