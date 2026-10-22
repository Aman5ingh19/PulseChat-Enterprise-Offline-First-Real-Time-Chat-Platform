import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export default function ChatArea({ onOpenNewChat }) {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    sendMessage,
    isEffectivelyOnline,
    isSimulatedOffline,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    sendMessage(activeConversation.id, inputText);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Render status icon for outgoing messages
  const renderStatusIcon = (msg) => {
    if (msg.status === 'PENDING') {
      return (
        <span
          title="Pending (Stored in local IndexedDB outbox — will sync when online)"
          style={{ color: '#fbbf24', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}
        >
          🕒
        </span>
      );
    }
    if (msg.status === 'SENT') {
      return (
        <span
          title="Sent to server"
          style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 'bold' }}
        >
          ✓
        </span>
      );
    }
    if (msg.status === 'DELIVERED' || msg.status === 'READ') {
      return (
        <span
          title="Delivered"
          style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 'bold' }}
        >
          ✓✓
        </span>
      );
    }
    return null;
  };

  if (!activeConversation) {
    return (
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center',
          background: 'rgba(11, 15, 25, 0.4)',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: 'var(--accent-glow)',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
          Select a conversation
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.95rem', marginBottom: '24px' }}>
          Choose a contact from the sidebar or start a new conversation to begin chatting. All messages are stored offline-first in IndexedDB.
        </p>
        <button onClick={onOpenNewChat} className="btn btn-primary" style={{ padding: '10px 20px' }}>
          Start New Conversation
        </button>
      </main>
    );
  }

  const other = activeConversation.otherParticipant;

  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'rgba(11, 15, 25, 0.4)',
      }}
    >
      {/* Active Conversation Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
        }}
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
            {(other?.displayName || other?.username || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#f3f4f6' }}>
              {other?.displayName || other?.username}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              @{other?.username || 'user'} • 1-on-1 Direct Chat
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-tertiary)',
              padding: '4px 10px',
              borderRadius: '6px',
            }}
          >
            Conversation #{activeConversation.id}
          </span>
        </div>
      </div>

      {/* Offline Warning Banner */}
      {!isEffectivelyOnline && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#fbbf24',
            fontSize: '0.85rem',
          }}
        >
          <span>⚡</span>
          <span>
            {isSimulatedOffline
              ? 'Simulated offline mode active.'
              : 'You are currently disconnected.'}{' '}
            Messages you send are saved locally to IndexedDB and will automatically synchronize when connection is restored.
          </span>
        </div>
      )}

      {/* Message Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              margin: 'auto',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
          >
            <p>No messages yet in this conversation.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Say hello! Messages work seamlessly online and offline.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id || !msg.senderId;
            const time = formatMessageTime(msg.clientCreatedAt || msg.serverReceivedAt);

            return (
              <div
                key={msg.clientMessageId || msg.id || index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '68%',
                    padding: '10px 16px',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMe ? 'var(--msg-outgoing-bg)' : 'var(--msg-incoming-bg)',
                    color: isMe ? 'var(--msg-outgoing-text)' : 'var(--msg-incoming-text)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    wordBreak: 'break-word',
                    fontSize: '0.92rem',
                    lineHeight: '1.45',
                  }}
                >
                  <div>{msg.content}</div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                      fontSize: '0.7rem',
                      opacity: 0.8,
                      marginTop: '4px',
                    }}
                  >
                    <span>{time}</span>
                    {isMe && renderStatusIcon(msg)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg-input)',
            borderRadius: '12px',
            padding: '6px 12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <input
            type="text"
            placeholder={
              isEffectivelyOnline
                ? 'Type a message... (Press Enter to send)'
                : 'Offline mode — message will be queued in IndexedDB...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
              padding: '8px 4px',
            }}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="btn btn-primary btn-icon"
            style={{ width: '38px', height: '38px', borderRadius: '10px' }}
            title="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </main>
  );
}
