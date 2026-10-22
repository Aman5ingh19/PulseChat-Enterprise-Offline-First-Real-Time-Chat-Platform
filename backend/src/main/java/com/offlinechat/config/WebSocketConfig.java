package com.offlinechat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocketConfig sets up STOMP over WebSocket.
 *
 * STOMP (Simple Text Oriented Messaging Protocol) adds structure on top of raw WebSocket.
 * It defines "destinations" (like message topics/queues) and headers.
 *
 * Concepts:
 * - /app prefix: Messages sent by clients to this prefix go to @MessageMapping methods.
 * - /user prefix: Used for user-specific private queues.
 * - Simple broker (/queue, /topic): In-memory message broker for routing.
 *   For production, replace with a dedicated broker like RabbitMQ or ActiveMQ.
 * - SockJS: A WebSocket fallback for environments where WebSocket is blocked (e.g., some corporate proxies).
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable an in-memory broker with two destination prefixes:
        // /queue: for user-specific messages (private)
        // /topic: for broadcast messages (group chats — future use)
        config.enableSimpleBroker("/queue", "/topic");

        // Messages sent from clients to /app/... are routed to @MessageMapping methods
        config.setApplicationDestinationPrefixes("/app");

        // Prefix for user-specific destinations (private queues)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // The WebSocket connection endpoint — clients connect to: ws://localhost:8080/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Restrict to your frontend URL in production
                .withSockJS();  // SockJS fallback for older browsers / proxies
    }
}
