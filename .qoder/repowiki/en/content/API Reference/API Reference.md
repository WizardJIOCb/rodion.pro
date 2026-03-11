# API Reference

<cite>
**Referenced Files in This Document**
- [start.ts](file://src/pages/api/auth/google/start.ts)
- [callback.ts](file://src/pages/api/auth/google/callback.ts)
- [me.ts](file://src/pages/api/auth/me.ts)
- [logout.ts](file://src/pages/api/auth/logout.ts)
- [index.ts](file://src/pages/api/comments/index.ts)
- [flag.ts](file://src/pages/api/comments/[id]/flag.ts)
- [hide.ts](file://src/pages/api/comments/[id]/hide.ts)
- [unhide.ts](file://src/pages/api/comments/[id]/unhide.ts)
- [index.ts](file://src/pages/api/reactions/index.ts)
- [toggle.ts](file://src/pages/api/reactions/toggle.ts)
- [github.ts](file://src/pages/api/webhooks/github.ts)
- [feed.ts](file://src/pages/api/feed.ts)
- [deploy.ts](file://src/pages/api/events/deploy.ts)
- [ingest.ts](file://src/pages/api/activity/v1/ingest.ts)
- [now.ts](file://src/pages/api/activity/v1/now.ts)
- [stats.ts](file://src/pages/api/activity/v1/stats.ts)
- [stream.ts](file://src/pages/api/activity/v1/stream.ts)
- [public.ts](file://src/pages/api/activity/v1/public.ts)
- [index.ts](file://src/pages/api/activity/v1/notes/index.ts)
- [id.ts](file://src/pages/api/activity/v1/notes/[id].ts)
- [ingest.ts](file://src/pages/api/activity/v1/notes/ingest.ts)
- [activity.ts](file://src/lib/activity.ts)
- [activity-db.ts](file://src/lib/activity-db.ts)
- [index.ts](file://src/db/schema/index.ts)
- [index.ts](file://src/db/index.ts)
- [session.ts](file://src/lib/session.ts)
- [auth.ts](file://src/lib/auth.ts)
- [cryptoNotes.ts](file://src/lib/cryptoNotes.ts)
- [noteSanitize.ts](file://src/lib/noteSanitize.ts)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive activity notes management API with three new endpoints for note retrieval, individual note access, and note submission
- Enhanced existing activity monitoring APIs with encrypted note ingestion capabilities
- Integrated secure note storage with AES-256-GCM encryption and automatic redaction
- Added administrative access control for note management operations
- Implemented preview generation and suspicious content detection for note safety
- Extended activity monitoring with encrypted quick notes alongside telemetry data

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document describes the public APIs exposed by rodion.pro. It covers authentication via Google OAuth, session management, user context retrieval, comment threads with CRUD and moderation actions, reaction toggling with emoji-based interactions, GitHub webhook processing, the event feed, and comprehensive activity monitoring with real-time streaming. For each endpoint, we specify HTTP method, URL pattern, request/response schemas, authentication requirements, and error handling. Practical examples, parameter descriptions, integration guidelines, rate limiting, security considerations, and versioning information are included.

**Updated** Enhanced with comprehensive activity monitoring endpoints including data ingestion, real-time streaming, historical statistics, privacy-safe public views, and secure activity notes management with encrypted storage and administrative controls.

## Project Structure
Public API routes are located under src/pages/api. Authentication routes are grouped under auth, comments under comments, reactions under reactions, webhooks under webhooks, activity monitoring under activity/v1, and feed and events under top-level paths. Session and user context are managed via Astro API routes and shared utilities with enhanced database connectivity validation.

```mermaid
graph TB
subgraph "Authentication"
A1["GET /api/auth/google/start"]
A2["GET /api/auth/google/callback"]
A3["GET /api/auth/me"]
A4["POST /api/auth/logout"]
end
subgraph "Comments"
C1["GET /api/comments"]
C2["POST /api/comments"]
C3["POST /api/comments/[id]/flag"]
C4["POST /api/comments/[id]/hide"]
C5["POST /api/comments/[id]/unhide"]
end
subgraph "Reactions"
R1["GET /api/reactions"]
R2["POST /api/reactions/toggle"]
end
subgraph "Events & Webhooks"
E1["GET /api/feed"]
W1["POST /api/webhooks/github"]
D1["POST /api/events/deploy"]
end
subgraph "Activity Monitoring"
ACT1["POST /api/activity/v1/ingest"]
ACT2["GET /api/activity/v1/now"]
ACT3["GET /api/activity/v1/stats"]
ACT4["GET /api/activity/v1/stream"]
ACT5["GET /api/activity/v1/public"]
end
subgraph "Activity Notes Management"
AN1["GET /api/activity/v1/notes"]
AN2["GET /api/activity/v1/notes/[id]"]
AN3["POST /api/activity/v1/notes/ingest"]
end
A1 --> A2
A2 --> A3
A3 --> A4
C1 --> C2
C2 --> C3
C2 --> C4
C2 --> C5
R1 --> R2
W1 --> E1
D1 --> E1
ACT1 --> ACT2
ACT2 --> ACT4
ACT3 --> ACT4
ACT5 --> ACT4
AN1 --> AN2
AN2 --> AN3
```

**Diagram sources**
- [start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L120)
- [me.ts](file://src/pages/api/auth/me.ts#L1-L30)
- [logout.ts](file://src/pages/api/auth/logout.ts#L1-L27)
- [index.ts](file://src/pages/api/comments/index.ts#L1-L240)
- [flag.ts](file://src/pages/api/comments/[id]/flag.ts#L1-L69)
- [hide.ts](file://src/pages/api/comments/[id]/hide.ts#L1-L50)
- [unhide.ts](file://src/pages/api/comments/[id]/unhide.ts#L1-L50)
- [index.ts](file://src/pages/api/reactions/index.ts#L1-L82)
- [toggle.ts](file://src/pages/api/reactions/toggle.ts#L1-L85)
- [github.ts](file://src/pages/api/webhooks/github.ts#L1-L142)
- [feed.ts](file://src/pages/api/feed.ts#L1-L55)
- [deploy.ts](file://src/pages/api/events/deploy.ts#L1-L61)
- [ingest.ts](file://src/pages/api/activity/v1/ingest.ts#L1-L188)
- [now.ts](file://src/pages/api/activity/v1/now.ts#L1-L106)
- [stats.ts](file://src/pages/api/activity/v1/stats.ts#L1-L273)
- [stream.ts](file://src/pages/api/activity/v1/stream.ts#L1-L129)
- [public.ts](file://src/pages/api/activity/v1/public.ts#L1-L65)
- [index.ts](file://src/pages/api/activity/v1/notes/index.ts#L1-L87)
- [id.ts](file://src/pages/api/activity/v1/notes/[id].ts#L1-L126)
- [ingest.ts](file://src/pages/api/activity/v1/notes/ingest.ts#L1-L109)

**Section sources**
- [start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L120)
- [me.ts](file://src/pages/api/auth/me.ts#L1-L30)
- [logout.ts](file://src/pages/api/auth/logout.ts#L1-L27)
- [index.ts](file://src/pages/api/comments/index.ts#L1-L240)
- [flag.ts](file://src/pages/api/comments/[id]/flag.ts#L1-L69)
- [hide.ts](file://src/pages/api/comments/[id]/hide.ts#L1-L50)
- [unhide.ts](file://src/pages/api/comments/[id]/unhide.ts#L1-L50)
- [index.ts](file://src/pages/api/reactions/index.ts#L1-L82)
- [toggle.ts](file://src/pages/api/reactions/toggle.ts#L1-L85)
- [github.ts](file://src/pages/api/webhooks/github.ts#L1-L142)
- [feed.ts](file://src/pages/api/feed.ts#L1-L55)
- [deploy.ts](file://src/pages/api/events/deploy.ts#L1-L61)
- [ingest.ts](file://src/pages/api/activity/v1/ingest.ts#L1-L188)
- [now.ts](file://src/pages/api/activity/v1/now.ts#L1-L106)
- [stats.ts](file://src/pages/api/activity/v1/stats.ts#L1-L273)
- [stream.ts](file://src/pages/api/activity/v1/stream.ts#L1-L129)
- [public.ts](file://src/pages/api/activity/v1/public.ts#L1-L65)
- [index.ts](file://src/pages/api/activity/v1/notes/index.ts#L1-L87)
- [id.ts](file://src/pages/api/activity/v1/notes/[id].ts#L1-L126)
- [ingest.ts](file://src/pages/api/activity/v1/notes/ingest.ts#L1-L109)

## Core Components
- Authentication API: Google OAuth initiation and callback, session creation, user context retrieval, logout with enhanced database connectivity checks.
- Comment API: List comments per page, create comments, flag comments, hide/unhide comments (admin) with comprehensive validation and proper HTTP status codes.
- Reaction API: Fetch reaction counts and user's reactions, toggle emoji reactions with strict emoji validation.
- Webhook API: GitHub push and release event processing with HMAC verification and enhanced error handling.
- Event Feed API: Paginated feed of events with filtering and totals using robust database connectivity validation.
- Deploy Events API: Securely accept deployment events via bearer token with comprehensive validation.
- Activity Monitoring API: Comprehensive activity tracking with device registration, data ingestion, real-time streaming, historical statistics, and privacy-safe public views.
- Activity Notes Management API: Secure encrypted note storage with administrative controls, preview generation, and suspicious content detection.

**Updated** Added comprehensive activity notes management API with encrypted storage, administrative controls, and integration with existing activity monitoring infrastructure.

**Section sources**
- [start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L120)
- [me.ts](file://src/pages/api/auth/me.ts#L1-L30)
- [logout.ts](file://src/pages/api/auth/logout.ts#L1-L27)
- [index.ts](file://src/pages/api/comments/index.ts#L1-L240)
- [flag.ts](file://src/pages/api/comments/[id]/flag.ts#L1-L69)
- [hide.ts](file://src/pages/api/comments/[id]/hide.ts#L1-L50)
- [unhide.ts](file://src/pages/api/comments/[id]/unhide.ts#L1-L50)
- [index.ts](file://src/pages/api/reactions/index.ts#L1-L82)
- [toggle.ts](file://src/pages/api/reactions/toggle.ts#L1-L85)
- [github.ts](file://src/pages/api/webhooks/github.ts#L1-L142)
- [feed.ts](file://src/pages/api/feed.ts#L1-L55)
- [deploy.ts](file://src/pages/api/events/deploy.ts#L1-L61)
- [ingest.ts](file://src/pages/api/activity/v1/ingest.ts#L1-L188)
- [now.ts](file://src/pages/api/activity/v1/now.ts#L1-L106)
- [stats.ts](file://src/pages/api/activity/v1/stats.ts#L1-L273)
- [stream.ts](file://src/pages/api/activity/v1/stream.ts#L1-L129)
- [public.ts](file://src/pages/api/activity/v1/public.ts#L1-L65)
- [index.ts](file://src/pages/api/activity/v1/notes/index.ts#L1-L87)
- [id.ts](file://src/pages/api/activity/v1/notes/[id].ts#L1-L126)
- [ingest.ts](file://src/pages/api/activity/v1/notes/ingest.ts#L1-L109)

## Architecture Overview
The API follows a straightforward request-response model with Astro API routes. Authentication relies on cookies and server-managed sessions with enhanced database connectivity validation. Data persistence uses Drizzle ORM against a relational database with comprehensive error handling. Webhooks are verified via HMAC-SHA256 and stored as normalized events with robust validation. Activity monitoring uses a separate database connection with dedicated tables for device management, minute-level aggregation, and real-time streaming via Server-Sent Events. Activity notes are stored separately with encrypted content and administrative access controls.

**Updated** Enhanced with activity notes architecture featuring encrypted storage, administrative controls, and integration with existing activity monitoring infrastructure.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Google as "Google OAuth"
participant AuthAPI as "Auth Routes"
participant DB as "Database"
Client->>AuthAPI : "GET /api/auth/google/start?returnTo=..."
AuthAPI->>Google : "Redirect to Google consent"
Google-->>AuthAPI : "Callback with code+state"
AuthAPI->>Google : "Exchange code for tokens"
AuthAPI->>DB : "Upsert user + OAuth account"
AuthAPI->>DB : "Create session"
AuthAPI-->>Client : "Set session cookie and redirect"
```

**Diagram sources**
- [start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L120)

## Detailed Component Analysis

### Authentication API

- Base Path: /api/auth
- Cookies: Session cookie is set on successful login and removed on logout with enhanced database connectivity validation.

Endpoints:
- GET /api/auth/google/start
  - Purpose: Initiate Google OAuth flow with improved error handling.
  - Query Parameters:
    - returnTo: Optional. URL to redirect back after OAuth. Defaults to "/".
  - Response: 302 redirect to Google consent URL or error query param.
  - Errors: 302 redirect with error query param if generation fails or database unavailable.
  - Security: None required; redirects to external provider.
  - **Updated** Enhanced with database connectivity check and proper error logging.

- GET /api/auth/google/callback
  - Purpose: Handle OAuth callback and finalize login with comprehensive validation.
  - Query Parameters:
    - code: Authorization code from Google.
    - state: Anti-CSRF state parameter (URL-encoded).
    - error: Error indicator from Google.
  - Behavior:
    - Exchanges code for tokens, retrieves user profile, upserts user and OAuth account, bans if flagged, creates session, sets cookie, and redirects.
  - Responses:
    - 302 redirect to returnTo or error page.
  - Errors:
    - 302 with error=oauth_denied, no_code, auth_failed, db_unavailable.
    - 302 with error=banned if user is blocked.
  - **Updated** Added database connectivity check, enhanced error handling, and comprehensive validation.

- GET /api/auth/me
  - Purpose: Retrieve current user context with database availability check.
  - Response:
    - 200 OK with user object or null if DB not configured.
  - Errors: Returns user=null on failure with proper error logging.
  - **Updated** Enhanced with database connectivity validation and improved error handling.

- POST /api/auth/logout
  - Purpose: Destroy current session with graceful database error handling.
  - Behavior: Deletes session record if database available and clears cookie, then redirects to referer or home.
  - Response: 302 redirect.
  - **Updated** Added database connectivity check and graceful error handling for database failures.

Security and Best Practices:
- Use HTTPS in production.
- Store session cookie with secure and same-site attributes (handled by server utilities).
- Validate state parameter and enforce CSRF protection at the application level.
- Rate limit OAuth start and callback endpoints to mitigate abuse.
- **Updated** Enhanced with comprehensive database connectivity validation and error handling.

**Section sources**
- [start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L120)
- [me.ts](file://src/pages/api/auth/me.ts#L1-L30)
- [logout.ts](file://src/pages/api/auth/logout.ts#L1-L27)
- [session.ts](file://src/lib/session.ts#L1-L58)
- [auth.ts](file://src/lib/auth.ts#L1-L101)

#### OAuth Flow Sequence
```mermaid
sequenceDiagram
participant Client as "Client"
participant AuthAPI as "Auth Routes"
participant Google as "Google OAuth"
participant DB as "Database"
Client->>AuthAPI : "GET /api/auth/google/start?returnTo=%2Fdashboard"
AuthAPI-->>Client : "302 Redirect to Google"
Google-->>AuthAPI : "GET /api/auth/google/callback?code=...&state=..."
AuthAPI->>Google : "Exchange code for tokens"
Google-->>AuthAPI : "User info"
AuthAPI->>DB : "Insert/update user"
AuthAPI->>DB : "Insert OAuth account"
AuthAPI->>DB : "Create session"
AuthAPI-->>Client : "302 Redirect to returnTo"
```

**Diagram sources**
- [start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L120)

### Comment API

Base Path: /api/comments

Endpoints:
- GET /api/comments
  - Purpose: List comments for a given page with nested replies and reaction counts.
  - Query Parameters:
    - type: Required. Page type identifier.
    - key: Required. Page key.
    - lang: Optional. Language code. Defaults to "ru".
  - Response Schema (JSON):
    - comments: Array of root comment nodes. Each node includes:
      - id, body, createdAt, updatedAt, isHidden, isDeleted, user (nullable), reactions (emoji counts), userReactions (emojis), replies (array).
  - Pagination: Not supported; returns all matching comments ordered by creation time.
  - Validation: Returns 400 if type or key missing, 503 if DB not configured.
  - Errors: 503 if DB not configured; 500 on internal errors.
  - **Updated** Enhanced with comprehensive database connectivity validation and improved error handling.

- POST /api/comments
  - Purpose: Create a new comment or reply with strict validation.
  - Request Body (JSON):
    - pageType, pageKey, lang, body: Required.
    - parentId: Optional. Creates a reply when present.
  - Validation:
    - Returns 400 if required fields missing or body exceeds length limit.
    - Requires authenticated user.
    - **Updated** Enhanced with stricter validation and comprehensive error responses.
  - Response Schema (JSON):
    - comment: New comment object with user context, empty reactions, and empty replies.
  - Errors: 401 if unauthorized; 500 on internal errors.
  - **Updated** Added database connectivity check and improved validation logic.

- POST /api/comments/[id]/flag
  - Purpose: Flag a comment for review with comprehensive validation.
  - Path Parameters:
    - id: Required. Numeric comment identifier.
  - Request Body (JSON):
    - reason: Optional. Reason for flag.
  - Validation:
    - Requires authenticated user.
    - Returns 400 if id invalid, 404 if comment not found.
    - **Updated** Enhanced with strict ID validation and proper HTTP status codes.
  - Response: 200 with success indicator.
  - Errors: 401 Unauthorized; 404 Not Found; 500 on internal errors.

- POST /api/comments/[id]/hide
  - Purpose: Hide a comment (admin-only) with enhanced validation.
  - Path Parameters:
    - id: Required. Numeric comment identifier.
  - Validation:
    - Requires authenticated user who is admin.
    - Returns 400 if id invalid, 403 if not admin.
    - **Updated** Added comprehensive validation and proper error handling.
  - Response: 200 with success indicator.
  - Errors: 403 Forbidden if not admin; 400/500 as above.

- POST /api/comments/[id]/unhide
  - Purpose: Unhide a comment (admin-only) with enhanced validation.
  - Path Parameters:
    - id: Required. Numeric comment identifier.
  - Validation:
    - Requires authenticated user who is admin.
    - Returns 400 if id invalid, 403 if not admin.
    - **Updated** Added comprehensive validation and proper error handling.
  - Response: 200 with success indicator.
  - Errors: 403 Forbidden if not admin; 400/500 as above.

Integration Guidelines:
- Use parentId to create threaded replies.
- For nested rendering, traverse replies recursively.
- Use reactions endpoint to enrich comment display with user's and aggregate reactions.
- **Updated** Enhanced with comprehensive validation and error handling across all endpoints.

**Section sources**
- [index.ts](file://src/pages/api/comments/index.ts#L1-L240)
- [flag.ts](file://src/pages/api/comments/[id]/flag.ts#L1-L69)
- [hide.ts](file://src/pages/api/comments/[id]/hide.ts#L1-L50)
- [unhide.ts](file://src/pages/api/comments/[id]/unhide.ts#L1-L50)

#### Comment Retrieval Flow
```mermaid
flowchart TD
Start(["GET /api/comments"]) --> Validate["Validate query params"]
Validate --> Valid{"type,key present?"}
Valid --> |No| Err400["400 Bad Request"]
Valid --> |Yes| Load["Load comments + user joins"]
Load --> Reactions["Aggregate reaction counts"]
Reactions --> UserReacts["Fetch user's reactions"]
UserReacts --> Tree["Build nested tree"]
Tree --> Ok["200 OK with comments"]
```

**Diagram sources**
- [index.ts](file://src/pages/api/comments/index.ts#L1-L240)

### Reaction API

Base Path: /api/reactions

Endpoints:
- GET /api/reactions
  - Purpose: Retrieve reaction counts and current user's reactions for a target.
  - Query Parameters:
    - targetType: Required. E.g., "post", "comment".
    - targetKey: Required. Target identifier.
    - lang: Optional. Required when targetType="post".
  - Response Schema (JSON):
    - reactions: Object mapping emoji to count.
    - userReactions: Array of emojis the current user added.
  - Errors: 400 if required params missing; 500 on internal errors.
  - **Updated** Enhanced with database connectivity validation and improved error handling.

- POST /api/reactions/toggle
  - Purpose: Toggle a single emoji reaction for a target with strict validation.
  - Request Body (JSON):
    - targetType, targetKey, emoji: Required.
    - lang: Optional. Included when targetType="post".
  - Allowed Emojis: ["👍","🔥","🤖","💡","😂","🎯","❤️"]
  - Validation:
    - Requires authenticated user.
    - Returns 400 if missing fields, invalid emoji, or database not configured.
    - **Updated** Added strict emoji validation and comprehensive error handling.
  - Response Schema (JSON):
    - added: Boolean indicating whether reaction was added or removed.
    - emoji: The emoji toggled.
  - Errors: 401 Unauthorized; 400/500 as above.

Real-time Updates:
- The reaction API returns immediate state changes. Clients should refetch counts via GET /api/reactions after toggling to reflect global counts.
- **Updated** Enhanced with improved validation and error handling.

**Section sources**
- [index.ts](file://src/pages/api/reactions/index.ts#L1-L82)
- [toggle.ts](file://src/pages/api/reactions/toggle.ts#L1-L85)

#### Reaction Toggle Sequence
```mermaid
sequenceDiagram
participant Client as "Client"
participant ReactAPI as "Reactions Routes"
participant DB as "Database"
Client->>ReactAPI : "POST /api/reactions/toggle {targetType,targetKey,emoji}"
ReactAPI->>DB : "Find existing reaction"
alt Exists
ReactAPI->>DB : "Delete reaction"
ReactAPI-->>Client : "{added : false,emoji}"
else Not Exists
ReactAPI->>DB : "Insert reaction"
ReactAPI-->>Client : "{added : true,emoji}"
end
```

**Diagram sources**
- [toggle.ts](file://src/pages/api/reactions/toggle.ts#L1-L85)

### Webhook Processing API

Base Path: /api/webhooks

Endpoint:
- POST /api/webhooks/github
  - Purpose: Process GitHub push and release events with enhanced security.
  - Headers:
    - x-hub-signature-256: HMAC-SHA256 signature of payload.
    - x-github-event: Event type (e.g., "push", "release").
  - Request Body: Raw JSON payload from GitHub.
  - Signature Verification:
    - Uses HMAC-SHA256 with secret from GITHUB_WEBHOOK_SECRET.
    - Returns 401 if signature missing/invalid.
    - **Updated** Enhanced with improved signature verification and error handling.
  - Supported Events:
    - push: Only processes main/master branches. Filters commits by allowed prefixes and limits to a maximum number per push.
    - release: Only processes published releases.
  - Response:
    - 200 with summary for processed events.
    - 401 for invalid signature.
    - 500 if secret not configured.
    - 200 for ignored events/non-main branch.
  - Storage: Normalized events inserted into the events table with fields: source, kind, project, title, url, tags, payload.
  - **Updated** Enhanced with comprehensive validation, improved error handling, and robust signature verification.

Security Considerations:
- Keep GITHUB_WEBHOOK_SECRET secret.
- Verify signatures on all incoming requests.
- Limit event types and branch filtering to reduce noise.
- **Updated** Enhanced with improved security measures and validation.

**Section sources**
- [github.ts](file://src/pages/api/webhooks/github.ts#L1-L142)

#### GitHub Webhook Processing Flow
```mermaid
flowchart TD
Start(["POST /api/webhooks/github"]) --> Secret{"GITHUB_WEBHOOK_SECRET set?"}
Secret --> |No| Err500["500 Not Configured"]
Secret --> |Yes| Verify["Verify x-hub-signature-256"]
Verify --> Valid{"Signature valid?"}
Valid --> |No| Err401["401 Invalid Signature"]
Valid --> |Yes| Type["Read x-github-event"]
Type --> Push{"Event == push?"}
Push --> |Yes| Branch{"Branch == main/master?"}
Branch --> |No| Ok200["200 Ignored non-main"]
Branch --> |Yes| Filter["Filter commits by prefix and limit"]
Filter --> InsertPush["Insert events"]
InsertPush --> Ok200
Push --> |No| Release{"Event == release?"}
Release --> |Yes| Action{"Action == published?"}
Action --> |No| Ok200
Action --> |Yes| InsertRel["Insert release event"]
InsertRel --> Ok200
Release --> |No| Ok200
```

**Diagram sources**
- [github.ts](file://src/pages/api/webhooks/github.ts#L1-L142)

### Event Feed API

Base Path: /api/feed

Endpoint:
- GET /api/feed
  - Purpose: Paginate and filter recent events with enhanced validation.
  - Query Parameters:
    - lang: Optional. Used for filtering by language-specific events if applicable.
    - limit: Optional. Max items per page. Defaults to 20, capped at 100.
    - offset: Optional. Defaults to 0.
    - project: Optional. Filter by project.
  - Response Schema (JSON):
    - events: Array of event objects.
    - total: Total count matching filters.
    - hasMore: Boolean indicating if more records exist.
  - Errors: 500 on internal errors.
  - **Updated** Enhanced with database connectivity validation and improved error handling.

Integration Guidelines:
- Use limit and offset for client-side pagination.
- Use project filter to scope to specific repositories or domains.
- **Updated** Enhanced with comprehensive validation and error handling.

**Section sources**
- [feed.ts](file://src/pages/api/feed.ts#L1-L55)

### Administrative Endpoints

Base Path: /api/events

Endpoint:
- POST /api/events/deploy
  - Purpose: Record deployment events (e.g., CI/CD pipeline) with comprehensive validation.
  - Headers:
    - Authorization: Bearer token.
  - Request Body (JSON):
    - project: Required.
    - version: Optional.
    - environment: Optional.
    - url: Optional.
    - message: Optional. Overrides default title.
  - Validation:
    - Requires DEPLOY_TOKEN environment variable.
    - Requires Bearer token matching DEPLOY_TOKEN.
    - Returns 400 if project missing.
    - **Updated** Enhanced with strict validation and comprehensive error handling.
  - Response: 200 with success indicator.
  - Errors: 401 for missing/invalid token; 500 if token not configured; 500 on internal errors.
  - **Updated** Enhanced with improved validation and error handling.

Security Considerations:
- Store DEPLOY_TOKEN securely.
- Rotate token regularly.
- Restrict network access to this endpoint.
- **Updated** Enhanced with comprehensive validation and security measures.

**Section sources**
- [deploy.ts](file://src/pages/api/events/deploy.ts#L1-L61)

### Activity Monitoring API

Base Path: /api/activity/v1

**Overview**: Comprehensive activity monitoring system providing real-time telemetry ingestion, historical analytics, and privacy-safe public views. Features device registration, minute-level aggregation, real-time streaming via Server-Sent Events, and administrative access controls.

#### Device Registration and Authentication

Before ingesting activity data, devices must be registered and authenticated:

- Device Registration: Devices are registered in the `activity_devices` table with hashed API keys
- Authentication Methods:
  - Device Key Authentication: `x-device-key` header or `deviceKey` query parameter
  - Admin Token Authentication: `Authorization: Bearer ACTIVITY_ADMIN_TOKEN`
  - Session-based Admin: Logged-in admin user with `isAdmin` flag
  - Same-Origin Access: Dashboard pages accessing their own device data

#### Data Ingestion Endpoint

**Endpoint**: POST /api/activity/v1/ingest

Purpose: Accept activity telemetry from monitoring agents with device authentication and validation.

**Headers**:
- `x-device-id`: Required. Device identifier (alphanumeric)
- `x-device-key`: Required. Device API key for authentication

**Request Body** (JSON):
```json
{
  "sentAt": "2024-01-15T10:30:00Z",
  "intervalSec": 10,
  "now": {
    "app": "Visual Studio Code",
    "windowTitle": "document.ts - Visual Studio Code",
    "category": "development",
    "isAfk": false
  },
  "counts": {
    "keys": 5,
    "clicks": 2,
    "scroll": 1
  },
  "durations": {
    "activeSec": 10,
    "afkSec": 0
  }
}
```

**Response**: 200 OK with `{ "ok": true }`

**Authentication Requirements**: Device key authentication required

**Processing Logic**:
1. Validates device credentials using hashed API key comparison
2. Splits activity interval across minute boundaries proportionally
3. Upserts minute-level aggregated data with conflict resolution
4. Updates current device state with daily counter resets
5. Broadcasts real-time updates to connected SSE clients
6. Updates device last seen timestamp

**Error Handling**:
- 400: Missing required fields (`sentAt`, `now`)
- 401: Invalid or missing device credentials
- 503: Database not configured
- 500: Internal server error

#### Real-time State Endpoint

**Endpoint**: GET /api/activity/v1/now

Purpose: Retrieve current activity state for a specific device with flexible authentication.

**Query Parameters**:
- `deviceId`: Required. Device identifier
- `deviceKey`: Optional. Device API key (alternative to header)

**Headers**:
- `x-device-key`: Optional. Device API key for device-to-device access

**Response Schema** (JSON):
```json
{
  "deviceId": "pc-main",
  "updatedAt": "2024-01-15T10:30:00Z",
  "now": {
    "app": "Visual Studio Code",
    "windowTitle": "document.ts - Visual Studio Code",
    "category": "development",
    "isAfk": false
  },
  "countsToday": {
    "keys": 120,
    "clicks": 45,
    "scroll": 12,
    "activeSec": 3600
  }
}
```

**Authentication Methods**:
1. Device Key: Direct device-to-device access
2. Same-Origin: Dashboard pages accessing their own data
3. Admin Access: Bearer token or logged-in admin session

**Response Codes**:
- 200: Success
- 400: Missing `deviceId`
- 401: Unauthorized access
- 404: Device not found or no data
- 503: Database not configured

#### Historical Statistics Endpoint

**Endpoint**: GET /api/activity/v1/stats

Purpose: Retrieve historical activity statistics with time-series aggregation and filtering.

**Query Parameters**:
- `deviceId`: Required. Device identifier
- `from`: Required. Start timestamp (ISO 8601)
- `to`: Required. End timestamp (ISO 8601)
- `group`: Optional. Aggregation level (`hour` or `day`, default: `hour`)
- `category`: Optional. Comma-separated category filter

**Authentication**: Same flexible authentication as `/now` endpoint

**Response Schema** (JSON):
```json
{
  "from": "2024-01-15T00:00:00Z",
  "to": "2024-01-15T10:30:00Z",
  "group": "hour",
  "series": [
    {
      "t": "2024-01-15T09:00:00Z",
      "activeSec": 3600,
      "afkSec": 1800,
      "keys": 1200,
      "clicks": 450,
      "scroll": 120
    }
  ],
  "topApps": [
    {
      "app": "Visual Studio Code",
      "category": "development",
      "activeSec": 28800,
      "keys": 10000,
      "clicks": 3500,
      "scroll": 800
    }
  ],
  "topCategories": [
    {
      "category": "development",
      "activeSec": 45000
    }
  ],
  "topTitles": [
    {
      "app": "Visual Studio Code",
      "windowTitle": "document.ts - Visual Studio Code",
      "category": "development",
      "activeSec": 18000,
      "keys": 5000,
      "clicks": 1800,
      "scroll": 400
    }
  ],
  "seriesByWindow": [
    {
      "t": "2024-01-15T09:00:00Z",
      "Visual Studio Code: document.ts - Visual Studio Code": 1800,
      "Other": 1200
    }
  ],
  "windowLabels": [
    "Visual Studio Code: document.ts - Visual Studio Code",
    "Other"
  ]
}
```

**Features**:
- Time-series aggregation by hour or day
- Top applications, categories, and window titles
- Stacked area chart data for window activity
- Category filtering support
- Recharts-compatible data format

**Response Codes**:
- 200: Success
- 400: Missing parameters or invalid dates
- 401: Unauthorized access
- 503: Database not configured

#### Real-time Streaming Endpoint

**Endpoint**: GET /api/activity/v1/stream

Purpose: Establish persistent Server-Sent Events connection for real-time activity updates.

**Query Parameters**:
- `deviceId`: Required. Device identifier to subscribe to
- `deviceKey`: Optional. Device API key for authentication

**Authentication**: Same as other activity endpoints

**Response**: 200 OK with `text/event-stream` content type

**SSE Events**:
- Event type: `now`
- Data: Current activity state for the subscribed device
- Keep-alive: Ping messages every 30 seconds
- Connection: Automatic cleanup on client disconnect

**Connection Management**:
- Maintains in-memory connection registry per device
- Supports multiple concurrent connections
- Graceful cleanup on client disconnect
- Same-origin access allowed for dashboard pages

**Response Headers**:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `X-Accel-Buffering: no` (for Nginx)

**Response Codes**:
- 200: Stream established
- 400: Missing `deviceId`
- 401: Unauthorized access
- 503: Database not configured

#### Public Activity View

**Endpoint**: GET /api/activity/v1/public

Purpose: Provide privacy-safe public view of activity status without exposing sensitive information.

**Request**: No parameters required

**Response Schema** (JSON):
```json
{
  "status": "idle",
  "lastSeenAt": "2024-01-15T10:30:00Z",
  "today": {
    "categories": [
      {
        "category": "development",
        "activeSec": 45000
      },
      {
        "category": "communication",
        "activeSec": 1800
      }
    ]
  }
}
```

**Privacy Controls**:
- No device identifiers or application names
- No window titles or specific application details
- Only category-level aggregation with active seconds
- Status derived from AFK state or category classification

**Response Codes**:
- 200: Success
- 503: Database not configured

**Usage Scenarios**:
- Public status displays on websites
- Embeddable widgets showing general activity trends
- Privacy-focused dashboards without sensitive data exposure

### Activity Notes Management API

Base Path: /api/activity/v1/notes

**Overview**: Secure encrypted note storage system integrated with activity monitoring. Provides administrative access to encrypted notes, individual note retrieval with decryption, and note submission with automatic redaction and preview generation.

#### Note Submission Endpoint

**Endpoint**: POST /api/activity/v1/notes/ingest

Purpose: Submit encrypted quick notes from monitoring agents with device authentication and content validation.

**Headers**:
- `x-device-id`: Required. Device identifier (alphanumeric)
- `x-device-key`: Required. Device API key for authentication

**Request Body** (JSON):
```json
{
  "sentAt": "2024-01-15T10:30:00Z",
  "context": {
    "app": "Visual Studio Code",
    "category": "development"
  },
  "note": {
    "text": "Working on new feature implementation",
    "title": "Feature Development",
    "tag": "work",
    "source": "hotkey",
    "redact": true
  }
}
```

**Response**: 200 OK with `{ "ok": true }`

**Authentication Requirements**: Device key authentication required

**Processing Logic**:
1. Validates device credentials using hashed API key comparison
2. Encrypts note content using AES-256-GCM with ACTIVITY_NOTES_KEY
3. Generates preview text with automatic redaction for sensitive content
4. Detects suspicious patterns (JWT tokens, API keys, secrets)
5. Stores note with metadata including source, redaction status, and suspicious flag
6. Limits maximum note length to 8192 characters

**Security Features**:
- AES-256-GCM encryption with random IV and authentication tag
- Automatic redaction of sensitive patterns (JWT tokens, API keys, long numbers)
- Suspicious content detection using regex patterns
- Preview-only access for public views

**Error Handling**:
- 400: Missing note text or invalid request format
- 401: Invalid or missing device credentials
- 413: Note too long (max 8192 characters)
- 503: Database or encryption key not configured
- 500: Internal server error

#### Paginated Note Retrieval

**Endpoint**: GET /api/activity/v1/notes

Purpose: Retrieve paginated list of notes with filtering capabilities for administrative access.

**Query Parameters**:
- `deviceId`: Required. Device identifier
- `from`: Optional. Start timestamp for filtering
- `to`: Optional. End timestamp for filtering
- `app`: Optional. Application filter
- `tag`: Optional. Tag filter
- `limit`: Optional. Maximum items per page (1-500, default: 200)

**Authentication**: Admin token required (ACTIVITY_ADMIN_TOKEN)

**Response Schema** (JSON):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-15T10:30:00Z",
    "app": "Visual Studio Code",
    "category": "development",
    "tag": "work",
    "title": "Feature Development",
    "preview": "Working on new feature implementation...",
    "len": 35,
    "meta": {
      "source": "hotkey",
      "redacted": true,
      "suspicious": false
    }
  }
]
```

**Filtering Capabilities**:
- Device-based filtering (required)
- Time range filtering
- Application and tag filtering
- Configurable pagination with bounds checking

**Response Codes**:
- 200: Success
- 400: Missing deviceId parameter
- 401: Unauthorized access
- 503: Database or encryption key not configured

#### Individual Note Access

**Endpoint**: GET /api/activity/v1/notes/[id]

Purpose: Retrieve individual note with full decrypted content for administrative access.

**Path Parameters**:
- `id`: Required. Note UUID

**Authentication**: Admin token required (ACTIVITY_ADMIN_TOKEN)

**Response Schema** (JSON):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-01-15T10:30:00Z",
  "app": "Visual Studio Code",
  "category": "development",
  "tag": "work",
  "title": "Feature Development",
  "text": "Working on new feature implementation with JWT token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "len": 35,
  "meta": {
    "source": "hotkey",
    "redacted": true,
    "suspicious": true
  }
}
```

**Security Features**:
- Full decryption of note content
- Metadata includes redaction and suspicious content indicators
- Access restricted to administrative users only

**Response Codes**:
- 200: Success
- 400: Missing id parameter
- 401: Unauthorized access
- 404: Note not found
- 503: Database or encryption key not configured

#### Administrative Note Deletion

**Endpoint**: DELETE /api/activity/v1/notes/[id]

Purpose: Delete individual note for administrative access.

**Path Parameters**:
- `id`: Required. Note UUID

**Authentication**: Admin token required (ACTIVITY_ADMIN_TOKEN)

**Response**: 200 OK with `{ "ok": true }`

**Response Codes**:
- 200: Success
- 400: Missing id parameter
- 401: Unauthorized access
- 500: Internal server error

**Section sources**
- [ingest.ts](file://src/pages/api/activity/v1/ingest.ts#L1-L188)
- [now.ts](file://src/pages/api/activity/v1/now.ts#L1-L106)
- [stats.ts](file://src/pages/api/activity/v1/stats.ts#L1-L273)
- [stream.ts](file://src/pages/api/activity/v1/stream.ts#L1-L129)
- [public.ts](file://src/pages/api/activity/v1/public.ts#L1-L65)
- [index.ts](file://src/pages/api/activity/v1/notes/index.ts#L1-L87)
- [id.ts](file://src/pages/api/activity/v1/notes/[id].ts#L1-L126)
- [ingest.ts](file://src/pages/api/activity/v1/notes/ingest.ts#L1-L109)
- [activity.ts](file://src/lib/activity.ts#L1-L154)
- [activity-db.ts](file://src/lib/activity-db.ts#L1-L49)
- [index.ts](file://src/db/schema/index.ts#L152-L177)
- [cryptoNotes.ts](file://src/lib/cryptoNotes.ts#L1-L45)
- [noteSanitize.ts](file://src/lib/noteSanitize.ts#L1-L30)

#### Activity Monitoring Architecture
```mermaid
flowchart TD
Device["Monitoring Agent"] --> Ingest["POST /api/activity/v1/ingest"]
Device --> NotesIngest["POST /api/activity/v1/notes/ingest"]
Ingest --> Auth["Device Authentication"]
NotesIngest --> Auth
Auth --> DB["Activity Database"]
DB --> Agg["Minute Aggregation"]
DB --> Now["Current State"]
DB --> Notes["Encrypted Notes"]
Agg --> Stats["Historical Queries"]
Now --> Stream["SSE Broadcasting"]
Notes --> AdminAccess["Admin API Access"]
Stats --> Public["Public API"]
Stream --> Clients["Connected Clients"]
Public --> Anonymous["Anonymous Viewers"]
AdminAccess --> Decrypt["AES-256-GCM Decryption"]
```

**Diagram sources**
- [ingest.ts](file://src/pages/api/activity/v1/ingest.ts#L1-L188)
- [ingest.ts](file://src/pages/api/activity/v1/notes/ingest.ts#L1-L109)
- [now.ts](file://src/pages/api/activity/v1/now.ts#L1-L106)
- [stats.ts](file://src/pages/api/activity/v1/stats.ts#L1-L273)
- [stream.ts](file://src/pages/api/activity/v1/stream.ts#L1-L129)
- [public.ts](file://src/pages/api/activity/v1/public.ts#L1-L65)
- [index.ts](file://src/pages/api/activity/v1/notes/index.ts#L1-L87)
- [id.ts](file://src/pages/api/activity/v1/notes/[id].ts#L1-L126)
- [activity.ts](file://src/lib/activity.ts#L1-L154)
- [activity-db.ts](file://src/lib/activity-db.ts#L1-L49)
- [cryptoNotes.ts](file://src/lib/cryptoNotes.ts#L1-L45)

## Dependency Analysis
- Authentication depends on:
  - External OAuth provider (Google).
  - Database for user, OAuth account, and session persistence with enhanced connectivity validation.
  - Cookie utilities for session management.
- Comments depend on:
  - Database for comments, flags, and user joins with comprehensive validation.
  - Reaction counts aggregation and user-specific reactions.
- Reactions depend on:
  - Database for reaction records with strict validation.
  - User context to determine ownership.
- Webhooks depend on:
  - Environment secrets for signature verification.
  - Database for normalized event storage with enhanced validation.
- Feed depends on:
  - Database for event queries with filtering, pagination, and comprehensive validation.
- Deploy events depend on:
  - Environment token for authorization.
  - Database for event insertion with strict validation.
- Activity monitoring depends on:
  - Separate database connection for activity data isolation.
  - Device registration and API key management.
  - Server-Sent Events for real-time streaming.
  - Cryptographic hashing for API key security.
  - Minute-level time-series aggregation with configurable grouping.
- Activity notes management depends on:
  - AES-256-GCM encryption with ACTIVITY_NOTES_KEY environment variable.
  - Note sanitization utilities for redaction and suspicious content detection.
  - Administrative access control via ACTIVITY_ADMIN_TOKEN.
  - Database schema for encrypted note storage with preview and metadata fields.

**Updated** Added comprehensive activity notes management dependencies including encrypted storage, administrative controls, and integration with existing activity monitoring infrastructure.

```mermaid
graph LR
Auth["Auth Routes"] --> DB["Database"]
Comments["Comments Routes"] --> DB
Reactions["Reactions Routes"] --> DB
Webhooks["Webhooks Routes"] --> DB
Feed["Feed Route"] --> DB
Deploy["Deploy Route"] --> DB
Activity["Activity Routes"] --> ActivityDB["Activity Database"]
Activity --> DeviceAuth["Device Authentication"]
Activity --> SSE["Server-Sent Events"]
Activity --> Crypto["API Key Hashing"]
Notes["Notes Routes"] --> ActivityDB
Notes --> AES["AES-256-GCM Encryption"]
Notes --> Sanitize["Content Sanitization"]
Notes --> AdminAuth["Admin Token Verification"]
```

**Diagram sources**
- [start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L120)
- [index.ts](file://src/pages/api/comments/index.ts#L1-L240)
- [index.ts](file://src/pages/api/reactions/index.ts#L1-L82)
- [github.ts](file://src/pages/api/webhooks/github.ts#L1-L142)
- [feed.ts](file://src/pages/api/feed.ts#L1-L55)
- [deploy.ts](file://src/pages/api/events/deploy.ts#L1-L61)
- [ingest.ts](file://src/pages/api/activity/v1/ingest.ts#L1-L188)
- [ingest.ts](file://src/pages/api/activity/v1/notes/ingest.ts#L1-L109)
- [activity-db.ts](file://src/lib/activity-db.ts#L1-L49)
- [activity.ts](file://src/lib/activity.ts#L1-L154)
- [cryptoNotes.ts](file://src/lib/cryptoNotes.ts#L1-L45)
- [noteSanitize.ts](file://src/lib/noteSanitize.ts#L1-L30)

**Section sources**
- [start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L120)
- [index.ts](file://src/pages/api/comments/index.ts#L1-L240)
- [index.ts](file://src/pages/api/reactions/index.ts#L1-L82)
- [github.ts](file://src/pages/api/webhooks/github.ts#L1-L142)
- [feed.ts](file://src/pages/api/feed.ts#L1-L55)
- [deploy.ts](file://src/pages/api/events/deploy.ts#L1-L61)
- [ingest.ts](file://src/pages/api/activity/v1/ingest.ts#L1-L188)
- [now.ts](file://src/pages/api/activity/v1/now.ts#L1-L106)
- [stats.ts](file://src/pages/api/activity/v1/stats.ts#L1-L273)
- [stream.ts](file://src/pages/api/activity/v1/stream.ts#L1-L129)
- [public.ts](file://src/pages/api/activity/v1/public.ts#L1-L65)
- [index.ts](file://src/pages/api/activity/v1/notes/index.ts#L1-L87)
- [id.ts](file://src/pages/api/activity/v1/notes/[id].ts#L1-L126)
- [ingest.ts](file://src/pages/api/activity/v1/notes/ingest.ts#L1-L109)
- [activity-db.ts](file://src/lib/activity-db.ts#L1-L49)
- [activity.ts](file://src/lib/activity.ts#L1-L154)
- [cryptoNotes.ts](file://src/lib/cryptoNotes.ts#L1-L45)
- [noteSanitize.ts](file://src/lib/noteSanitize.ts#L1-L30)

## Performance Considerations
- Comments retrieval:
  - Aggregates reaction counts and user reactions in two queries; consider indexing on targetKey/targetType and emoji for scalability.
  - **Updated** Enhanced with database connectivity validation and improved error handling.
- Reactions:
  - Single-row upsert/delete per toggle; ensure emoji and user+target indices exist.
  - **Updated** Enhanced with strict validation and comprehensive error handling.
- Webhooks:
  - Limit commits per push and filter by prefixes to reduce event volume.
  - **Updated** Enhanced with improved signature verification and validation.
- Feed:
  - Apply database-side pagination and consider adding composite indexes on project/ts or tags for filtering.
  - **Updated** Enhanced with comprehensive validation and error handling.
- Activity Monitoring:
  - Minute-level aggregation reduces storage overhead while maintaining detail
  - SSE connections are maintained in memory; monitor connection counts in production
  - Device authentication uses SHA-256 hashing for secure API key storage
  - Stats endpoint uses efficient PostgreSQL aggregation with configurable grouping
  - Consider adding indexes on activityMinuteAgg(tsMinute, category) for large datasets
- Activity Notes:
  - AES-256-GCM encryption adds computational overhead; consider batching operations
  - Note sanitization runs regex patterns; optimize for common content types
  - Database queries use UUID indexing; ensure proper indexing on activityNotes table
  - Preview generation is CPU-intensive for large texts; consider caching frequently accessed previews

**Updated** Added performance considerations for activity notes management including encryption overhead, sanitization costs, and database optimization strategies.

## Troubleshooting Guide
- Authentication
  - If OAuth start fails, check provider configuration and returnTo encoding.
  - If callback fails, verify code exchange and user info retrieval steps; ensure DB is reachable.
  - If banned, user is redirected with error=banned.
  - **Updated** Enhanced with improved error logging and database connectivity validation.
- Comments
  - Missing type/key or invalid id yields 400; ensure correct parameters.
  - Unauthorized creation returns 401; confirm session cookie presence.
  - Database not configured returns 503; check DATABASE_URL environment variable.
  - **Updated** Enhanced with comprehensive validation and proper HTTP status codes.
- Reactions
  - Invalid emoji returns 400; ensure emoji is one of allowed values.
  - Unauthorized toggles return 401; confirm login.
  - Database not configured returns 503; check DATABASE_URL environment variable.
  - **Updated** Enhanced with strict validation and improved error handling.
- Webhooks
  - Missing/invalid signature returns 401; verify secret and header.
  - Secret not configured returns 500; set GITHUB_WEBHOOK_SECRET.
  - Database not configured returns 503; check DATABASE_URL environment variable.
  - **Updated** Enhanced with improved security and validation.
- Feed
  - Internal errors return 500; check DB connectivity and query conditions.
  - Database not configured returns 503; check DATABASE_URL environment variable.
  - **Updated** Enhanced with comprehensive validation and error handling.
- Deploy
  - Missing/invalid Bearer token returns 401; verify DEPLOY_TOKEN.
  - Token not configured returns 500; set DEPLOY_TOKEN.
  - Database not configured returns 503; check DATABASE_URL environment variable.
  - **Updated** Enhanced with strict validation and improved error handling.
- Activity Monitoring
  - Device authentication failures return 401; verify x-device-id and x-device-key headers.
  - Missing required fields in ingest request returns 400; ensure sentAt and now are provided.
  - Database connectivity issues return 503; check ACTIVITY_DATABASE_URL environment variable.
  - SSE connection establishment requires proper CORS headers and same-origin access.
  - Stats queries with invalid date ranges return 400; ensure ISO 8601 format timestamps.
- Activity Notes
  - Encryption key not configured returns 503; set ACTIVITY_NOTES_KEY environment variable.
  - Note submission with invalid device credentials returns 401; verify device registration.
  - Note too long returns 413; ensure text length ≤ 8192 characters.
  - Administrative access denied returns 401; verify ACTIVITY_ADMIN_TOKEN.
  - Individual note retrieval requires admin access; ensure proper authentication.
  - Database connectivity issues return 503; check ACTIVITY_DATABASE_URL environment variable.

**Updated** Added comprehensive troubleshooting guidance for activity notes management endpoints including encryption configuration, device authentication, note submission, and administrative access controls.

**Section sources**
- [start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L120)
- [index.ts](file://src/pages/api/comments/index.ts#L1-L240)
- [toggle.ts](file://src/pages/api/reactions/toggle.ts#L1-L85)
- [github.ts](file://src/pages/api/webhooks/github.ts#L1-L142)
- [feed.ts](file://src/pages/api/feed.ts#L1-L55)
- [deploy.ts](file://src/pages/api/events/deploy.ts#L1-L61)
- [ingest.ts](file://src/pages/api/activity/v1/ingest.ts#L1-L188)
- [now.ts](file://src/pages/api/activity/v1/now.ts#L1-L106)
- [stats.ts](file://src/pages/api/activity/v1/stats.ts#L1-L273)
- [stream.ts](file://src/pages/api/activity/v1/stream.ts#L1-L129)
- [public.ts](file://src/pages/api/activity/v1/public.ts#L1-L65)
- [index.ts](file://src/pages/api/activity/v1/notes/index.ts#L1-L87)
- [id.ts](file://src/pages/api/activity/v1/notes/[id].ts#L1-L126)
- [ingest.ts](file://src/pages/api/activity/v1/notes/ingest.ts#L1-L109)

## Conclusion
The rodion.pro API provides a cohesive set of endpoints for authentication, comments, reactions, event feeds, integrations, and comprehensive activity monitoring with enhanced reliability and security. Authentication leverages Google OAuth with robust session management and comprehensive database connectivity validation. Comments support threaded discussions with moderation hooks and strict validation. Reactions enable expressive interactions with emoji-based feedback and comprehensive error handling. Webhooks integrate GitHub events securely with enhanced signature verification and validation. The feed exposes normalized events for consumption with robust database connectivity checks. Deploy endpoints allow CI/CD pipelines to report deployments with strict validation. The new activity monitoring system provides real-time telemetry ingestion, historical analytics, privacy-safe public views, and real-time streaming capabilities with device-based authentication and comprehensive access controls. The newly added activity notes management system extends this capability with secure encrypted note storage, administrative controls, preview generation, and suspicious content detection. Adhering to the documented schemas, authentication requirements, comprehensive validation, and security practices ensures reliable integration with improved error handling, database connectivity validation, advanced monitoring capabilities, and secure note management.

**Updated** Enhanced with comprehensive activity monitoring API providing real-time telemetry, historical analytics, privacy controls, streaming capabilities, and secure activity notes management with encrypted storage and administrative controls.

## Appendices

### Authentication Requirements
- Sessions: Cookie-based. Use standard browser behavior to persist across requests.
- CSRF Protection: The state parameter is used during OAuth; ensure it is validated server-side.
- Rate Limiting: Apply per-endpoint limits (e.g., OAuth start/call and logout) to prevent abuse.
- Database Connectivity: All endpoints now include database availability checks with graceful fallbacks.
- Activity Monitoring: Device authentication via x-device-id and x-device-key headers; admin access via ACTIVITY_ADMIN_TOKEN or logged-in admin sessions.
- Activity Notes: Administrative access via ACTIVITY_ADMIN_TOKEN; device authentication for note submission; encryption key configuration required.

### Versioning Information
- No explicit API versioning headers or URLs are used. Treat endpoints as stable within this repository version.
- Activity monitoring endpoints use v1 versioning to indicate stability and future compatibility.
- Activity notes endpoints use v1 versioning to align with activity monitoring API versioning.

### Practical Examples

- Initiate Google OAuth:
  - GET https://yoursite.com/api/auth/google/start?returnTo=%2Fdashboard
- Complete OAuth callback:
  - GET https://yoursite.com/api/auth/google/callback?code=...&state=...
- Retrieve user context:
  - GET https://yoursite.com/api/auth/me
- Create a comment:
  - POST https://yoursite.com/api/comments
  - Body: {"pageType":"blog","pageKey":"welcome","lang":"en","body":"Great post!"}
- Toggle a reaction:
  - POST https://yoursite.com/api/reactions/toggle
  - Body: {"targetType":"post","targetKey":"welcome.en","emoji":"👍"}
- Process GitHub webhook:
  - POST https://yoursite.com/api/webhooks/github
  - Headers: x-hub-signature-256, x-github-event
  - Body: Raw JSON payload
- Fetch event feed:
  - GET https://yoursite.com/api/feed?project=rodion.pro&limit=20&offset=0
- Report deployment:
  - POST https://yoursite.com/api/events/deploy
  - Headers: Authorization: Bearer YOUR_DEPLOY_TOKEN
  - Body: {"project":"rodion.pro","version":"v1.2.3","environment":"production"}
- Activity Monitoring - Ingest Telemetry:
  - POST https://yoursite.com/api/activity/v1/ingest
  - Headers: x-device-id: pc-main, x-device-key: YOUR_DEVICE_KEY
  - Body: Activity telemetry data with sentAt timestamp and metrics
- Activity Monitoring - Get Current State:
  - GET https://yoursite.com/api/activity/v1/now?deviceId=pc-main
- Activity Monitoring - Historical Statistics:
  - GET https://yoursite.com/api/activity/v1/stats?deviceId=pc-main&from=2024-01-01T00:00:00Z&to=2024-01-01T01:00:00Z&group=hour
- Activity Monitoring - Real-time Stream:
  - GET https://yoursite.com/api/activity/v1/stream?deviceId=pc-main
- Activity Monitoring - Public View:
  - GET https://yoursite.com/api/activity/v1/public
- Activity Notes - Submit Encrypted Note:
  - POST https://yoursite.com/api/activity/v1/notes/ingest
  - Headers: x-device-id: pc-main, x-device-key: YOUR_DEVICE_KEY
  - Body: {"sentAt":"2024-01-15T10:30:00Z","context":{"app":"VS Code"},"note":{"text":"Working on feature","redact":true}}
- Activity Notes - Retrieve Notes:
  - GET https://yoursite.com/api/activity/v1/notes?deviceId=pc-main&limit=50
  - Headers: Authorization: Bearer YOUR_ADMIN_TOKEN
- Activity Notes - Get Individual Note:
  - GET https://yoursite.com/api/activity/v1/notes/[note-id]
  - Headers: Authorization: Bearer YOUR_ADMIN_TOKEN
- Activity Notes - Delete Note:
  - DELETE https://yoursite.com/api/activity/v1/notes/[note-id]
  - Headers: Authorization: Bearer YOUR_ADMIN_TOKEN

### Enhanced Error Handling Examples
- Database Not Configured: Returns 503 with detailed error message
- Invalid Input: Returns 400 with specific validation error
- Unauthorized Access: Returns 401 with authentication error
- Forbidden Access: Returns 403 for insufficient permissions
- Resource Not Found: Returns 404 for missing resources
- Internal Server Error: Returns 500 with generic error message
- Activity Monitoring Specific:
  - Device Authentication Failure: 401 with invalid credentials
  - Missing Device ID: 400 with parameter validation error
  - Stream Connection Issues: 503 with database connectivity error
- Activity Notes Specific:
  - Encryption Key Not Configured: 503 with encryption error
  - Note Too Long: 413 with size limit exceeded
  - Suspicious Content Detected: 400 with content validation error
  - Administrative Access Required: 401 with permission error

**Updated** Enhanced with comprehensive error handling and proper HTTP status code responses across all API endpoints, including new activity monitoring and activity notes error scenarios.