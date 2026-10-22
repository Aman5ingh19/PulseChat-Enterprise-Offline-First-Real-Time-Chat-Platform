# PulseChat — Offline-First Real-Time Chat Application

PulseChat is an **offline-first, real-time messaging application** built with **Java 21, Spring Boot 3.x, MySQL, STOMP WebSockets, React (Vite), and IndexedDB (Dexie.js)**.

The project demonstrates production-grade full-stack patterns:
- **Offline Message Queuing:** Messages created without network access are persisted immediately to the browser's IndexedDB and queued in an outbox.
- **Idempotent Synchronization:** Uses client-generated UUIDs (`clientMessageId`) as unique deduplication keys so network retries and sync calls never create duplicate messages.
- **Real-Time Communication:** Bi-directional messaging via STOMP over SockJS with JWT-authenticated connection channels.
- **Educational Design:** Built with clear separation of concerns, comprehensive unit/integration test coverage, and a built-in IndexedDB storage inspector for learning.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Browser (React + Dexie.js)"]
        UI["React UI (ChatArea, Sidebar)"]
        IDB[("IndexedDB (Dexie.js)\n- messages (cache)\n- outbox (pending)\n- conversations\n- syncMeta")]
        WSClient["STOMP / SockJS Client"]
        SyncEng["Offline Sync Engine"]

        UI -->|1. Instant Write (Optimistic UI)| IDB
        UI -->|2. Send if Online| WSClient
        SyncEng -->|3. On Reconnect / Sync| IDB
    end

    subgraph Backend ["Spring Boot 3.x Backend"]
        WSEndpoint["STOMP Broker /ws\n(WebSocketAuthInterceptor)"]
        RestControllers["REST Controllers\n- AuthController\n- ConversationController\n- SyncController\n- UserController"]
        Services["Business Services\n- AuthService\n- MessageService\n- SyncService\n- WebSocketNotificationService"]
        Security["Spring Security 6 + JWT\n(Stateless Filter)"]

        WSEndpoint --> Services
        RestControllers --> Security --> Services
    end

    subgraph Database ["MySQL 8.0 Storage"]
        DB[(offline_chat_db\n- users\n- conversations\n- conversation_participants\n- messages)]
        Services --> DB
    end

    WSClient <-->|WebSocket STOMP Frames| WSEndpoint
    SyncEng <-->|POST /api/v1/sync (Batch)| RestControllers
```

---

## 2. Technology Stack

### Backend
- **Java 21**
- **Spring Boot 3.3.4** (Web, Security, Data JPA, Validation, WebSocket)
- **Spring Security 6** with stateless **JWT** (JJWT 0.12.6)
- **Spring Messaging & WebSocket** with **STOMP** and **SockJS**
- **MySQL 8.0** & **H2 In-Memory DB** (for fast testing)
- **Hibernate / JPA** for ORM with transactional boundaries
- **SpringDoc OpenAPI (Swagger UI)** for API documentation
- **JUnit 5 & Mockito** for unit and integration testing

### Frontend
- **React 19** with **Vite**
- **Dexie.js** (IndexedDB wrapper for offline storage)
- **@stomp/stompjs & sockjs-client** for real-time STOMP messaging
- **Axios** with JWT request/response interceptors
- Modern CSS design system (Dark obsidian theme, glassmorphism, glowing status badges)

---

## 3. Core Architectural Concepts Explained

### 1. Offline-First Storage vs. P2P Communication
- **What this does:** When offline, messages are saved locally in the user's browser (IndexedDB). They are stamped with a UUID (`clientMessageId`) and marked as `PENDING`.
- **What this does not do:** It does *not* magically transmit messages to other devices without an internet connection. When network connectivity is restored, the client automatically synchronizes its pending outbox with the central Spring Boot server.

### 2. Idempotency & Deduplication
- Every message created by the client receives `clientMessageId = crypto.randomUUID()`.
- The MySQL `messages` table enforces a `UNIQUE` constraint on `client_message_id`.
- If a client sends a message, loses connection before receiving an ACK, and re-sends the message during synchronization:
  - `MessageService.saveMessage()` detects the existing `clientMessageId`.
  - It safely returns the existing server record without creating a duplicate.
  - The sync response increments `duplicatesSkipped`.

### 3. JWT Authentication over WebSockets
- Standard HTTP filters (`JwtAuthenticationFilter`) run during HTTP requests, but WebSocket connections upgrade once and maintain an open TCP connection.
- `WebSocketAuthInterceptor` hooks into STOMP `CONNECT` frames:
  - Reads `Authorization: Bearer <jwt>` from STOMP native headers.
  - Validates the token and sets a `UsernamePasswordAuthenticationToken` on the STOMP session.
  - Spring injects the authenticated `Principal` into all `@MessageMapping` controller methods.

### 4. Database Schema & Relationships
- **`users`**: User credentials (BCrypt hashed), display name, and avatar.
- **`conversations`**: Chat thread header (`type="DIRECT"`), last message preview, last active timestamp.
- **`conversation_participants`**: Many-to-Many join table mapping users to conversations, tracking `last_read_at` for unread message counts.
- **`messages`**: Message history with `client_message_id`, `conversation_id`, `sender_id`, `content`, `status`, `client_created_at`, `server_received_at`.

---

## 4. API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login with username/email & password |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile |

### Conversations & Messages (`/api/v1/conversations`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/conversations` | List user's conversations with unread counts |
| `POST` | `/api/v1/conversations/direct` | Get or create a 1-to-1 conversation with user |
| `GET` | `/api/v1/conversations/{id}/messages` | Get paginated message history (`page`, `size`) |
| `POST` | `/api/v1/conversations/{id}/messages` | REST fallback to send a message |
| `POST` | `/api/v1/conversations/{id}/read` | Mark conversation as read |

### Offline Synchronization (`/api/v1/sync`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/sync` | Batch sync pending outbox messages & pull missed incoming messages |

### Users (`/api/v1/users`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/users/search?query=` | Search users by username or display name |
| `GET` | `/api/v1/users/{id}` | Get user by ID |

### WebSocket STOMP Channels
- **Connect Endpoint:** `http://localhost:8080/ws` (SockJS fallback enabled)
- **Send Destination:** `/app/chat.send/{conversationId}`
- **User Queue Subscription:** `/user/queue/messages` (Private incoming messages)
- **Receipts Subscription:** `/user/queue/receipts` (Delivery/read acknowledgements)

---

## 5. Getting Started

### Prerequisites
- **Java 21 JDK** installed
- **Node.js 18+** and **npm** installed
- **Docker** (optional, for MySQL) or a local MySQL server

### Step 1: Start MySQL Database
Using Docker Compose:
```bash
docker compose up -d
```
*Note: If running local MySQL directly without Docker, create database `offline_chat_db` and ensure user `chat_user` with password `chat_password` has permissions.*

### Step 2: Run the Spring Boot Backend
```bash
cd backend
./mvnw spring-boot:run
```
The backend starts at `http://localhost:8080`.
- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON:** `http://localhost:8080/api-docs`

### Step 3: Run the React Frontend
```bash
cd frontend
npm run dev
```
The frontend starts at `http://localhost:5173`.

---

## 6. How to Test Offline Synchronization

### Testing Real-Time Messaging (Two Users)
1. Open `http://localhost:5173` in **two separate browser windows** (or one normal and one incognito tab).
2. On Tab 1: Click the 1-click demo button **👩 Alice**.
3. On Tab 2: Click the 1-click demo button **👨 Bob**.
4. In Alice's window, click **New Chat**, select **Bob**, and send a message.
5. In Bob's window, observe the message appear instantly in real time via STOMP WebSocket!

### Testing Offline Queuing & Automatic Sync
1. In Alice's window, click the **⚡ Simulate Offline** toggle button in the top navigation bar.
   - The status badge will change to **Offline (Simulated)**.
   - The WebSocket connection is severed.
2. Type a message: `"Message written while offline!"` and press Enter.
3. Observe the message bubble:
   - Notice the amber clock icon: `🕒 Pending`.
   - The message is stored in Alice's browser IndexedDB outbox.
   - Bob does not receive the message yet.
4. Click the **💾 Storage** button in the navbar to open the **IndexedDB Inspector**:
   - See the pending message listed in the `outbox` table with its unique UUID.
5. In Alice's window, click **⚡ Simulating Offline** to turn offline mode off (or click **Sync Outbox Now**).
6. Watch the synchronization happen:
   - The message status turns to `✓ Sent` (or `✓✓ Delivered`).
   - The outbox empties.
   - Bob receives the message immediately!

---

## 7. Running Automated Tests

Run backend unit and integration tests (JUnit 5 + Mockito + Spring Boot Test with H2):
```bash
cd backend
./mvnw test
```
All 9 test cases will execute:
- `BackendApplicationTests`: Context loading and Hibernate schema validation
- `AuthServiceTest`: User registration, conflict handling, and login verification
- `MessageServiceTest`: Idempotency checks and duplicate suppression
- `SyncServiceTest`: Batch synchronization, acknowledgements, and duplicate skip logic

Run frontend production build verification:
```bash
cd frontend
npm run build
```
