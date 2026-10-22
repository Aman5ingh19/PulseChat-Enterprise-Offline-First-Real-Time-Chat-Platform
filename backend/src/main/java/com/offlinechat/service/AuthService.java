package com.offlinechat.service;

import com.offlinechat.dto.request.LoginRequest;
import com.offlinechat.dto.request.RegisterRequest;
import com.offlinechat.dto.response.AuthResponse;
import com.offlinechat.dto.response.UserResponse;
import com.offlinechat.entity.User;
import com.offlinechat.exception.ConflictException;
import com.offlinechat.repository.UserRepository;
import com.offlinechat.security.JwtTokenProvider;
import com.offlinechat.security.UserPrincipal;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AuthService handles business logic for user registration and login.
 *
 * Key annotations:
 * - @Service: Marks this as a Spring-managed service component in the business layer.
 * - @Transactional: Wraps methods in a database transaction. If any step fails,
 *   the entire transaction is rolled back — ensuring data consistency.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Guard: check uniqueness before creating the user
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Username '" + request.getUsername() + "' is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email '" + request.getEmail() + "' is already registered");
        }

        // Hash the password using BCrypt — NEVER store plain text passwords
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        User user = new User(
                request.getUsername(),
                request.getEmail(),
                hashedPassword,
                request.getDisplayName(),
                request.getAvatarUrl()
        );
        User savedUser = userRepository.save(user);

        // Issue a JWT immediately so the user is logged in after registration
        String token = tokenProvider.generateTokenFromUserId(savedUser.getId());
        return new AuthResponse(token, toUserResponse(savedUser));
    }

    public AuthResponse login(LoginRequest request) {
        // AuthenticationManager calls CustomUserDetailsService.loadUserByUsername() under the hood
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found after authentication"));

        return new AuthResponse(token, toUserResponse(user));
    }

    public UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getCreatedAt()
        );
    }
}
