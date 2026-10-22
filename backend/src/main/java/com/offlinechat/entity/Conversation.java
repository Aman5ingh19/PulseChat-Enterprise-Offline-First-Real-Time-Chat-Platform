package com.offlinechat.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Conversation entity represents a chat thread between participants.
 *
 * JPA relationships explained:
 * - @OneToMany: One Conversation has Many ConversationParticipants.
 *   "mappedBy = conversation" points to the field in ConversationParticipant that owns the FK.
 * - CascadeType.ALL: Any save/delete on Conversation cascades to its participants automatically.
 * - fetch = LAZY: Participants are NOT loaded from DB until explicitly accessed.
 *   This is critical for performance — always prefer LAZY for collections.
 */
@Entity
@Table(name = "conversations")
public class Conversation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type", nullable = false, length = 20)
    private String type = "DIRECT";

    @Column(name = "last_message_preview", columnDefinition = "TEXT")
    private String lastMessagePreview;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ConversationParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Message> messages = new ArrayList<>();

    public Conversation() {
    }

    public Conversation(String type) {
        this.type = type;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getLastMessagePreview() { return lastMessagePreview; }
    public void setLastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public List<ConversationParticipant> getParticipants() { return participants; }
    public void setParticipants(List<ConversationParticipant> participants) { this.participants = participants; }
    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }
}
