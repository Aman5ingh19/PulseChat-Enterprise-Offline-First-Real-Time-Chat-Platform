package com.offlinechat.dto.response;

import java.time.Instant;

public class ConversationResponse {

    private Long id;
    private String type;
    private UserResponse otherParticipant;
    private String lastMessagePreview;
    private Instant lastMessageAt;
    private long unreadCount;
    private Instant createdAt;

    public ConversationResponse() {
    }

    public ConversationResponse(Long id, String type, UserResponse otherParticipant, String lastMessagePreview,
                                Instant lastMessageAt, long unreadCount, Instant createdAt) {
        this.id = id;
        this.type = type;
        this.otherParticipant = otherParticipant;
        this.lastMessagePreview = lastMessagePreview;
        this.lastMessageAt = lastMessageAt;
        this.unreadCount = unreadCount;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public UserResponse getOtherParticipant() { return otherParticipant; }
    public void setOtherParticipant(UserResponse otherParticipant) { this.otherParticipant = otherParticipant; }
    public String getLastMessagePreview() { return lastMessagePreview; }
    public void setLastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public long getUnreadCount() { return unreadCount; }
    public void setUnreadCount(long unreadCount) { this.unreadCount = unreadCount; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
