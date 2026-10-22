package com.offlinechat.service;

import com.offlinechat.dto.request.SyncRequest;
import com.offlinechat.dto.request.SendMessageRequest;
import com.offlinechat.dto.response.MessageResponse;
import com.offlinechat.dto.response.SyncResponse;
import com.offlinechat.entity.Message;
import com.offlinechat.repository.MessageRepository;
import com.offlinechat.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * SyncService handles the offline-to-online synchronization workflow.
 *
 * The sync process is intentionally idempotent:
 * - A client can call /api/v1/sync multiple times without creating duplicate messages.
 * - The client_message_id (UUID) is the deduplication key enforced at the DB level.
 *
 * What happens during sync:
 * 1. Client sends its pending outbox messages.
 * 2. Server tries to save each one (skips if already exists via clientMessageId).
 * 3. Server fetches all messages since lastSyncTimestamp for all conversations the user participates in.
 * 4. Returns: {acknowledgedIds, newIncomingMessages, duplicatesSkipped}
 */
@Service
public class SyncService {

    private static final Logger log = LoggerFactory.getLogger(SyncService.class);

    private final MessageService messageService;
    private final MessageRepository messageRepository;
    private final ConversationService conversationService;

    public SyncService(MessageService messageService,
                       MessageRepository messageRepository,
                       ConversationService conversationService) {
        this.messageService = messageService;
        this.messageRepository = messageRepository;
        this.conversationService = conversationService;
    }

    @Transactional
    public SyncResponse sync(SyncRequest request) {
        UserPrincipal principal = getCurrentUser();
        Long userId = principal.getId();

        Map<String, Long> acknowledgedMessages = new LinkedHashMap<>();
        int duplicatesSkipped = 0;

        // Step 1: Process each pending outbox message
        if (request.getPendingMessages() != null) {
            for (SyncRequest.SyncMessageItem item : request.getPendingMessages()) {
                try {
                    // Check if already exists (idempotent)
                    if (messageRepository.existsByClientMessageId(item.getClientMessageId())) {
                        messageRepository.findByClientMessageId(item.getClientMessageId())
                                .ifPresent(m -> acknowledgedMessages.put(item.getClientMessageId(), m.getId()));
                        duplicatesSkipped++;
                        log.debug("Sync: Skipping duplicate message {}", item.getClientMessageId());
                        continue;
                    }

                    SendMessageRequest sendRequest = new SendMessageRequest();
                    sendRequest.setClientMessageId(item.getClientMessageId());
                    sendRequest.setContent(item.getContent());
                    sendRequest.setClientCreatedAt(item.getClientCreatedAt());

                    MessageResponse saved = messageService.saveMessage(item.getConversationId(), sendRequest, userId);
                    acknowledgedMessages.put(item.getClientMessageId(), saved.getId());

                } catch (Exception ex) {
                    log.warn("Sync: Failed to process pending message {}: {}", item.getClientMessageId(), ex.getMessage());
                }
            }
        }

        // Step 2: Fetch all NEW incoming messages since last sync, across all user's conversations
        List<MessageResponse> newMessages = new ArrayList<>();
        Instant since = request.getLastSyncTimestamp();

        conversationService.getMyConversations().forEach(conv -> {
            List<Message> missed = messageRepository.findByConversationIdAndServerReceivedAtAfter(
                    conv.getId(), since);
            missed.stream()
                    .filter(m -> !m.getSender().getId().equals(userId)) // Don't re-deliver own messages
                    .map(messageService::toMessageResponse)
                    .forEach(newMessages::add);
        });

        // Sort new messages chronologically
        newMessages.sort(Comparator.comparing(MessageResponse::getServerReceivedAt));

        log.info("Sync complete for user {}: {} acknowledged, {} duplicates skipped, {} new messages",
                userId, acknowledgedMessages.size(), duplicatesSkipped, newMessages.size());

        return new SyncResponse(acknowledgedMessages, newMessages, duplicatesSkipped);
    }

    private UserPrincipal getCurrentUser() {
        return (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
