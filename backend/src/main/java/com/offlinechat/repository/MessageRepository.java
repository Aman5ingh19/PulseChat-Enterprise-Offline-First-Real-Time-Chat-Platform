package com.offlinechat.repository;

import com.offlinechat.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    /**
     * Paginated message history for a conversation, newest first.
     * Pageable handles LIMIT and OFFSET automatically.
     */
    Page<Message> findByConversationIdOrderByServerReceivedAtDesc(Long conversationId, Pageable pageable);

    /**
     * Find by clientMessageId — used for idempotency check during sync.
     */
    Optional<Message> findByClientMessageId(String clientMessageId);

    /**
     * Check if a message with this client ID already exists (prevent duplicates).
     */
    boolean existsByClientMessageId(String clientMessageId);

    /**
     * Fetch all messages in a conversation received AFTER a given timestamp.
     * Used for catch-up sync: "give me everything I missed while offline."
     */
    @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId " +
           "AND m.serverReceivedAt > :since ORDER BY m.serverReceivedAt ASC")
    List<Message> findByConversationIdAndServerReceivedAtAfter(
            @Param("conversationId") Long conversationId,
            @Param("since") Instant since
    );

    /**
     * Count unread messages in a conversation for a user (messages after their last_read_at).
     */
    @Query("SELECT COUNT(m) FROM Message m " +
           "WHERE m.conversation.id = :conversationId " +
           "AND m.sender.id != :userId " +
           "AND m.serverReceivedAt > :lastReadAt")
    long countUnreadMessages(
            @Param("conversationId") Long conversationId,
            @Param("userId") Long userId,
            @Param("lastReadAt") Instant lastReadAt
    );
}
