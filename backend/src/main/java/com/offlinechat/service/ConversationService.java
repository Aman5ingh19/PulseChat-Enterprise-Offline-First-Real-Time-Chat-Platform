package com.offlinechat.service;

import com.offlinechat.dto.response.ConversationResponse;
import com.offlinechat.dto.response.MessageResponse;
import com.offlinechat.dto.response.UserResponse;
import com.offlinechat.entity.*;
import com.offlinechat.exception.AppException;
import com.offlinechat.exception.ResourceNotFoundException;
import com.offlinechat.repository.*;
import com.offlinechat.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    public ConversationService(ConversationRepository conversationRepository,
                               ConversationParticipantRepository participantRepository,
                               UserRepository userRepository,
                               MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> getMyConversations() {
        UserPrincipal principal = getCurrentUser();
        List<Conversation> conversations = conversationRepository.findAllByUserId(principal.getId());
        return conversations.stream()
                .map(c -> toConversationResponse(c, principal.getId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public ConversationResponse getOrCreateDirectConversation(Long recipientId) {
        UserPrincipal principal = getCurrentUser();
        Long currentUserId = principal.getId();

        if (currentUserId.equals(recipientId)) {
            throw new AppException("You cannot start a conversation with yourself", HttpStatus.BAD_REQUEST);
        }

        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", recipientId));

        // Check if a DIRECT conversation already exists — reuse it
        return conversationRepository.findDirectConversation(currentUserId, recipientId)
                .map(existing -> toConversationResponse(existing, currentUserId))
                .orElseGet(() -> {
                    // Create new conversation + add both participants
                    Conversation conversation = new Conversation("DIRECT");
                    Conversation saved = conversationRepository.save(conversation);

                    User currentUser = userRepository.findById(currentUserId)
                            .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

                    participantRepository.save(new ConversationParticipant(saved, currentUser));
                    participantRepository.save(new ConversationParticipant(saved, recipient));

                    // Refresh to load participants
                    Conversation loaded = conversationRepository.findById(saved.getId()).orElseThrow();
                    return toConversationResponse(loaded, currentUserId);
                });
    }

    @Transactional(readOnly = true)
    public void assertUserIsParticipant(Long conversationId, Long userId) {
        if (!conversationRepository.isUserParticipant(conversationId, userId)) {
            throw new AppException("Access denied: You are not a participant of this conversation", HttpStatus.FORBIDDEN);
        }
    }

    private ConversationResponse toConversationResponse(Conversation conversation, Long currentUserId) {
        // Find the "other" participant (not the current user)
        UserResponse otherParticipant = conversation.getParticipants().stream()
                .filter(p -> !p.getUser().getId().equals(currentUserId))
                .findFirst()
                .map(p -> toUserResponse(p.getUser()))
                .orElse(null);

        // Calculate unread count using the participant's last_read_at
        long unreadCount = 0;
        ConversationParticipant myParticipation = conversation.getParticipants().stream()
                .filter(p -> p.getUser().getId().equals(currentUserId))
                .findFirst()
                .orElse(null);

        if (myParticipation != null) {
            Instant lastReadAt = myParticipation.getLastReadAt() != null
                    ? myParticipation.getLastReadAt()
                    : Instant.EPOCH;
            unreadCount = messageRepository.countUnreadMessages(conversation.getId(), currentUserId, lastReadAt);
        }

        return new ConversationResponse(
                conversation.getId(),
                conversation.getType(),
                otherParticipant,
                conversation.getLastMessagePreview(),
                conversation.getLastMessageAt(),
                unreadCount,
                conversation.getCreatedAt()
        );
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(), user.getUsername(), user.getEmail(),
                user.getDisplayName(), user.getAvatarUrl(), user.getCreatedAt()
        );
    }

    private UserPrincipal getCurrentUser() {
        return (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
