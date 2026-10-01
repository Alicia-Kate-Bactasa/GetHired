# Draft implementation plan

## [API] JWT, authorization, validation, and logging middleware

**Backend direction update (2026-10-01):** See the [backend implementation plan](backend-implementation-plan.md) for B0–B8 delivery phases. B1 has migrated phases 1–3 into a separate Node.js API with a thin Next.js proxy; see [current setup](backend-b1-extraction.md). Supabase database/Auth remain selected. Student self-registration with activation after verification of an eight-digit `@usc.edu.ph` email is confirmed for B5. Next.js API hosting and invitation-only assumptions below describe the earlier design. Live Supabase/Render setup and business features remain pending.

**Recommendation:** build a shared API security layer with separate modules for authentication, permissions, validation, and logging. Integrate it into one complete feature first, then apply it across GetHired.

**Status:** Phases 1 and 2 are complete. Phase 3's backend implementation is complete with configuration placeholders; the user chose to connect Supabase later. See [API contracts and security rules](api-phase-1-contract.md), [Phase 2 implementation](api-phase-2-foundation.md), and [Phase 3 authentication and setup](api-phase-3-authentication.md). Phases 4–7 remain unstarted.

## 1. Current state

The frontend remains a prototype after Phase 3's backend implementation:

- [Login.tsx](../src/components/Login.tsx) simulates login, stores roles in local storage, and runs password reset in the browser.
- The `/dashboard` and `/admin` pages render without server-side authentication checks.
- [data.ts](../src/data.ts) contains mock records and predictable default passwords.
- Company management, student management, and interview features primarily use React state.
- The shared API wrapper, unknown-route fallback, and Phase 3 authentication endpoints are implemented. A private database migration and Supabase adapter are ready for connection; no hosted project has been configured or migrated. Business routes and frontend integration remain future work.

**Implication:** middleware needs a trusted backend identity source and persistent storage before it can protect real accounts and data.

This draft assumes we will use **Next.js Route Handlers under `/api`**. If another team is building a separate backend, the same responsibilities should live there.

## 2. Proposed module structure

These are proposed boundaries; we would create files as each phase needs them.

| Location | Responsibility |
|---|---|
| `src/app/api/` | Endpoints: declare permissions and schemas, invoke services, return responses |
| `src/server/api/` | Shared request wrapper, request context, response format, error handling |
| `src/server/auth/` | JWT verification, session lifecycle, authenticated user lookup |
| `src/server/authorization/` | Role permissions and resource ownership policies |
| `src/schemas/` | Runtime validation schemas, organized by feature |
| `src/server/logging/` | Structured request logs, redaction, security and audit events |
| `src/server/services/` | Business operations for companies, students, bookmarks, and interviews |
| `src/server/repositories/` | Database access and ownership-scoped queries |
| `src/lib/api-client.ts` | Frontend requests and consistent API error handling |
| `src/proxy.ts` | Optional early redirects for protected pages |

Keep server modules out of browser bundles. Shared schemas must contain no secrets or database access.

Next.js 16 calls its framework middleware **Proxy**. We should enforce authentication and authorization in API handlers and server services; Proxy can provide early navigation checks. This matches the [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication) and [Proxy documentation](https://nextjs.org/docs/app/getting-started/proxy).

### Proposed request flow

```text
Request
  → Request ID, logging, and error boundary
  → Request limits and browser request protections
  → Authentication
  → Endpoint permission check
  → Validate parameters, query, and body
  → Resource ownership check
  → Business operation and database access
  → Response and completion log
```

Public endpoints explicitly skip authentication. Login still receives validation, logging, and abuse protection. Resource checks happen after validating the resource identifier.

## 3. Implementation phases

### Phase 1 — Agree on API contracts and security rules

**Completed deliverable:** [Phase 1 endpoint inventory, permission matrix, and authentication contract](api-phase-1-contract.md). Its decision table records confirmed choices and technical defaults; its completion checklist records the resolved decisions.

**Work**

- Inventory endpoints needed by the existing screens.
- Mark each operation as public, student, or administrator.
- Identify records that belong to an individual student.
- Confirm backend location, database, and identity provider.
- Define session duration, “Remember me,” logout, and account deactivation behavior.
- Agree on response and error conventions.

**Proposed permission matrix**

| Operation | Public | Student | Admin |
|---|---|---|---|
| Login and password recovery | Yes | Yes | Yes |
| Browse active companies and categories | To decide | Yes | Yes |
| Manage companies, categories, and questions | No | No | Yes |
| Manage student registry | No | No | Yes |
| Manage bookmarks | No | Own records | No by default |
| Submit/view interview attempts | No | Own records | Explicit policy required |

An administrator should receive only the permissions the product requires, including any access to student interview history.

**Deliverable:** endpoint inventory, permission matrix, and agreed authentication contract.

**Tradeoff:** this phase delays coding slightly but prevents conflicting assumptions across frontend, API, and database work.

### Phase 2 — Build the shared API foundation

**Completed deliverable:** [Implementation, configuration, usage, and verification](api-phase-2-foundation.md). Protected operations fail closed until later phases supply authentication and permissions. Phase 3 requires separate authorization to begin.

**Work**

- Add a small request wrapper that composes the middleware modules.
- Require routes to declare their access policy explicitly.
- Establish request IDs and structured logging from the start.
- Define a consistent success body containing `data` and `requestId`, with `meta: { page, pageSize, total }` for paginated lists.
- Standardize success HTTP statuses using the [Phase 1 response conventions](api-phase-1-contract.md#6-response-and-error-conventions):
  - `200 OK` for successful reads, login, and updates; return the relevant data or acknowledgment.
  - `201 Created` for resource creation, such as an administrator creating a company; return the created resource and a `Location` header when a corresponding resource GET exists.
  - `202 Accepted` for asynchronous email requests accepted for processing.
  - Keep success responses as JSON; do not use `204 No Content` under this contract.
- Use the HTTP status and returned data to communicate success; separate application codes such as `LOGIN_SUCCESS` are unnecessary.
- Define a consistent error body containing:
  - Stable error code.
  - Safe user-facing message.
  - Optional field errors.
  - Request ID.
- Standardize error HTTP statuses and their stable application error codes according to Phase 1: `400`, `401`, `403`, `404`, `405`, `409`, `413`, `415`, `429`, `500`, and `503`.
- Validate required server configuration at startup.
- Set request size limits and prevent shared caching of private responses.

**Deliverable:** a reusable endpoint foundation with predictable success and failure behavior.

Phase 2 builds shared response handling for both outcomes. Later phases implement authentication and business endpoints, then connect the frontend to those endpoints using these conventions.

**Tradeoff:** a wrapper reduces duplication, but a large custom middleware framework would add complexity. Keep composition explicit and small.

### Phase 3 — Implement JWT authentication and session lifecycle

**Implemented deliverable:** [Backend behavior, configuration placeholders, verification, and deferred live setup](api-phase-3-authentication.md). Only Phase 3 was authorized. Provisioning/recovery companion flows and Phases 4–7 remain separate work.

**Work**

- Connect authentication to real users through an identity provider or a credential service.
- Verify JWT signatures, permitted algorithms, issuer, audience, and expiry.
- Keep claims minimal: user ID, session ID, and required timing claims.
- Store browser credentials in `HttpOnly`, `Secure` production cookies with an appropriate `SameSite` policy.
- Add CSRF protection for cookie-authenticated mutations, including origin checks and a token strategy where needed.
- Define login, current-user, refresh, and logout endpoints.
- Keep signing keys server-side and document rotation.
- Add persistent sessions so logout, account deactivation, and password reset can invalidate access.

A candidate JWT library is [`jose`](https://github.com/panva/jose). An identity provider may handle issuance and rotation, leaving this application responsible for verification and application permissions.

**Proposed session policy**

Use short-lived access JWTs and check the active session and current account state on protected requests. If persistent login is required, use rotating refresh credentials stored hashed on the server, with reuse detection and atomic rotation.

JWT verification requirements follow [OWASP’s REST security guidance](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).

**Deliverable:** authenticated requests use a server-verified identity; local storage has no authority over access.

**Tradeoff:** session lookups add database traffic and make this design stateful. They also allow prompt revocation and prevent outdated roles from remaining effective until JWT expiry.

**Dependency:** real credential verification, account provisioning, and password recovery are companion backend tasks. The current demo credentials and OTP flow cannot serve as production authentication.

### Phase 4 — Implement authorization

**Work**

- Define reusable permissions such as:
  - `companies:write`
  - `students:manage`
  - `questions:write`
  - `bookmarks:manage-own`
  - `interviews:submit-own`
- Map student and administrator roles to permissions.
- Deny operations unless explicitly allowed.
- Enforce ownership in service/database queries.
- Derive the acting user from verified authentication.
- Prevent request bodies from assigning roles, ownership, or other privileged fields.
- Apply the same checks to future Server Actions and other server entry points.

**Deliverable:** students cannot invoke administrator operations or access another student’s private records by changing an ID.

**Tradeoff:** role checks are simple, but ownership requires resource-specific policies. Keep role permissions centralized and ownership rules close to the relevant business operation.

### Phase 5 — Implement validation

**Work**

- Define separate schemas for authentication, companies, students, categories, questions, bookmarks, and interview submissions.
- Validate bodies, route parameters, and query parameters.
- Set string lengths, numeric bounds, pagination limits, and accepted enum values.
- Use distinct create and update schemas.
- Reject unsupported writable fields.
- Return useful field errors without echoing secrets.
- Enforce business rules and database constraints separately.

For example, a company’s available slots must be a nonnegative integer; a bookmark must reference an existing, accessible company.

[`Zod`](https://zod.dev/) is a suitable candidate for runtime schemas and inferred TypeScript types. TypeScript interfaces alone do not validate incoming requests.

**Deliverable:** malformed requests fail consistently before changing data.

**Tradeoff:** sharing schemas can reduce frontend/backend drift, but server-only rules must stay on the server. Uniqueness and concurrent updates still need database enforcement.

### Phase 6 — Complete logging and audit behavior

Basic request logging starts in Phase 2. This phase adds feature-specific coverage.

**Work**

- Record request ID, method, route template, status, duration, and an internal actor ID when available.
- Record authentication failures and permission denials using safe reason codes.
- Record administrator changes with actor, action, target, outcome, and timestamp.
- Exclude passwords, OTPs, tokens, cookies, authorization headers, and full request bodies.
- Define log retention, access permissions, and the production destination.
- Handle logging failures without exposing secrets or bypassing security checks.
- Define reliable audit persistence for sensitive mutations, including what happens if audit storage fails.

[`Pino`](https://getpino.io/) is a candidate structured logger. Redaction and event selection should follow [OWASP’s logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

**Deliverable:** developers can trace failed requests, and administrators’ sensitive changes have an attributable record.

**Tradeoff:** detailed logs improve diagnosis but increase storage cost and privacy exposure. Prefer selected metadata over raw payloads.

### Phase 7 — Integrate features and verify behavior

**Recommended order**

1. Login, current user, logout, and protected pages.
2. Company browsing and administrator company updates.
3. Student registry.
4. Categories and question bank.
5. Student bookmarks.
6. Interview submissions and history.

For each feature, replace mock state with API calls, apply policies and schemas, and verify its failure cases.

**Required checks**

- Missing, expired, tampered, wrong-issuer, and wrong-audience JWTs are rejected.
- Students cannot call administrator endpoints.
- Students cannot read or modify another student’s records.
- Invalid input cannot mutate data.
- Logout and account deactivation invalidate access as designed.
- Refresh rotation handles replay and concurrent requests.
- Cross-site mutation attempts are rejected.
- Logs contain request IDs and exclude credentials.
- API failures return JSON; protected page navigation behaves appropriately.
- Private responses cannot leak through shared caching.

**Deliverable:** the security layer works through real user flows and direct API requests.

## 4. Main architectural tradeoffs

| Decision | Benefit | Cost or limitation | Draft recommendation |
|---|---|---|---|
| Next.js API vs separate backend | One deployment and shared TypeScript | Backend scaling and deployment are coupled to the app | Next.js unless a separate API is already planned |
| Managed identity vs app-owned credentials | Managed identity reduces credential lifecycle work | Provider dependency, pricing, integration constraints | Settle before Phase 3 |
| Cookie credentials vs browser-stored bearer tokens | `HttpOnly` prevents JavaScript from reading credentials | Requires CSRF protection; XSS can still initiate requests | Cookies for the current web app |
| JWT-only checks vs active-session lookup | JWT-only checks avoid database reads | Revocation and role changes may be delayed | Active-session lookup initially |
| Roles alone vs roles plus ownership | Roles are easy to understand | Roles alone cannot protect individual student records | Roles plus ownership |
| Full migration vs incremental integration | Full migration gives immediate consistency | Larger changes are harder to diagnose | One feature at a time |

## 5. Scope and decisions to settle

**Core middleware scope:** JWT verification, authenticated request context, permissions, validation, error handling, and logging.

**Companion work required for production integration:** persistent users and sessions, credential provisioning, real password recovery, endpoint implementation, and frontend migration.

Before implementation, settle:

1. Where the API and database will live.
2. Who issues JWTs and manages credentials.
3. Whether company browsing is public.
4. Whether administrators may view student interview history.
5. Session lifetimes and “Remember me” behavior.
6. Log destination and retention period.

**Suggested first milestone:** complete login → current user → company listing → administrator company update, with all four middleware concerns applied. That gives the team a working pattern to reuse across the remaining features.
