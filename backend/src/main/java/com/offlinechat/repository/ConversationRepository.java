package com.offlinechat.repository;

import com.offlinechat.entity.Conversation;
import com.offlinechat.entity.ConversationParticipant;
import com.offlinechat.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /**
     * Find all conversations where the given user is a participant.
     * Ordered by last_message_at descending (most recent first).
     */
    @Query("SELECT DISTINCT c FROM Conversation c " +
           "JOIN c.participants p " +
           "WHERE p.user.id = :userId " +
           "ORDER BY c.lastMessageAt DESC NULLS LAST")
    List<Conversation> findAllByUserId(@Param("userId") Long userId);

    /**
     * Find an existing DIRECT conversation between exactly two users.
     * This prevents duplicate conversations from being created.
     */
    @Query("SELECT c FROM Conversation c " +
           "JOIN c.participants p1 ON p1.user.id = :userId1 " +
           "JOIN c.participants p2 ON p2.user.id = :userId2 " +
           "WHERE c.type = 'DIRECT' " +
           "AND (SELECT COUNT(p) FROM ConversationParticipant p WHERE p.conversation = c) = 2")
    Optional<Conversation> findDirectConversation(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    /**
     * Check if a user is an active participant of a conversation (for authorization).
     */
    @Query("SELECT COUNT(p) > 0 FROM ConversationParticipant p " +
           "WHERE p.conversation.id = :conversationId AND p.user.id = :userId")
    boolean isUserParticipant(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}
