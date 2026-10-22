package com.offlinechat.controller;

import com.offlinechat.dto.request.SendMessageRequest;
import com.offlinechat.dto.response.MessageResponse;
import com.offlinechat.entity.Conversation;
import com.offlinechat.entity.ConversationParticipant;
import com.offlinechat.repository.ConversationRepository;
import com.offlinechat.security.UserPrincipal;
import com.offlinechat.service.MessageService;
import com.offlinechat.service.WebSocketNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

/**
 * WebSocketChatController handles real-time STOMP messages from clients.
 *
 * Key annotations:
 * - @Controller (not @RestController): STOMP methods return void and send replies
 *   via SimpMessagingTemplate, not HTTP responses.
 * - @MessageMapping("/chat.send/{conversationId}"): Handles messages sent to
 *   /app/chat.send/{conversationId} (the /app prefix is defined in WebSocketConfig).
 * - Principal: Spring injects the authenticated user automatically from the STOMP session.
 */
@Controller
public class WebSocketChatController {

    private static final Logger log = LoggerFactory.getLogger(WebSocketChatController.class);

    private final MessageService messageService;
    private final WebSocketNotificationService notificationService;
    private final ConversationRepository conversationRepository;

    public WebSocketChatController(MessageService messageService,
                                   WebSocketNotificationService notificationService,
                                   ConversationRepository conversationRepository) {
        this.messageService = messageService;
        this.notificationService = notificationService;
        this.conversationRepository = conversationRepository;
    }

    @MessageMapping("/chat.send/{conversationId}")
    public void handleChatMessage(@DestinationVariable Long conversationId,
                                  @Payload SendMessageRequest request,
                                  Principal principal) {
        if (principal == null) {
            log.warn("WebSocket message received with no authenticated principal — ignoring");
            return;
        }

        UserPrincipal userPrincipal = (UserPrincipal) ((org.springframework.security.core.Authentication) principal).getPrincipal();

        try {
            // Save message idempotently (checks clientMessageId first)
            MessageResponse saved = messageService.saveMessage(conversationId, request, userPrincipal.getId());

            // Push message to the sender (so they get the server-confirmed version with server ID)
            notificationService.notifyNewMessage(userPrincipal.getUsername(), saved);

            // Push to all OTHER participants in this conversation
            conversationRepository.findById(conversationId).ifPresent(conversation -> {
                for (ConversationParticipant participant : conversation.getParticipants()) {
                    if (!participant.getUser().getId().equals(userPrincipal.getId())) {
                        notificationService.notifyNewMessage(participant.getUser().getUsername(), saved);
                    }
                }
            });

        } catch (Exception ex) {
            log.error("Error processing WebSocket message in conversation {}: {}", conversationId, ex.getMessage());
        }
    }

    @MessageMapping("/chat.ack")
    public void handleAcknowledgement(@Payload Map<String, String> payload, Principal principal) {
        if (principal == null) return;
        // Future: handle READ receipts / delivery confirmations
        // e.g., update message status to READ and notify sender
        String clientMessageId = payload.get("clientMessageId");
        String status = payload.get("status");
        log.debug("ACK received: clientMessageId={}, status={}", clientMessageId, status);
    }
}
