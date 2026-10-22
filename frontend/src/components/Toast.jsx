import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;

  const bgStyles = {
    info: 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200',
    success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
    warning: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
    error: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        color: '#f8fafc',
        fontSize: '0.875rem',
        fontWeight: 500,
        maxWidth: '420px',
        animation: 'slideDown 0.25s ease-out',
      }}
    >
      <span style={{ fontSize: '1.1rem' }}>{icons[toast.type] || '💬'}</span>
      <span style={{ flex: 1 }}>{toast.text}</span>
    </div>
  );
}
