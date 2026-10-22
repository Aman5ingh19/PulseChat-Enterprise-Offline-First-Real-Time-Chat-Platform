import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AuthView from './components/AuthView';
import NewChatModal from './components/NewChatModal';
import SyncInspectorModal from './components/SyncInspectorModal';
import Toast from './components/Toast';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const { toastMessage } = useChat();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          gap: '16px',
        }}
      >
        <div
          className="spin"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: 'var(--accent-primary)',
          }}
        />
        <span style={{ fontSize: '0.9rem' }}>Initializing PulseChat...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="app-container">
      <Navbar
        onOpenInspector={() => setIsInspectorOpen(true)}
        onOpenNewChat={() => setIsNewChatOpen(true)}
      />

      <div className="main-content">
        <Sidebar onOpenNewChat={() => setIsNewChatOpen(true)} />
        <ChatArea onOpenNewChat={() => setIsNewChatOpen(true)} />
      </div>

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
      />

      <SyncInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />

      <Toast toast={toastMessage} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </AuthProvider>
  );
}
