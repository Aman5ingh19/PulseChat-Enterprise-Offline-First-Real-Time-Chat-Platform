package com.offlinechat.controller;

import com.offlinechat.dto.request.SendMessageRequest;
import com.offlinechat.dto.response.ConversationResponse;
import com.offlinechat.dto.response.MessageResponse;
import com.offlinechat.service.ConversationService;
import com.offlinechat.service.MessageService;
import com.offlinechat.service.WebSocketNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Conversations & Messages", description = "Conversation management and message history")
public class ConversationController {

    private final ConversationService conversationService;
    private final MessageService messageService;
    private final WebSocketNotificationService notificationService;

    public ConversationController(ConversationService conversationService,
                                  MessageService messageService,
                                  WebSocketNotificationService notificationService) {
        this.conversationService = conversationService;
        this.messageService = messageService;
        this.notificationService = notificationService;
    }

    @GetMapping("/conversations")
    @Operation(summary = "List all conversations for the authenticated user", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<List<ConversationResponse>> getMyConversations() {
        return ResponseEntity.ok(conversationService.getMyConversations());
    }

    @PostMapping("/conversations/direct")
    @Operation(summary = "Get or create a direct 1-to-1 conversation", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ConversationResponse> getOrCreateDirectConversation(@RequestBody Map<String, Long> body) {
        Long recipientId = body.get("recipientId");
        ConversationResponse response = conversationService.getOrCreateDirectConversation(recipientId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    @Operation(summary = "Get paginated message history for a conversation", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Page<MessageResponse>> getMessages(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(messageService.getMessageHistory(conversationId, page, size));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    @Operation(summary = "Send a message via REST (WebSocket fallback)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable Long conversationId,
            @Valid @RequestBody SendMessageRequest request,
            Authentication authentication) {
        // Get sender's user ID from the Security context
        com.offlinechat.security.UserPrincipal principal =
                (com.offlinechat.security.UserPrincipal) authentication.getPrincipal();

        MessageResponse saved = messageService.saveMessage(conversationId, request, principal.getId());

        // Also notify recipient via WebSocket if they are connected
        // (The WebSocket path handles this directly — this REST fallback is for offline sync)

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/conversations/{conversationId}/read")
    @Operation(summary = "Mark conversation messages as read", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Void> markAsRead(@PathVariable Long conversationId, Authentication authentication) {
        com.offlinechat.security.UserPrincipal principal =
                (com.offlinechat.security.UserPrincipal) authentication.getPrincipal();
        messageService.markConversationAsRead(conversationId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
