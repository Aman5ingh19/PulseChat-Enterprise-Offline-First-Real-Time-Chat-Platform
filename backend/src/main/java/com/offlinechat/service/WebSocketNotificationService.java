package com.offlinechat.service;

import com.offlinechat.dto.response.MessageResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * WebSocketNotificationService pushes messages to connected clients via STOMP.
 *
 * SimpMessagingTemplate is Spring's abstraction over the STOMP message broker.
 * convertAndSendToUser() sends a message to a specific user's personal subscription:
 * - The user subscribed to "/user/queue/messages" on the client.
 * - Spring automatically routes it to "/user/{username}/queue/messages".
 */
@Service
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketNotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Push a new message to the recipient's personal STOMP queue.
     */
    public void notifyNewMessage(String recipientUsername, MessageResponse message) {
        messagingTemplate.convertAndSendToUser(
                recipientUsername,
                "/queue/messages",
                message
        );
    }

    /**
     * Push a delivery/read receipt back to the original sender.
     */
    public void notifyReceipt(String senderUsername, String clientMessageId, String newStatus) {
        messagingTemplate.convertAndSendToUser(
                senderUsername,
                "/queue/receipts",
                java.util.Map.of("clientMessageId", clientMessageId, "status", newStatus)
        );
    }
}
