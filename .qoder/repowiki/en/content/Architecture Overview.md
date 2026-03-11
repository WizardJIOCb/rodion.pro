# Architecture Overview

<cite>
**Referenced Files in This Document**
- [package.json](file://package.json)
- [astro.config.ts](file://astro.config.ts)
- [env.d.ts](file://src/env.d.ts)
- [drizzle.config.ts](file://drizzle.config.ts)
- [tailwind.config.ts](file://tailwind.config.ts)
- [tsconfig.json](file://tsconfig.json)
- [src/db/schema/index.ts](file://src/db/schema/index.ts)
- [src/lib/auth.ts](file://src/lib/auth.ts)
- [src/lib/session.ts](file://src/lib/session.ts)
- [src/i18n/index.ts](file://src/i18n/index.ts)
- [src/pages/api/auth/google/start.ts](file://src/pages/api/auth/google/start.ts)
- [src/pages/api/auth/google/callback.ts](file://src/pages/api/auth/google/callback.ts)
- [src/pages/api/comments/index.ts](file://src/pages/api/comments/index.ts)
- [src/pages/api/reactions/toggle.ts](file://src/pages/api/reactions/toggle.ts)
</cite>

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

## Introduction
This document describes the system architecture of rodion.pro, a hybrid static site generator (SSG) with server-side rendering (SSR) capabilities powered by Astro 5.0 with the Node adapter. The system combines:
- Static content generation via Astro’s SSG pipeline
- Dynamic SSR for interactive features (authentication, comments, reactions)
- React 19 “islands” for localized interactivity
- TypeScript for type safety
- Tailwind CSS for styling
- PostgreSQL with Drizzle ORM for data persistence
- Google OAuth 2.0 for authentication
- Internationalization with URL-prefixed locales and content organization

## Project Structure
The project follows a conventional Astro monorepo-like layout with clear separation of concerns:
- Static content and routes under src/pages and src/content
- Database schema and ORM configuration under src/db
- Authentication and session utilities under src/lib
- Internationalization utilities under src/i18n
- API endpoints under src/pages/api
- Build-time configuration under astro.config.ts, tsconfig.json, tailwind.config.ts, drizzle.config.ts

```mermaid
graph TB
subgraph "Build & Runtime"
Astro["Astro 5.0<br/>Node Adapter"]
React["React 19 Islands"]
TS["TypeScript"]
Tailwind["Tailwind CSS"]
end
subgraph "Static Layer"
Pages["Pages (.astro/.mdx)<br/>SSG"]
Content["Content (.md/.mdx)<br/>SSG"]
end
subgraph "Dynamic Layer"
API["API Routes (.ts)<br/>SSR"]
Auth["Auth Utilities"]
Session["Session Utilities"]
I18N["i18n Utilities"]
end
subgraph "Persistence"
DB["PostgreSQL"]
Drizzle["Drizzle ORM"]
end
Pages --> Astro
Content --> Astro
API --> Astro
Astro --> React
Astro --> Tailwind
Astro --> TS
API --> Auth
API --> Session
API --> I18N
API --> Drizzle
Drizzle --> DB
```

**Diagram sources**
- [astro.config.ts](file://astro.config.ts#L1-L38)
- [package.json](file://package.json#L18-L32)
- [src/db/schema/index.ts](file://src/db/schema/index.ts#L1-L104)
- [src/lib/auth.ts](file://src/lib/auth.ts#L1-L101)
- [src/lib/session.ts](file://src/lib/session.ts#L1-L58)
- [src/i18n/index.ts](file://src/i18n/index.ts#L1-L221)

**Section sources**
- [astro.config.ts](file://astro.config.ts#L1-L38)
- [package.json](file://package.json#L1-L46)
- [tsconfig.json](file://tsconfig.json#L1-L16)
- [tailwind.config.ts](file://tailwind.config.ts#L1-L35)
- [drizzle.config.ts](file://drizzle.config.ts#L1-L11)

## Core Components
- Astro 5.0 with Node adapter: Enables SSG and SSR, with a server output mode and standalone adapter for deployment flexibility.
- React 19 islands: Localized interactive components embedded within Astro templates.
- TypeScript: Strict type checking across components, API routes, and utilities.
- Tailwind CSS: Utility-first styling with theme variables and dark-mode support.
- PostgreSQL + Drizzle ORM: Typed database schema and queries.
- Google OAuth 2.0: Secure user authentication via external provider.
- Internationalization: URL-prefixed locales with content separation and translation utilities.

**Section sources**
- [astro.config.ts](file://astro.config.ts#L8-L38)
- [package.json](file://package.json#L18-L32)
- [tsconfig.json](file://tsconfig.json#L3-L12)
- [tailwind.config.ts](file://tailwind.config.ts#L1-L35)
- [drizzle.config.ts](file://drizzle.config.ts#L1-L11)
- [src/i18n/index.ts](file://src/i18n/index.ts#L1-L221)

## Architecture Overview
The system employs a hybrid SSR/SSG model:
- Static pages (e.g., marketing pages, blog listings, MDX content) are generated at build time and served as static HTML/CSS/JS.
- Dynamic pages and endpoints (e.g., authentication, comments, reactions) are rendered on-demand by the server.
- React islands encapsulate interactive UI regions (e.g., command palette, comments UI) that hydrate on the client.

```mermaid
graph TB
Client["Browser"]
AstroSSG["Astro SSR/SSG"]
NodeAdapter["Node Adapter"]
APIAuth["/api/auth/*"]
APICmts["/api/comments/*"]
APIReact["/api/reactions/*"]
DB["PostgreSQL"]
Drizzle["Drizzle ORM"]
ReactIslands["React 19 Islands"]
Client --> AstroSSG
AstroSSG --> NodeAdapter
AstroSSG --> ReactIslands
AstroSSG --> APIAuth
AstroSSG --> APICmts
AstroSSG --> APIReact
APIAuth --> Drizzle --> DB
APICmts --> Drizzle --> DB
APIReact --> Drizzle --> DB
```

**Diagram sources**
- [astro.config.ts](file://astro.config.ts#L10-L13)
- [src/pages/api/auth/google/start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [src/pages/api/auth/google/callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L114)
- [src/pages/api/comments/index.ts](file://src/pages/api/comments/index.ts#L1-L240)
- [src/pages/api/reactions/toggle.ts](file://src/pages/api/reactions/toggle.ts#L1-L85)
- [src/db/schema/index.ts](file://src/db/schema/index.ts#L1-L104)

## Detailed Component Analysis

### Static Site Generation (SSG) and Routing
- Pages and content are organized by locale under src/pages/{en|ru} and src/content/blog-{en|ru}. Astro’s file-based routing maps URLs to components and MDX files.
- The i18n configuration prefixes default and alternate locales in URLs and generates sitemaps per locale.
- Build output targets the server adapter, enabling both static generation and SSR on demand.

```mermaid
flowchart TD
Start(["Build"]) --> Collect["Collect .astro and .mdx files"]
Collect --> Routes["Resolve file-based routes"]
Routes --> SSG["Generate static HTML/CSS/JS"]
SSG --> Optimize["Optimize assets with Tailwind"]
Optimize --> Output["dist/server and dist/client"]
Output --> End(["Deploy"])
```

**Diagram sources**
- [astro.config.ts](file://astro.config.ts#L30-L36)
- [tailwind.config.ts](file://tailwind.config.ts#L4-L32)

**Section sources**
- [astro.config.ts](file://astro.config.ts#L30-L36)
- [src/i18n/index.ts](file://src/i18n/index.ts#L191-L221)

### Server-Side Rendering (SSR) and Dynamic Endpoints
- API routes under src/pages/api handle dynamic requests:
  - Authentication: start and callback endpoints integrate with Google OAuth 2.0.
  - Comments: CRUD operations with nested replies and reaction counts.
  - Reactions: toggle emoji reactions with deduplication and user-specific state.
- Session management persists user identity across requests using signed cookies and database-backed sessions.

```mermaid
sequenceDiagram
participant C as "Client"
participant A as "Astro SSR"
participant API as "API Route"
participant Auth as "Auth Utils"
participant DB as "Drizzle/PostgreSQL"
C->>A : Request /api/auth/google/start
A->>API : Dispatch GET
API->>Auth : getGoogleAuthUrl(returnTo)
Auth-->>API : OAuth URL
API-->>C : 302 Redirect to Google
C->>A : Callback /api/auth/google/callback?code=...
A->>API : Dispatch GET
API->>Auth : exchangeGoogleCode(code)
API->>Auth : getGoogleUserInfo(access_token)
API->>DB : Upsert user and session
API-->>C : 302 Redirect to returnTo with session cookie
```

**Diagram sources**
- [src/pages/api/auth/google/start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [src/pages/api/auth/google/callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L114)
- [src/lib/auth.ts](file://src/lib/auth.ts#L41-L95)
- [src/lib/session.ts](file://src/lib/session.ts#L13-L54)
- [src/db/schema/index.ts](file://src/db/schema/index.ts#L4-L33)

**Section sources**
- [src/pages/api/auth/google/start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [src/pages/api/auth/google/callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L114)
- [src/lib/auth.ts](file://src/lib/auth.ts#L1-L101)
- [src/lib/session.ts](file://src/lib/session.ts#L1-L58)

### React 19 Islands and Component Architecture
- Astro components (.astro) host React islands for interactive UI. This allows localized hydration and improved performance compared to full-page re-rendering.
- Example islands include CommandPalette, CommentsThread, ReactionsBar, and UI controls (ThemeSwitch, LanguageSwitch).
- Islands communicate with SSR endpoints via fetch calls to API routes, passing minimal props and leveraging server-provided user context.

```mermaid
graph LR
AstroComp["Astro Component (.astro)"]
ReactIsland["React Island (TSX)"]
API["API Route (/api/*)"]
DB["PostgreSQL via Drizzle"]
AstroComp --> ReactIsland
ReactIsland --> API
API --> DB
```

[No sources needed since this diagram shows conceptual workflow, not actual code structure]

**Section sources**
- [astro.config.ts](file://astro.config.ts#L14-L19)
- [package.json](file://package.json#L21-L31)

### Internationalization Architecture
- URL structure: /{ru|en}/... enforced by Astro i18n configuration and routing.
- Content separation: src/content/blog-{en|ru} organizes localized MDX content.
- Utilities:
  - Extract language from URL
  - Provide translations keyed by language
  - Generate localized paths and alternate locales for hreflang

```mermaid
flowchart TD
Req["Incoming URL"] --> Parse["Parse pathname"]
Parse --> HasLang{"Has lang prefix?"}
HasLang --> |Yes| UseLang["Use matched language"]
HasLang --> |No| Default["Use default language"]
UseLang --> T["Translate keys via i18n"]
Default --> T
T --> Render["Render localized page"]
```

**Diagram sources**
- [src/i18n/index.ts](file://src/i18n/index.ts#L191-L221)
- [astro.config.ts](file://astro.config.ts#L30-L36)

**Section sources**
- [astro.config.ts](file://astro.config.ts#L30-L36)
- [src/i18n/index.ts](file://src/i18n/index.ts#L1-L221)

### Data Persistence and Schema
- PostgreSQL schema defined with Drizzle ORM tables for users, sessions, OAuth accounts, comments, reactions, and events.
- Indexes optimize common queries (e.g., comments by page/lang, reactions by target, sessions by expiry).
- API routes use typed queries to maintain consistency and prevent runtime errors.

```mermaid
erDiagram
USERS {
bigserial id PK
text email UK
text name
text avatar_url
timestamp created_at
boolean is_banned
}
OAUTH_ACCOUNTS {
bigserial id PK
bigserial user_id FK
text provider
text provider_user_id
timestamp created_at
}
SESSIONS {
text id PK
bigserial user_id FK
timestamp expires_at
timestamp created_at
}
COMMENTS {
bigserial id PK
text page_type
text page_key
text lang
bigserial user_id FK
bigserial parent_id FK
text body
timestamp created_at
timestamp updated_at
boolean is_hidden
boolean is_deleted
}
REACTIONS {
bigserial id PK
text target_type
text target_key
text lang
bigserial user_id FK
text emoji
timestamp created_at
}
EVENTS {
bigserial id PK
timestamp ts
text source
text kind
text project
text title
text url
text[] tags
jsonb payload
}
USERS ||--o{ OAUTH_ACCOUNTS : "has"
USERS ||--o{ SESSIONS : "has"
USERS ||--o{ COMMENTS : "writes"
USERS ||--o{ REACTIONS : "adds"
COMMENTS ||--o{ COMMENTS : "parent-child"
```

**Diagram sources**
- [src/db/schema/index.ts](file://src/db/schema/index.ts#L1-L104)

**Section sources**
- [src/db/schema/index.ts](file://src/db/schema/index.ts#L1-L104)
- [drizzle.config.ts](file://drizzle.config.ts#L1-L11)

### Authentication Flow
- Start: Generates Google OAuth URL with state and redirects user.
- Callback: Exchanges authorization code for tokens, retrieves user info, upserts user and OAuth account, creates session, sets cookie, and redirects back.
- Session retrieval: Validates session cookie against database and checks user status.

```mermaid
sequenceDiagram
participant U as "User"
participant S as "Server"
participant G as "Google OAuth"
participant D as "Database"
U->>S : GET /api/auth/google/start?returnTo=...
S->>G : Redirect to Google consent
U->>G : Consent
G-->>U : Redirect to /api/auth/google/callback?code=...
U->>S : GET /api/auth/google/callback
S->>G : Exchange code for tokens
S->>G : Fetch userinfo
S->>D : Upsert user/OAuth account
S->>D : Insert session
S-->>U : 302 redirect to returnTo with session cookie
```

**Diagram sources**
- [src/pages/api/auth/google/start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [src/pages/api/auth/google/callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L114)
- [src/lib/auth.ts](file://src/lib/auth.ts#L41-L95)
- [src/lib/session.ts](file://src/lib/session.ts#L13-L54)

**Section sources**
- [src/pages/api/auth/google/start.ts](file://src/pages/api/auth/google/start.ts#L1-L15)
- [src/pages/api/auth/google/callback.ts](file://src/pages/api/auth/google/callback.ts#L1-L114)
- [src/lib/auth.ts](file://src/lib/auth.ts#L1-L101)
- [src/lib/session.ts](file://src/lib/session.ts#L1-L58)

### Comments and Reactions Endpoints
- Comments endpoint supports listing and posting comments with nested replies and reaction counts. It aggregates reaction totals and current user reactions.
- Reactions endpoint toggles emoji reactions with validation and deduplication.

```mermaid
flowchart TD
A["GET /api/comments?type=&key=&lang="] --> B["Fetch comments for page/lang"]
B --> C["Join with users for author info"]
C --> D["Compute reaction counts and user reactions"]
D --> E["Build hierarchical comment tree"]
E --> F["Return JSON"]
P["POST /api/comments"] --> Q["Validate and rate-limit body"]
Q --> R["Insert comment with user context"]
R --> S["Return created comment"]
```

**Diagram sources**
- [src/pages/api/comments/index.ts](file://src/pages/api/comments/index.ts#L6-L163)

**Section sources**
- [src/pages/api/comments/index.ts](file://src/pages/api/comments/index.ts#L1-L240)
- [src/pages/api/reactions/toggle.ts](file://src/pages/api/reactions/toggle.ts#L1-L85)

## Dependency Analysis
- Astro integrates React, Tailwind, MDX, and Sitemap plugins; Node adapter enables SSR/SSG hybrid.
- API routes depend on Drizzle ORM for database operations and on auth/session utilities for user context.
- Environment variables are strongly typed via env.d.ts and consumed by auth utilities and database configuration.

```mermaid
graph LR
Astro["astro.config.ts"] --> React["@astrojs/react"]
Astro --> Tailwind["@astrojs/tailwind"]
Astro --> MDX["@astrojs/mdx"]
Astro --> Sitemap["@astrojs/sitemap"]
Astro --> Node["@astrojs/node(adapter)"]
APIAuth["/api/auth/*"] --> AuthLib["src/lib/auth.ts"]
APIAuth --> SessionLib["src/lib/session.ts"]
APIAuth --> Drizzle["drizzle.config.ts"]
APICmts["/api/comments/*"] --> Drizzle
APIReact["/api/reactions/*"] --> Drizzle
Env["src/env.d.ts"] --> AuthLib
Env --> Drizzle
```

**Diagram sources**
- [astro.config.ts](file://astro.config.ts#L1-L38)
- [package.json](file://package.json#L18-L32)
- [src/lib/auth.ts](file://src/lib/auth.ts#L1-L101)
- [src/lib/session.ts](file://src/lib/session.ts#L1-L58)
- [drizzle.config.ts](file://drizzle.config.ts#L1-L11)
- [env.d.ts](file://src/env.d.ts#L4-L14)

**Section sources**
- [astro.config.ts](file://astro.config.ts#L1-L38)
- [package.json](file://package.json#L18-L32)
- [env.d.ts](file://src/env.d.ts#L1-L19)
- [drizzle.config.ts](file://drizzle.config.ts#L1-L11)

## Performance Considerations
- Prefer SSG for static content to minimize server load and improve caching.
- Use React islands sparingly and keep them small to reduce bundle size and hydration cost.
- Database queries should leverage indexes (e.g., comments by page/lang, reactions by target) to avoid N+1 and slow scans.
- Cache frequently accessed data (e.g., recent events) at the application level when appropriate.
- Minimize cookie size and avoid unnecessary roundtrips by batching API calls where feasible.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Authentication failures:
  - Verify environment variables for Google OAuth and site URL.
  - Check callback URL alignment with provider configuration.
  - Inspect session cookie attributes (secure, sameSite, domain).
- Database connectivity:
  - Confirm DATABASE_URL and Drizzle configuration.
  - Ensure migrations are applied and tables exist.
- API route errors:
  - Review 4xx vs 5xx responses and error logs.
  - Validate request bodies and query parameters.
- Internationalization:
  - Confirm URL prefixes and default locale configuration.
  - Verify translation keys and fallback behavior.

**Section sources**
- [src/lib/auth.ts](file://src/lib/auth.ts#L41-L95)
- [src/lib/session.ts](file://src/lib/session.ts#L13-L54)
- [drizzle.config.ts](file://drizzle.config.ts#L1-L11)
- [src/i18n/index.ts](file://src/i18n/index.ts#L191-L221)

## Conclusion
rodion.pro leverages Astro 5.0 with the Node adapter to deliver a fast, scalable hybrid of SSG and SSR. Static content benefits from zero-runtime rendering, while dynamic features (auth, comments, reactions) are handled server-side with typed database operations and robust session management. React islands enable localized interactivity, and the i18n architecture ensures clear URL-based localization. Together, these choices balance developer productivity, performance, and maintainability.