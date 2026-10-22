import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { conversationApi } from '../services/api';
import { wsService } from '../services/websocket';
import { syncService } from '../services/syncService';
import {
  enqueueOutboxMessage,
  getPendingOutboxMessages,
  markMessageAcknowledged,
  saveIncomingMessage,
  getConversationMessages,
  cacheConversations,
  getCachedConversations,
  saveBatchMessages,
  getLastSyncTimestamp,
} from '../db/indexedDb';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);

  // Network & Sync State
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [wsStatus, setWsStatus] = useState('DISCONNECTED'); // CONNECTING, CONNECTED, DISCONNECTED
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Effective online status
  const isEffectivelyOnline = isBrowserOnline && !isSimulatedOffline;

  const showToast = useCallback((text, type = 'info') => {
    setToastMessage({ text, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  }, []);

  // Update pending outbox counter
  const refreshOutboxCount = useCallback(async () => {
    try {
      const pending = await getPendingOutboxMessages();
      setPendingOutboxCount(pending.length);
    } catch (e) {
      console.warn('Error reading outbox', e);
    }
  }, []);

  // Reload conversations from local IndexedDB first, then backend
  const refreshConversations = useCallback(async () => {
    try {
      const cached = await getCachedConversations();
      if (cached && cached.length > 0) {
        setConversations(cached);
      }

      if (isEffectivelyOnline && isAuthenticated) {
        const remote = await conversationApi.list();
        setConversations(remote);
        await cacheConversations(remote);
      }
    } catch (err) {
      console.warn('Could not refresh remote conversations, using cached', err);
    }
  }, [isEffectivelyOnline, isAuthenticated]);

  // Load messages for a conversation
  const loadMessagesForConversation = useCallback(async (convId) => {
    if (!convId) return;
    try {
      // 1. Instant local read
      const localMsgs = await getConversationMessages(convId);
      setMessages(localMsgs);

      // 2. Fetch server history if online
      if (isEffectivelyOnline && isAuthenticated) {
        const page = await conversationApi.getMessages(convId, 0, 50);
        if (page && page.content) {
          await saveBatchMessages(page.content);
          const updatedLocal = await getConversationMessages(convId);
          setMessages(updatedLocal);
        }
      }
    } catch (err) {
      console.warn('Error loading messages for conversation', convId, err);
    }
  }, [isEffectivelyOnline, isAuthenticated]);

  // Perform full synchronization
  const triggerSync = useCallback(async () => {
    if (!isEffectivelyOnline || !isAuthenticated) {
      showToast('Cannot sync while offline', 'warning');
      return;
    }

    setIsSyncing(true);
    const result = await syncService.performSync();
    setIsSyncing(false);

    if (result.success) {
      await refreshOutboxCount();
      await refreshConversations();
      if (activeConversation) {
        await loadMessagesForConversation(activeConversation.id);
      }
      setLastSyncTime(new Date().toLocaleTimeString());
      showToast(
        `Sync complete: ${result.acknowledgedCount} sent, ${result.newIncomingCount} received`,
        'success'
      );
    } else if (result.error) {
      showToast(`Sync failed: ${result.error}`, 'error');
    }
  }, [isEffectivelyOnline, isAuthenticated, activeConversation, refreshOutboxCount, refreshConversations, loadMessagesForConversation, showToast]);

  // Handle incoming STOMP message
  const handleIncomingMessage = useCallback(async (msg) => {
    await saveIncomingMessage(msg);
    await refreshConversations();
    await refreshOutboxCount();

    // If message is for currently active conversation, update active messages view
    setActiveConversation((currentActive) => {
      if (currentActive && Number(currentActive.id) === Number(msg.conversationId)) {
        getConversationMessages(msg.conversationId).then(setMessages);
      }
      return currentActive;
    });

    // If the message is from me acknowledged by server
    if (msg.clientMessageId) {
      await markMessageAcknowledged(msg.clientMessageId, msg.id, msg.serverReceivedAt);
      await refreshOutboxCount();
    }
  }, [refreshConversations, refreshOutboxCount]);

  // Listen for browser online / offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      showToast('Internet connection restored', 'success');
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
      showToast('Internet connection lost — operating offline', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Manage WebSocket connection lifecycle
  useEffect(() => {
    if (isAuthenticated && token && isEffectivelyOnline) {
      wsService.connect(token);
    } else {
      wsService.disconnect();
    }

    const unsubStatus = wsService.onStatusChange((status) => {
      setWsStatus(status);
      if (status === 'CONNECTED') {
        // Automatically sync outbox when WS connects/reconnects
        triggerSync();
      }
    });

    const unsubMsg = wsService.onMessage(handleIncomingMessage);

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [isAuthenticated, token, isEffectivelyOnline, handleIncomingMessage, triggerSync]);

  // Initial load when user changes or authenticates
  useEffect(() => {
    if (isAuthenticated) {
      refreshConversations();
      refreshOutboxCount();
      getLastSyncTimestamp().then((ts) => {
        if (ts) setLastSyncTime(new Date(ts).toLocaleTimeString());
      });
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setPendingOutboxCount(0);
    }
  }, [isAuthenticated, refreshConversations, refreshOutboxCount]);

  // When active conversation changes, load messages
  useEffect(() => {
    if (activeConversation) {
      loadMessagesForConversation(activeConversation.id);
      if (isEffectivelyOnline) {
        conversationApi.markAsRead(activeConversation.id).catch(() => {});
      }
    } else {
      setMessages([]);
    }
  }, [activeConversation, loadMessagesForConversation, isEffectivelyOnline]);

  // Send a message (Optimistic Offline-First action)
  const sendMessage = async (conversationId, text) => {
    if (!text || !text.trim() || !conversationId || !user) return;

    const clientMessageId = crypto.randomUUID();
    const content = text.trim();

    // 1. Immediately store in IndexedDB outbox & messages table
    const localRecord = await enqueueOutboxMessage({
      conversationId,
      content,
      senderId: user.id,
      senderName: user.displayName || user.username,
      clientMessageId,
    });

    // 2. Update UI state immediately (optimistic UI)
    setMessages((prev) => [...prev, localRecord]);
    await refreshOutboxCount();
    await refreshConversations();

    // 3. If online, attempt to deliver via WebSocket or REST
    if (isEffectivelyOnline) {
      const sentViaWs = wsService.sendMessage(conversationId, {
        clientMessageId,
        content,
        clientCreatedAt: localRecord.clientCreatedAt,
      });

      if (!sentViaWs) {
        // Fallback to REST API
        try {
          const serverRes = await conversationApi.sendMessage(conversationId, {
            clientMessageId,
            content,
            clientCreatedAt: localRecord.clientCreatedAt,
          });

          await markMessageAcknowledged(clientMessageId, serverRes.id, serverRes.serverReceivedAt);
          await refreshOutboxCount();
          // Refresh message list
          const updated = await getConversationMessages(conversationId);
          setMessages(updated);
        } catch (err) {
          console.warn('REST send failed, message remains queued in outbox for later sync:', err);
        }
      }
    } else {
      showToast('Saved to local outbox. Will sync when back online.', 'info');
    }
  };

  // Start or open a direct conversation with a recipient user
  const startDirectConversation = async (recipientId) => {
    try {
      if (!isEffectivelyOnline) {
        // Check if we have an existing local conversation with this participant
        const existing = conversations.find(
          (c) => c.otherParticipant && c.otherParticipant.id === recipientId
        );
        if (existing) {
          setActiveConversation(existing);
          return existing;
        }
        showToast('Cannot start new conversation with new user while offline', 'warning');
        return null;
      }

      const conv = await conversationApi.getOrCreateDirect(recipientId);
      await cacheConversations([conv]);
      await refreshConversations();
      setActiveConversation(conv);
      return conv;
    } catch (err) {
      showToast('Failed to start conversation', 'error');
      console.error(err);
      return null;
    }
  };

  // Toggle simulated offline mode
  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      if (next) {
        showToast('Simulated Offline Mode ACTIVATED. Messages will queue locally.', 'warning');
      } else {
        showToast('Simulated Offline Mode DEACTIVATED. Reconnecting and syncing...', 'success');
      }
      return next;
    });
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversation,
        messages,
        pendingOutboxCount,
        isBrowserOnline,
        isSimulatedOffline,
        isEffectivelyOnline,
        wsStatus,
        isSyncing,
        lastSyncTime,
        toastMessage,
        sendMessage,
        startDirectConversation,
        triggerSync,
        toggleSimulatedOffline,
        refreshConversations,
        loadMessagesForConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
