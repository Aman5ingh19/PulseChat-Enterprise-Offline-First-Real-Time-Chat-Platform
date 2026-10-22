package com.offlinechat.dto.response;

import java.util.List;
import java.util.Map;

public class SyncResponse {

    /** Maps clientMessageId → server-assigned id for successful acknowledgements */
    private Map<String, Long> acknowledgedMessages;

    /** Incoming messages the client missed while offline */
    private List<MessageResponse> newMessages;

    /** Count of messages that were already on the server (duplicates skipped) */
    private int duplicatesSkipped;

    public SyncResponse() {
    }

    public SyncResponse(Map<String, Long> acknowledgedMessages, List<MessageResponse> newMessages, int duplicatesSkipped) {
        this.acknowledgedMessages = acknowledgedMessages;
        this.newMessages = newMessages;
        this.duplicatesSkipped = duplicatesSkipped;
    }

    public Map<String, Long> getAcknowledgedMessages() { return acknowledgedMessages; }
    public void setAcknowledgedMessages(Map<String, Long> acknowledgedMessages) { this.acknowledgedMessages = acknowledgedMessages; }
    public List<MessageResponse> getNewMessages() { return newMessages; }
    public void setNewMessages(List<MessageResponse> newMessages) { this.newMessages = newMessages; }
    public int getDuplicatesSkipped() { return duplicatesSkipped; }
    public void setDuplicatesSkipped(int duplicatesSkipped) { this.duplicatesSkipped = duplicatesSkipped; }
}
