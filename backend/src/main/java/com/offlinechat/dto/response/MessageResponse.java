package com.offlinechat.dto.response;

import java.time.Instant;

public class MessageResponse {

    private Long id;
    private String clientMessageId;
    private Long conversationId;
    private UserResponse sender;
    private String content;
    private String status;
    private Instant clientCreatedAt;
    private Instant serverReceivedAt;

    public MessageResponse() {
    }

    public MessageResponse(Long id, String clientMessageId, Long conversationId, UserResponse sender,
                           String content, String status, Instant clientCreatedAt, Instant serverReceivedAt) {
        this.id = id;
        this.clientMessageId = clientMessageId;
        this.conversationId = conversationId;
        this.sender = sender;
        this.content = content;
        this.status = status;
        this.clientCreatedAt = clientCreatedAt;
        this.serverReceivedAt = serverReceivedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getClientMessageId() { return clientMessageId; }
    public void setClientMessageId(String clientMessageId) { this.clientMessageId = clientMessageId; }
    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }
    public UserResponse getSender() { return sender; }
    public void setSender(UserResponse sender) { this.sender = sender; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getClientCreatedAt() { return clientCreatedAt; }
    public void setClientCreatedAt(Instant clientCreatedAt) { this.clientCreatedAt = clientCreatedAt; }
    public Instant getServerReceivedAt() { return serverReceivedAt; }
    public void setServerReceivedAt(Instant serverReceivedAt) { this.serverReceivedAt = serverReceivedAt; }
}
