package com.offlinechat.config;

import com.offlinechat.security.JwtTokenProvider;
import com.offlinechat.security.CustomUserDetailsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * WebSocketAuthInterceptor validates the JWT when a client sends a STOMP CONNECT frame.
 *
 * Why a separate interceptor for WebSocket?
 * HTTP filters (like JwtAuthenticationFilter) don't apply to WebSocket upgrade handshake.
 * STOMP provides headers in its CONNECT frame where we can send the Authorization token.
 *
 * The flow:
 * 1. Client connects: STOMP CONNECT with header Authorization: Bearer <token>
 * 2. This interceptor validates the JWT.
 * 3. Sets the Spring Security Principal on the STOMP session.
 * 4. All subsequent SEND/SUBSCRIBE frames from this session are authenticated.
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

    public WebSocketAuthInterceptor(JwtTokenProvider tokenProvider, CustomUserDetailsService userDetailsService) {
        this.tokenProvider = tokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    if (tokenProvider.validateToken(token)) {
                        Long userId = tokenProvider.getUserIdFromToken(token);
                        UserDetails userDetails = userDetailsService.loadUserById(userId);
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        accessor.setUser(auth);
                        log.debug("WebSocket CONNECT authenticated for user: {}", userDetails.getUsername());
                    } else {
                        log.warn("WebSocket CONNECT rejected: invalid JWT");
                    }
                } catch (Exception e) {
                    log.error("WebSocket auth error: {}", e.getMessage());
                }
            }
        }

        return message;
    }
}
