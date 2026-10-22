package com.offlinechat.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class SendMessageRequest {

    @NotBlank(message = "clientMessageId is required")
    @Size(max = 64, message = "clientMessageId must not exceed 64 characters")
    private String clientMessageId;

    @NotBlank(message = "Message content is required")
    @Size(max = 10000, message = "Message content is too long")
    private String content;

    @NotNull(message = "clientCreatedAt timestamp is required")
    private Instant clientCreatedAt;

    public SendMessageRequest() {
    }

    public String getClientMessageId() { return clientMessageId; }
    public void setClientMessageId(String clientMessageId) { this.clientMessageId = clientMessageId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Instant getClientCreatedAt() { return clientCreatedAt; }
    public void setClientCreatedAt(Instant clientCreatedAt) { this.clientCreatedAt = clientCreatedAt; }
}
