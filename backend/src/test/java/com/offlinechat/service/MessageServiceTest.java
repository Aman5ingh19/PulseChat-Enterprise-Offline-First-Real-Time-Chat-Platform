package com.offlinechat.service;

import com.offlinechat.dto.request.SendMessageRequest;
import com.offlinechat.dto.response.MessageResponse;
import com.offlinechat.entity.Conversation;
import com.offlinechat.entity.Message;
import com.offlinechat.entity.User;
import com.offlinechat.repository.ConversationParticipantRepository;
import com.offlinechat.repository.ConversationRepository;
import com.offlinechat.repository.MessageRepository;
import com.offlinechat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private ConversationParticipantRepository participantRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConversationService conversationService;

    @InjectMocks
    private MessageService messageService;

    private User sender;
    private Conversation conversation;
    private SendMessageRequest sendRequest;

    @BeforeEach
    void setUp() {
        sender = new User("alice", "alice@example.com", "$2a$10$hashedPassword", "Alice", null);
        sender.setId(1L);

        conversation = new Conversation("DIRECT");
        conversation.setId(10L);

        sendRequest = new SendMessageRequest();
        sendRequest.setClientMessageId("uuid-msg-123");
        sendRequest.setContent("Hello offline world!");
        sendRequest.setClientCreatedAt(Instant.now());
    }

    @Test
    @DisplayName("Should save a new message when clientMessageId is new")
    void testSaveNewMessage() {
        when(messageRepository.findByClientMessageId("uuid-msg-123")).thenReturn(Optional.empty());
        doNothing().when(conversationService).assertUserIsParticipant(10L, 1L);
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));

        Message savedMessage = new Message("uuid-msg-123", conversation, sender, "Hello offline world!", sendRequest.getClientCreatedAt());
        savedMessage.setId(99L);
        savedMessage.setServerReceivedAt(Instant.now());

        when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);

        MessageResponse response = messageService.saveMessage(10L, sendRequest, 1L);

        assertNotNull(response);
        assertEquals(99L, response.getId());
        assertEquals("uuid-msg-123", response.getClientMessageId());
        assertEquals("Hello offline world!", response.getContent());
        verify(messageRepository, times(1)).save(any(Message.class));
    }

    @Test
    @DisplayName("Should return existing message idempotently when clientMessageId already exists (no duplicate)")
    void testSaveMessageIdempotency() {
        Message existingMessage = new Message("uuid-msg-123", conversation, sender, "Hello offline world!", sendRequest.getClientCreatedAt());
        existingMessage.setId(50L);
        existingMessage.setServerReceivedAt(Instant.now());

        when(messageRepository.findByClientMessageId("uuid-msg-123")).thenReturn(Optional.of(existingMessage));

        MessageResponse response = messageService.saveMessage(10L, sendRequest, 1L);

        assertNotNull(response);
        assertEquals(50L, response.getId());
        assertEquals("uuid-msg-123", response.getClientMessageId());
        // Verify save was never called again!
        verify(messageRepository, never()).save(any(Message.class));
    }
}
