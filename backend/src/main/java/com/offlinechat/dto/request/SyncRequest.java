package com.offlinechat.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

/**
 * SyncRequest is the payload for POST /api/v1/sync.
 * The client sends its pending (offline-queued) messages and its last sync timestamp.
 * The server responds with acknowledgements and any missed incoming messages.
 */
public class SyncRequest {

    @Valid
    private List<SyncMessageItem> pendingMessages;

    @NotNull(message = "lastSyncTimestamp is required")
    private Instant lastSyncTimestamp;

    public SyncRequest() {
    }

    public List<SyncMessageItem> getPendingMessages() { return pendingMessages; }
    public void setPendingMessages(List<SyncMessageItem> pendingMessages) { this.pendingMessages = pendingMessages; }
    public Instant getLastSyncTimestamp() { return lastSyncTimestamp; }
    public void setLastSyncTimestamp(Instant lastSyncTimestamp) { this.lastSyncTimestamp = lastSyncTimestamp; }

    public static class SyncMessageItem {
        @NotNull
        private Long conversationId;

        @NotNull
        private String clientMessageId;

        @NotNull
        private String content;

        @NotNull
        private Instant clientCreatedAt;

        public SyncMessageItem() {
        }

        public SyncMessageItem(String clientMessageId, Long conversationId, String content, Instant clientCreatedAt) {
            this.clientMessageId = clientMessageId;
            this.conversationId = conversationId;
            this.content = content;
            this.clientCreatedAt = clientCreatedAt;
        }

        public Long getConversationId() { return conversationId; }
        public void setConversationId(Long conversationId) { this.conversationId = conversationId; }
        public String getClientMessageId() { return clientMessageId; }
        public void setClientMessageId(String clientMessageId) { this.clientMessageId = clientMessageId; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public Instant getClientCreatedAt() { return clientCreatedAt; }
        public void setClientCreatedAt(Instant clientCreatedAt) { this.clientCreatedAt = clientCreatedAt; }
    }
}
