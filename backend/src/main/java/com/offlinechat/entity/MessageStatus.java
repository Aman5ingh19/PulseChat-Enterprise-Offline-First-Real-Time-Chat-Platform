package com.offlinechat.entity;

/**
 * MessageStatus is a Java enum representing all valid delivery states of a message.
 *
 * Enum vs String for status:
 * Using an enum prevents typos and invalid states. JPA stores it as a VARCHAR using @Enumerated.
 */
public enum MessageStatus {
    SENT,       // Server received and persisted it
    DELIVERED,  // Recipient's client acknowledged receipt
    READ        // Recipient opened/read the message
}
