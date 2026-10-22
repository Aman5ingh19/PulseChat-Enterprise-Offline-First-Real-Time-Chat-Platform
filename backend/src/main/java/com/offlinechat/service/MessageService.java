package com.offlinechat.service;

import com.offlinechat.dto.request.SendMessageRequest;
import com.offlinechat.dto.response.MessageResponse;
import com.offlinechat.dto.response.UserResponse;
import com.offlinechat.entity.*;
import com.offlinechat.exception.ResourceNotFoundException;
import com.offlinechat.repository.*;
import com.offlinechat.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final ConversationService conversationService;

    public MessageService(MessageRepository messageRepository,
                          ConversationRepository conversationRepository,
                          ConversationParticipantRepository participantRepository,
                          UserRepository userRepository,
                          ConversationService conversationService) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
        this.conversationService = conversationService;
    }

    @Transactional(readOnly = true)
    public Page<MessageResponse> getMessageHistory(Long conversationId, int page, int size) {
        UserPrincipal principal = getCurrentUser();
        conversationService.assertUserIsParticipant(conversationId, principal.getId());

        Pageable pageable = PageRequest.of(page, size);
        return messageRepository.findByConversationIdOrderByServerReceivedAtDesc(conversationId, pageable)
                .map(this::toMessageResponse);
    }

    /**
     * Idempotent message save: if a message with this clientMessageId already exists,
     * return the existing one without duplicating. This is the key to safe retry logic.
     */
    @Transactional
    public MessageResponse saveMessage(Long conversationId, SendMessageRequest request, Long senderId) {
        // Idempotency check first
        Optional<Message> existing = messageRepository.findByClientMessageId(request.getClientMessageId());
        if (existing.isPresent()) {
            return toMessageResponse(existing.get());
        }

        conversationService.assertUserIsParticipant(conversationId, senderId);

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", "id", conversationId));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", senderId));

        Message message = new Message(
                request.getClientMessageId(),
                conversation,
                sender,
                request.getContent(),
                request.getClientCreatedAt() != null ? request.getClientCreatedAt() : Instant.now()
        );
        message = messageRepository.save(message);

        // Update the conversation's preview for the sidebar
        conversation.setLastMessagePreview(truncate(request.getContent(), 100));
        conversation.setLastMessageAt(message.getServerReceivedAt());
        conversationRepository.save(conversation);

        return toMessageResponse(message);
    }

    @Transactional
    public void markConversationAsRead(Long conversationId, Long userId) {
        participantRepository.findByConversationIdAndUserId(conversationId, userId)
                .ifPresent(p -> {
                    p.setLastReadAt(Instant.now());
                    participantRepository.save(p);
                });
    }

    public MessageResponse toMessageResponse(Message message) {
        User sender = message.getSender();
        UserResponse senderResponse = new UserResponse(
                sender.getId(), sender.getUsername(), sender.getEmail(),
                sender.getDisplayName(), sender.getAvatarUrl(), sender.getCreatedAt()
        );
        return new MessageResponse(
                message.getId(),
                message.getClientMessageId(),
                message.getConversation().getId(),
                senderResponse,
                message.getContent(),
                message.getStatus().name(),
                message.getClientCreatedAt(),
                message.getServerReceivedAt()
        );
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return null;
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "...";
    }

    private UserPrincipal getCurrentUser() {
        return (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
