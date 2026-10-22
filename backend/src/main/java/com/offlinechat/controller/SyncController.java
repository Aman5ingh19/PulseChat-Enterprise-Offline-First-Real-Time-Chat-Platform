package com.offlinechat.controller;

import com.offlinechat.dto.request.SyncRequest;
import com.offlinechat.dto.response.SyncResponse;
import com.offlinechat.service.SyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sync")
@Tag(name = "Synchronization", description = "Offline-to-online message synchronization")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping
    @Operation(
        summary = "Synchronize pending offline messages",
        description = "Accepts the client's pending outbox messages and lastSyncTimestamp. " +
                      "Returns acknowledgements for each message and any missed incoming messages.",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<SyncResponse> sync(@Valid @RequestBody SyncRequest request) {
        return ResponseEntity.ok(syncService.sync(request));
    }
}
