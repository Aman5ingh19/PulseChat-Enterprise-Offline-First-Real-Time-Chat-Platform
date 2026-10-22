import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * WebSocketService manages the STOMP over SockJS connection.
 *
 * Flow:
 * 1. Client initiates connection with SockJS to '/ws'.
 * 2. In the STOMP CONNECT frame, sends { Authorization: 'Bearer <jwt>' }.
 * 3. Server's WebSocketAuthInterceptor verifies the JWT.
 * 4. Client subscribes to private user queue: '/user/queue/messages'.
 * 5. Messages sent to '/app/chat.send/{conversationId}' are received by WebSocketChatController.
 */
class WebSocketService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.messageListeners = new Set();
    this.receiptListeners = new Set();
    this.statusListeners = new Set();
    this.isManualDisconnect = false;
  }

  connect(token) {
    if (!token) {
      console.warn('Cannot connect WebSocket without a token');
      return;
    }

    if (this.client && this.client.active) {
      return;
    }

    this.isManualDisconnect = false;
    this._notifyStatus('CONNECTING');

    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {
        // Suppress verbose debug output in production
      },
      onConnect: (frame) => {
        this.isConnected = true;
        this._notifyStatus('CONNECTED');

        // Subscribe to user-specific private messages queue
        this.client.subscribe('/user/queue/messages', (message) => {
          try {
            const data = JSON.parse(message.body);
            this._notifyMessage(data);
          } catch (e) {
            console.error('Error parsing STOMP message payload', e);
          }
        });

        // Subscribe to read/delivery receipts
        this.client.subscribe('/user/queue/receipts', (message) => {
          try {
            const data = JSON.parse(message.body);
            this._notifyReceipt(data);
          } catch (e) {
            console.error('Error parsing STOMP receipt payload', e);
          }
        });
      },
      onDisconnect: () => {
        this.isConnected = false;
        this._notifyStatus('DISCONNECTED');
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        this.isConnected = false;
        this._notifyStatus('ERROR');
      },
      onWebSocketClose: () => {
        this.isConnected = false;
        if (!this.isManualDisconnect) {
          this._notifyStatus('DISCONNECTED');
        }
      },
    });

    this.client.activate();
  }

  disconnect() {
    this.isManualDisconnect = true;
    if (this.client) {
      try {
        this.client.deactivate();
      } catch (e) {
        console.warn('Error during WebSocket deactivation', e);
      }
      this.client = null;
    }
    this.isConnected = false;
    this._notifyStatus('DISCONNECTED');
  }

  /**
   * Send a message through WebSocket if connected.
   * Returns true if published, false if not connected.
   */
  sendMessage(conversationId, payload) {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      this.client.publish({
        destination: `/app/chat.send/${conversationId}`,
        body: JSON.stringify(payload),
      });
      return true;
    } catch (err) {
      console.error('Failed to publish STOMP message', err);
      return false;
    }
  }

  onMessage(callback) {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  onReceipt(callback) {
    this.receiptListeners.add(callback);
    return () => this.receiptListeners.delete(callback);
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  _notifyMessage(msg) {
    this.messageListeners.forEach((cb) => {
      try {
        cb(msg);
      } catch (e) {
        console.error('Error in message callback', e);
      }
    });
  }

  _notifyReceipt(receipt) {
    this.receiptListeners.forEach((cb) => {
      try {
        cb(receipt);
      } catch (e) {
        console.error('Error in receipt callback', e);
      }
    });
  }

  _notifyStatus(status) {
    this.statusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        console.error('Error in status callback', e);
      }
    });
  }
}

export const wsService = new WebSocketService();
