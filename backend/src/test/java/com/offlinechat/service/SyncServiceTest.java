package com.offlinechat.service;

import com.offlinechat.dto.request.SyncRequest;
import com.offlinechat.dto.response.MessageResponse;
import com.offlinechat.dto.response.SyncResponse;
import com.offlinechat.dto.response.UserResponse;
import com.offlinechat.entity.Conversation;
import com.offlinechat.entity.Message;
import com.offlinechat.entity.User;
import com.offlinechat.repository.MessageRepository;
import com.offlinechat.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SyncServiceTest {

    @Mock
    private MessageService messageService;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ConversationService conversationService;

    @InjectMocks
    private SyncService syncService;

    private User currentUser;
    private User otherUser;

    @BeforeEach
    void setUp() {
        currentUser = new User("alice", "alice@example.com", "hash", "Alice", null);
        currentUser.setId(1L);

        otherUser = new User("bob", "bob@example.com", "hash", "Bob", null);
        otherUser.setId(2L);

        UserPrincipal userPrincipal = UserPrincipal.create(currentUser);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Should successfully synchronize pending outbox messages and return acknowledgements")
    void testSyncPendingMessages() {
        SyncRequest.SyncMessageItem item1 = new SyncRequest.SyncMessageItem(
                "client-uuid-1", 10L, "Queued offline message", Instant.now()
        );

        SyncRequest request = new SyncRequest();
        request.setPendingMessages(List.of(item1));
        request.setLastSyncTimestamp(Instant.now().minusSeconds(60));

        when(messageRepository.existsByClientMessageId("client-uuid-1")).thenReturn(false);

        UserResponse aliceResponse = new UserResponse(1L, "alice", "alice@example.com", "Alice", null, Instant.now());
        MessageResponse savedResponse = new MessageResponse(
                100L, "client-uuid-1", 10L, aliceResponse, "Queued offline message", "SENT", item1.getClientCreatedAt(), Instant.now()
        );

        when(messageService.saveMessage(eq(10L), any(), eq(1L))).thenReturn(savedResponse);
        when(conversationService.getMyConversations()).thenReturn(Collections.emptyList());

        SyncResponse response = syncService.sync(request);

        assertNotNull(response);
        assertEquals(1, response.getAcknowledgedMessages().size());
        assertEquals(100L, response.getAcknowledgedMessages().get("client-uuid-1"));
        assertEquals(0, response.getDuplicatesSkipped());
    }

    @Test
    @DisplayName("Should skip duplicates when message with clientMessageId already exists in database")
    void testSyncDuplicateSkipped() {
        SyncRequest.SyncMessageItem item1 = new SyncRequest.SyncMessageItem(
                "client-uuid-duplicate", 10L, "Already processed", Instant.now()
        );

        SyncRequest request = new SyncRequest();
        request.setPendingMessages(List.of(item1));
        request.setLastSyncTimestamp(Instant.now().minusSeconds(60));

        when(messageRepository.existsByClientMessageId("client-uuid-duplicate")).thenReturn(true);

        Conversation conv = new Conversation("DIRECT");
        conv.setId(10L);
        Message existingMessage = new Message("client-uuid-duplicate", conv, currentUser, "Already processed", Instant.now());
        existingMessage.setId(88L);

        when(messageRepository.findByClientMessageId("client-uuid-duplicate")).thenReturn(Optional.of(existingMessage));
        when(conversationService.getMyConversations()).thenReturn(Collections.emptyList());

        SyncResponse response = syncService.sync(request);

        assertNotNull(response);
        assertEquals(1, response.getAcknowledgedMessages().size());
        assertEquals(88L, response.getAcknowledgedMessages().get("client-uuid-duplicate"));
        assertEquals(1, response.getDuplicatesSkipped());
        // Verify saveMessage was NEVER called
        verify(messageService, never()).saveMessage(any(), any(), any());
    }
}
