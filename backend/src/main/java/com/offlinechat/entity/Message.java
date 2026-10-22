package com.offlinechat.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Message entity — the heart of the chat application.
 *
 * Key design decision: client_message_id (UUID)
 * - Generated on the client side before sending.
 * - Stored with a UNIQUE constraint in MySQL.
 * - When a client retries sending (after offline → online), the server does an
 *   "insert if not exists" check. Duplicates are silently ignored.
 * - This is called idempotent synchronization.
 *
 * Dual timestamps:
 * - client_created_at: When the user pressed "send" (user-facing order in UI).
 * - server_received_at: When the server persisted it (canonical DB ordering).
 */
@Entity
@Table(
    name = "messages",
    indexes = {
        @Index(name = "idx_messages_conv_received", columnList = "conversation_id, server_received_at DESC"),
        @Index(name = "idx_messages_client_id", columnList = "client_message_id"),
        @Index(name = "idx_messages_sender", columnList = "sender_id")
    }
)
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_message_id", nullable = false, unique = true, length = 64)
    private String clientMessageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MessageStatus status = MessageStatus.SENT;

    @Column(name = "client_created_at", nullable = false)
    private Instant clientCreatedAt;

    @Column(name = "server_received_at", nullable = false)
    private Instant serverReceivedAt;

    @PrePersist
    protected void onPersist() {
        if (serverReceivedAt == null) {
            serverReceivedAt = Instant.now();
        }
    }

    public Message() {
    }

    public Message(String clientMessageId, Conversation conversation, User sender, String content, Instant clientCreatedAt) {
        this.clientMessageId = clientMessageId;
        this.conversation = conversation;
        this.sender = sender;
        this.content = content;
        this.clientCreatedAt = clientCreatedAt;
        this.serverReceivedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getClientMessageId() { return clientMessageId; }
    public void setClientMessageId(String clientMessageId) { this.clientMessageId = clientMessageId; }
    public Conversation getConversation() { return conversation; }
    public void setConversation(Conversation conversation) { this.conversation = conversation; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public MessageStatus getStatus() { return status; }
    public void setStatus(MessageStatus status) { this.status = status; }
    public Instant getClientCreatedAt() { return clientCreatedAt; }
    public void setClientCreatedAt(Instant clientCreatedAt) { this.clientCreatedAt = clientCreatedAt; }
    public Instant getServerReceivedAt() { return serverReceivedAt; }
    public void setServerReceivedAt(Instant serverReceivedAt) { this.serverReceivedAt = serverReceivedAt; }
}
