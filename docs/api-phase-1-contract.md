# Phase 1: API contracts and security rules

**2026-10-01 amendment:** API hosting and invitation-only decisions below are superseded by the [B0 backend contract](backend-b0-contract.md). The separate Node.js extraction is documented in [B1](backend-b1-extraction.md); existing resource/session/privacy contracts otherwise remain the baseline.

**Date:** 2026-09-28  
**Status:** Phase 1 complete; endpoint inventory, permission matrix, and authentication contract agreed.  
**Scope:** Phase 1 of the [implementation plan](api-middleware-implementation-plan.md). This document specifies future behavior. It does not implement routes, middleware, database tables, or frontend integration.

## 1. Decisions

| Decision | Contract | Status |
| --- | --- | --- |
| Database platform | PostgreSQL on Supabase | Confirmed by the user |
| API location | Next.js Route Handlers under `/api`, deployed with the app | Confirmed by the user |
| Identity | Supabase Auth verifies credentials, issues JWTs, and manages refresh credentials | Confirmed by the user |
| Browser access | Browser calls the same-origin Next.js API; authentication cookies are managed by the server | Contract default, following the implementation plan |
| Company/category browsing | Requires an active student or administrator account; landing-page illustrations remain public static content | Confirmed by the user |
| Interview privacy | Students access their own attempts, answers, and feedback; administrators have no access | Confirmed by the user |
| Student provisioning | Send email invitations so students set their own passwords; retire displayed default passwords | Confirmed by the user (option 1) |
| Student removal | Deactivate the account and revoke sessions; retain records pending a separate retention policy | Confirmed by the user (option 1) |
| Session limits | Student: 8 hours, or 30 days with Remember me; administrator: 8 hours | Confirmed by the user; details in section 5 |

The platform, API location, identity service, browsing/privacy rules, session limits, and student invitation/deactivation policy have been explicitly confirmed. The remaining technical conventions are contract defaults selected for later implementation. Phase 1 is complete. Phases 2–7 remain unstarted.

### Supabase boundary

- Use Supabase Auth for password verification and recovery. The application stores no plaintext/default passwords and does not create a second JWT issuer.
- Keep application roles, account status, student records, bookmarks, and attempts in PostgreSQL. Map the Supabase user UUID to an application account.
- Persist application session metadata keyed by the verified Supabase `session_id`: account ID, creation time, absolute expiry, last activity, Remember me selection, and revocation state.
- All application data access goes through Next.js services. Keep application tables in a private schema or revoke Data API access from `anon` and `authenticated`; otherwise direct Supabase requests could bypass application session checks. Do not expose application tables through RPC, Realtime, or Storage policies that bypass these rules.
- Keep database credentials and Supabase secret/service credentials server-only. Use a restricted database role for ordinary application queries; reserve privileged Auth operations for account provisioning and revocation.
- The frontend does not use a Supabase browser auth client. Server endpoints own login, refresh, and cookie updates; this is a deliberate integration requirement for `HttpOnly` cookies. Supabase's usual browser client needs token access. See the [Supabase server-side guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

## 2. Screen inventory

| Existing source | Observed operation | API coverage |
| --- | --- | --- |
| [Login.tsx](../src/components/Login.tsx) | Identifier/password login, Remember me, email → OTP → new password | Authentication and recovery endpoints |
| [Dashboard.tsx](../src/components/Dashboard.tsx), Home/Explore/company modal | Search, niche/specialization filters, company details, saved companies | Companies and own bookmarks |
| Dashboard profile modal | Read-only name, student ID, and course | Current-user response; no student profile-edit endpoint |
| Dashboard interview view | Category selection, phase questions, submit answer, feedback, retry answer, final result, restart | Own attempts and answers; server-selected question snapshots |
| [AdminDashboard.tsx](../src/components/AdminDashboard.tsx), companies | List/search, create/edit, activate/deactivate, image selection/cropping | Company management and image upload |
| Admin student registry | Search/course filter, create/edit/remove, display/copy generated passwords | Registry, deactivation, invitation delivery; password display is retired during integration |
| Admin question bank | Category and question create/edit/activate/deactivate | Category/question management |
| [Landing.tsx](../src/components/Landing.tsx) | Static marketing content and illustrative dashboard | No live public data endpoint needed by the current screen |

History retrieval is included because the implementation plan explicitly includes interview history, although the current dashboard only keeps the current result in memory. Company/category/question hard-delete helpers have no active UI bindings; deactivation covers the rendered controls. External company website/email links do not require an application endpoint.

## 3. Endpoint inventory

Paths below include `/api`. `Public` means no application login is required; validation, CSRF checks, and abuse controls still apply. `Own` always derives the owner from verified authentication. The success column describes the `data` field and HTTP status.

### Authentication and account setup

| Method and path | Access | Request | Success |
| --- | --- | --- | --- |
| `GET /api/auth/csrf` | Public | None | `200 { csrfToken }`; binds token to an anonymous or authenticated browser session |
| `POST /api/auth/login` | Public | `{ identifier, password, rememberMe }` | `200 { user, session }`; sets auth cookies |
| `GET /api/auth/me` | Student/Admin | None | `200 { user, session }`, with own student profile when applicable |
| `POST /api/auth/refresh` | Valid refresh credential and active application session | Empty JSON object | `200 { session }`; replaces cookies |
| `POST /api/auth/logout` | Current session if present; also accepts absent/expired credentials | Empty JSON object | `200 { loggedOut: true }`; revokes current session and clears cookies |
| `POST /api/auth/password-reset/request` | Public | `{ email }` | `202 { message, challengeId }`; same response shape for registered and unknown addresses |
| `POST /api/auth/password-reset/verify` | Public, with valid recovery challenge | `{ challengeId, code }` | `200 { verified: true }`; sets a short-lived recovery-only cookie |
| `POST /api/auth/password-reset/complete` | Valid recovery-only cookie | `{ newPassword }` | `200 { passwordUpdated: true }`; consumes grant, revokes all account sessions, clears cookies |
| `POST /api/auth/invitations/accept` | Valid, single-use invitation proof | `{ tokenHash, newPassword }` | `200 { accountReady: true }`; completes setup, then requires login |

`user` contains `{ id, role, displayName, email, student }`; `student` is `null` for administrators or `{ studentNumber, firstName, lastName, course, yearLevel }`. `session` contains `{ expiresAt, rememberMe }`; expiry is the absolute application-session deadline. Responses never include access tokens, refresh tokens, OTPs, or passwords. The CSRF token is intentionally readable by browser code.

### Company browsing and bookmarks

| Method and path | Access | Request | Success |
| --- | --- | --- | --- |
| `GET /api/companies` | Student/Admin | `q`, `niche`, repeated `specialization`, pagination | `200 Company[]`; active companies only |
| `GET /api/companies/{companyId}` | Student/Admin | Company ID | `200 Company`; inactive/missing company returns `404` |
| `GET /api/me/bookmarks` | Student, own | Pagination | `200 Bookmark[]`, with accessible company details |
| `PUT /api/me/bookmarks/{companyId}` | Student, own | Empty JSON object | `200 Bookmark`; idempotently saves an active company |
| `DELETE /api/me/bookmarks/{companyId}` | Student, own | No body | `200 { removed: true }`; idempotent, including when company is inactive |

Search matches company name, industry, location, or specialization. Niche filtering uses a documented server mapping of the existing UI niche options. Multiple specialization values match any selected specialization; combine search, niche, and specialization filters with AND. Global company records contain no `saved` field. The frontend derives that state from own bookmarks. Existing bookmarks of inactive companies remain stored but are omitted from browsing; counts include only visible records.

### Interview practice

| Method and path | Access | Request | Success |
| --- | --- | --- | --- |
| `GET /api/categories` | Student/Admin | Pagination | `200 Category[]`; active categories with pipeline descriptions |
| `POST /api/me/interview-attempts` | Student, own | `{ categoryId }` | `201 Attempt`; ordered phases and question snapshots without answer rubrics |
| `GET /api/me/interview-attempts` | Student, own | Optional `categoryId`, `status`, pagination | `200 AttemptSummary[]` |
| `GET /api/me/interview-attempts/{attemptId}` | Student, own | Attempt ID | `200 Attempt`; own saved answers and available feedback |
| `PUT /api/me/interview-attempts/{attemptId}/answers/{questionId}` | Student, own | `{ answer }` | `200 AnswerResult`; saves/replaces answer and returns feedback |
| `POST /api/me/interview-attempts/{attemptId}/complete` | Student, own | Empty JSON object | `200 AttemptResult`; idempotent after completion |

The server chooses questions and computes results. Reject supplied owner IDs, scores, rubrics, feedback, phase definitions, or completion timestamps. `questionId` identifies a question snapshot assigned to that attempt, including introductory, fallback, coding, and candidate-question prompts. Never use array indexes as persistent IDs.

Attempts start as `in_progress`; completion requires an answer for every assigned question and makes the result immutable. Replacing an answer while in progress supports the existing retry control; restarting creates a new attempt. Deactivating a category/question prevents selection for new attempts but does not invalidate snapshots in existing attempts. No code execution endpoint is planned: coding answers are text. The feedback implementation is companion work for Phase 7; random browser scores are not a production assessment. Do not send answers to an external AI provider until its data handling and evaluation contract are settled.

### Administrator operations

All endpoints in this table require an active administrator account and the corresponding permission.

| Method and path | Permission | Request | Success |
| --- | --- | --- | --- |
| `GET /api/admin/companies` | `companies:write` | `q`, `niche`, `status`, pagination | `200 Company[]`, including inactive records |
| `POST /api/admin/companies` | `companies:write` | Company create fields | `201 Company` |
| `PATCH /api/admin/companies/{companyId}` | `companies:write` | Company update fields and/or `status` | `200 Company` |
| `POST /api/admin/company-images` | `companies:write` | Multipart `file` | `201 { imageId, url }` |
| `GET /api/admin/students` | `students:manage` | `q`, `course`, `status`, pagination | `200 Student[]` |
| `POST /api/admin/students` | `students:manage` | Student create fields | `201 Student`; account starts pending invitation |
| `PATCH /api/admin/students/{studentId}` | `students:manage` | Student update fields and/or `status` | `200 Student`; deactivation revokes all sessions |
| `POST /api/admin/students/{studentId}/invitations` | `students:manage` | Empty JSON object | `202 { message }`; sends/resends setup invitation |
| `GET /api/admin/categories` | `questions:write` | `status`, pagination | `200 Category[]` |
| `POST /api/admin/categories` | `questions:write` | Category create fields | `201 Category` |
| `PATCH /api/admin/categories/{categoryId}` | `questions:write` | Category update fields and/or `status` | `200 Category` |
| `GET /api/admin/categories/{categoryId}/questions` | `questions:write` | `status`, pagination | `200 Question[]`, including feedback rubrics |
| `POST /api/admin/categories/{categoryId}/questions` | `questions:write` | Question create fields | `201 Question` |
| `PATCH /api/admin/questions/{questionId}` | `questions:write` | Question update fields and/or `status` | `200 Question` |

List responses contain the detail needed by the existing edit dialogs; dedicated admin detail endpoints are unnecessary initially. Registry search matches student number, name, or email. There are no password-read, public-signup, role-edit, administrator-creation, student-history-for-admin, or hard-delete endpoints in this contract. Provision the first administrator through a trusted operator procedure.

### Resource fields and limits

These are contract boundaries for Phase 5 schemas, not schema implementations.

- All resource IDs are opaque UUID strings generated server-side. `studentNumber` remains a separate unique eight-digit string; existing mock numeric IDs/slugs need migration mappings.
- `Company`: `id`, `name`, `industry`, `type`, `specializations`, `location`, `slots`, `description`, `image`, `website`, `email`, `phone`, `hours`, `status`. Create/update accepts business fields, using `imageId` from upload in place of arbitrary image data. Create defaults to `active`; update may set `active` or `inactive`. `slots` is an integer from 0 to 100,000.
- `Student`: `id`, `studentNumber`, `firstName`, `lastName`, `course`, `yearLevel`, `email`, `status`. Create accepts those academic/contact fields; update may change academic fields and activate/deactivate the account. Pending accounts become active only after verified setup. Permit email correction only before provider provisioning; otherwise reject email changes with `409 CONFLICT`. A verified identity-email change flow is outside this initial contract and requires a separate design. The integrated edit form must explain this restriction. Editing a name/number never resets a password.
- `Category`: `id`, `name`, `description`, `color`, `bg`, `status`, derived `pipeline`. Create/update accepts the first four business fields; update may set status. Pipeline is server-derived from category configuration when the feature is implemented.
- `Question`: `id`, `categoryId`, `question`, `type`, `hint`, `feedback`, `status`. Create accepts `question`, `type`, `hint`, `feedback`; category comes from the path. Update accepts those fields and status. Allowed types: `Introduction`, `Situational`, `Behavioral`, `Motivational`, `Technical`, `Coding`, `Candidate Questions`.
- `Bookmark`: `companyId`, `createdAt`, and a company projection. The owner is implicit in `/me`.
- Text limits: names/labels 120 characters, descriptions/prompts/hints/rubrics 5,000, answers 20,000, URLs 2,048, email 254, phone 40, hours 200, search 200. Specializations: at most 20 entries of 80 characters each. Colors are six-digit hex values. Course/year options must match the current form's supported values.
- Ordinary bodies are JSON objects, limited to 64 KiB of actual bytes read. Reject unknown fields and empty PATCH objects. Validate identifiers and query fields too. Uploads accept verified JPEG/PNG/WebP only, maximum 2 MiB and 4,096 pixels per dimension; decode/re-encode and discard metadata. Store images in Supabase Storage with administrator-only writes. Public image delivery is acceptable for these nonprivate company assets. Clean up unattached uploads later.

## 4. Permission matrix and ownership

| Operation | Public | Student | Administrator |
| --- | --- | --- | --- |
| Login, recovery, invitation acceptance | Credential/challenge rules | Credential/challenge rules | Credential/challenge rules |
| Current user, refresh, logout | No identity disclosure; logout may clear stale cookies | Own session | Own session |
| Active companies/categories | No | Read | Read |
| Inactive company/category/question records | No | No | Read/manage |
| Company/image management | No | No | `companies:write` |
| Student registry and invitations | No | Own profile read only | `students:manage` |
| Category/question bank and rubrics | No | Assigned prompts; feedback after submission | `questions:write` |
| Bookmarks | No | `bookmarks:manage-own` | No |
| Interview attempts, answers, feedback | No | `interviews:submit-own`, `interviews:read-own` | No |
| Application roles or audit-log browsing | No | No | No web endpoint |

Roles are exactly `student` and `admin`; administrator is not an automatic superset of student access. Read application role and account status from trusted database records on each protected request. Supabase's JWT `role` identifies a database role and must not be mistaken for the GetHired administrator role. User-editable identity metadata cannot grant permissions.

| Record | Owner/access rule |
| --- | --- |
| Account and student profile | Account UUID; student reads self, administrator manages registry fields |
| Application session | Account UUID and provider session UUID; only its browser may refresh/logout it |
| Bookmark | Unique `(accountId, companyId)`; owner-scoped reads and writes |
| Attempt | `accountId`; every lookup includes verified actor ID |
| Answer/result | Access through an owned attempt; question must belong to that attempt |
| Recovery challenge/invitation | Bound to account, purpose, expiry, and single-use proof; grants no ordinary app session |
| Company/category/question/image | Shared organizational content; administrator manages it |

Return `404` for missing or foreign student-owned resources after authentication and endpoint permission checks. Return `403` when an authenticated role lacks the endpoint permission. Deactivation blocks future requests immediately after the committed change; it cannot undo a response already delivered. Sensitive writes recheck account/session state in their transaction so a concurrent revocation cannot authorize a later write.

## 5. Authentication contract

### Login and JWT verification

1. Login accepts an eight-digit student number or a registered email address. Resolve a student number to its registered identity email server-side; administrators sign in by email. Trim identifiers, never passwords. The demo `admin` alias and default-password formula are retired during integration.
2. Supabase verifies the password. Require a mapped, active application account and verified email. Unknown user, wrong password, inactive account, and incomplete provisioning return the same `401 INVALID_CREDENTIALS` message.
3. Use the project's asymmetric JWT signing keys. Verify signature, a configured algorithm allowlist, exact issuer `https://<project-ref>.supabase.co/auth/v1`, audience `authenticated`, expiry, and any `nbf` claim. Require valid `sub` and `session_id`; allow at most 30 seconds clock skew. Pin the project's JWKS URL, never follow a token-supplied URL. The exact project reference and signing algorithm are configuration inputs before Phase 3. See [Supabase JWTs](https://supabase.com/docs/guides/auth/jwts) and [signing keys](https://supabase.com/docs/guides/auth/signing-keys).
4. Protected requests also require a live provider session and active application session/account. A decoded or correctly signed JWT alone is insufficient. Fail closed when identity/session storage is unavailable, returning `503` rather than authorizing the request.
5. Supabase issues its documented claims; do not add student records or answers to tokens. Return only the safe current-user projection to the browser. Keep verification and permission checks close to data access, following [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication).

### Confirmed session durations

| Account/login mode | Access JWT lifetime | Absolute session limit | Idle limit | Cookie persistence |
| --- | --- | --- | --- | --- |
| Student, Remember me off | 15 minutes | 8 hours | 30 minutes | Session cookies |
| Student, Remember me on | 15 minutes | 30 days | 7 days | Persistent, bounded by remaining absolute lifetime |
| Administrator | 15 minutes | 8 hours | 30 minutes | Session cookies; Remember me ignored |

The server enforces both absolute and idle deadlines. Successful authenticated business requests update activity; refresh calls and background polling do not extend idle time. Refresh never extends the original absolute deadline. Browser session restore may preserve session cookies, so closing the browser is not guaranteed logout. Set Remember me off by default when integrating the login UI.

Supabase sessions have no fixed lifetime by default, and its configurable timeouts are evaluated during refresh. Therefore enforce these product limits in application session records on each request. Supabase also documents checking `session_id` against live sessions for prompt revocation. See [Supabase sessions](https://supabase.com/docs/guides/auth/sessions).

### Cookies, refresh, logout, and deactivation

- Store access and refresh credentials in `HttpOnly`, `Secure` production cookies with `SameSite=Lax`, `Path=/`, and no `Domain`. Use host-prefixed names in production. Local HTTP development uses explicitly separate non-Secure cookie names.
- Supabase owns refresh rotation and reuse detection; do not implement a competing refresh-token family or store plaintext refresh tokens in application tables. The original plan's hashed refresh credential storage applies only to an app-owned issuer. Application session metadata stores no reusable provider credentials.
- Refresh requires the current refresh cookie even if the access JWT expired. Verify the resulting provider identity/session against the existing application session before setting cookies. Never create a fresh application session from a refresh/recovery credential to bypass expired limits.
- Serialize refresh within a browser and coordinate across tabs; the backend must handle concurrent requests and Supabase's documented reuse rules without interpreting every duplicate as an attack. Confirmed replay revokes the affected application/provider session and requires login.
- Logout revokes the current application session before clearing cookies, and terminates the provider session. Do not return success if application revocation failed. If the local revocation succeeds but provider logout is unavailable, clear cookies, retain revocation, and record a retryable provider cleanup task. Other devices remain signed in.
- Account deactivation, password reset, and role changes revoke all application sessions. Apply provider revocation/disablement as appropriate; the local account check remains authoritative if the provider is temporarily unavailable. Reactivation requires fresh login; old sessions stay revoked.
- Check exact configured `Origin` on browser mutations, including login, refresh, recovery, and logout. Reject absent/untrusted origins for this browser-only API. Require a CSRF token bound to the anonymous/authenticated/recovery session in `X-CSRF-Token`; rotate the binding after login and recovery verification. GET requests never mutate business state. Restrict CORS to the application origin.
- Protected pages use server-side session checks. Unauthenticated navigation redirects to `/login`; wrong-role navigation returns an access-denied view. API requests always return JSON errors, never login HTML. Proxy redirects are optional and cannot replace service checks.

### Provisioning and recovery

- Administrators create registry entries, then send invitations. Track provisioning state so provider failures are retryable without duplicate accounts. No public signup; no password retrieval. Invitations and recovery verify email ownership through Supabase.
- Preserve the current three-step reset UI using Supabase's recovery email template and OTP verification. The template can display a token; see [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates). An invalid/unknown email still receives the same public request response and an opaque challenge identifier.
- Proposed recovery limits: code expiry 10 minutes, five verification attempts per challenge, and a 60-second resend cooldown. A resend invalidates the prior application challenge. Bind challenges to email/account and browser, enforce limits server-side, and never echo codes. Configure matching provider settings before integration.
- Successful OTP verification creates only a recovery grant, expiring after five minutes. Store any provider recovery session server-side with encryption if needed; it must not grant ordinary API access. Completing reset consumes the grant once, changes the password through Supabase, and revokes all sessions. Require a fresh login afterward. See [Supabase password authentication and recovery](https://supabase.com/docs/guides/auth/passwords).
- Proposed new-password policy: 12–128 characters, allow spaces and Unicode, no silent truncation. Apply the same policy to invitations and reset. Configure provider limits to agree; login still submits existing passwords unchanged.
- Invitation acceptance uses a dedicated setup page that submits the single-use proof to the API; strip the proof from the browser URL immediately and exclude it from logs/referrers. The screen and provider email delivery are companion work for Phase 3/7.
- Proposed abuse limits: login five failures per identifier per 15 minutes and 30 attempts per IP per 15 minutes; recovery three sends per address per hour and 20 per IP per hour. Use shared server-side counters. Responses must not reveal whether an address exists; return `429` with `Retry-After` where applicable. Provider limits may be stricter.

Session durations are confirmed GetHired policy; recovery, password, and abuse thresholds are technical defaults for later implementation. General revocation and cookie principles follow [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## 6. Response and error conventions

Success, including mutations:

```json
{
  "data": { "id": "77c0e6b0-caa4-4ab6-b927-e796c951965b", "name": "Example Company" },
  "requestId": "7b1d8a5e-c31a-44c0-8281-c548f5703655"
}
```

Paginated success uses `data: []` plus `meta: { page, pageSize, total }`. Pagination is one-based; default page 1, page size 20, maximum 100. Sort companies/categories/students by name then UUID; attempts by creation time descending then UUID. Reject invalid pagination and unsupported filters. Timestamps are UTC ISO 8601 strings. Create responses use `201` and a `Location` header when a corresponding resource GET exists. Other successful mutations use `200`; asynchronous email requests use `202`. No `204` responses, so the client can always parse JSON.

Failure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "fieldErrors": { "slots": ["Enter a whole number of zero or more."] }
  },
  "requestId": "7b1d8a5e-c31a-44c0-8281-c548f5703655"
}
```

| HTTP status | Stable codes | Meaning |
| --- | --- | --- |
| `400` | `INVALID_JSON`, `VALIDATION_ERROR`, `INVALID_RECOVERY_CODE` | Invalid input or invalid/expired recovery challenge |
| `401` | `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS` | Missing/invalid credentials or expired session |
| `403` | `FORBIDDEN`, `CSRF_FAILED` | Role lacks permission or browser protection failed |
| `404` | `NOT_FOUND` | Missing, inactive, or inaccessible resource |
| `405` | `METHOD_NOT_ALLOWED` | Unsupported method; include `Allow` |
| `409` | `CONFLICT`, `ATTEMPT_COMPLETED`, `ATTEMPT_INCOMPLETE` | Unique constraint or invalid state transition |
| `413` | `PAYLOAD_TOO_LARGE` | Body/upload exceeds the limit |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Wrong content type |
| `429` | `RATE_LIMITED` | Too many requests; include `Retry-After` |
| `500` | `INTERNAL_ERROR` | Unexpected failure, safe generic message |
| `503` | `SERVICE_UNAVAILABLE` | Required database/identity dependency unavailable |

Generate a request UUID at the API boundary; send it in `X-Request-ID` and the JSON envelope. All `/api` failures controlled by the application, including unknown routes and unsupported methods, follow this format. Hosting-provider failures may occur before application code; the client must also tolerate a non-JSON upstream error. Use `Cache-Control: private, no-store` for API/auth responses and private rendered pages, including errors and responses that set cookies. Never echo secrets, SQL errors, stack traces, or provider diagnostics.

Keep field errors optional and keyed by field name; avoid account-existence details on public authentication paths. Status conventions and endpoint-local access checks align with [OWASP REST security guidance](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).

## 7. Logging and later configuration

Phase 1 records requirements only. Phase 2 implements request logging and Phase 6 completes audit behavior.

- Log request ID, route template, method, status, duration, and internal actor UUID when verified. Never log full bodies, query strings containing proofs, passwords, emails used in recovery, OTPs, cookies, or tokens.
- Audit administrator company/student/question changes, invitations, deactivation/reactivation, and security revocations. Include actor, action, target ID, outcome, timestamp, and request ID. Do not include student answers or credential material.
- Proposed destinations: structured JSON to the deployment log collector and an append-only PostgreSQL audit table in a private schema. Proposed retention: request/security logs 30 days, audit records 365 days. Operators receive access; the administrator UI has no log endpoint. Retention and the deployment collector require product/hosting confirmation before production.
- Sensitive database mutations and their audit records commit together. External provider changes need a recorded operation/outbox and retry handling; do not report completed provisioning before its required steps succeed. Ordinary request-log failures must not reveal secrets or bypass authorization.

No Supabase configuration or secrets are needed to review Phase 1. Later work needs:

| When | Configuration |
| --- | --- |
| Phase 2 | Server environment variable contract, application origin, deployment/log destination, request limits |
| Before Phase 3 integration | Development Supabase project URL, server credentials, database connection/pooling choice, asymmetric signing algorithm/JWKS, email/password Auth, disabled public signup, JWT lifetime, SMTP and invitation/recovery templates, allowed redirect URLs |
| Before feature integration | Private application schema/grants, migrations, session/audit permissions, operator-created admin, company image bucket and write policies |

Use local untracked environment files and deployment secrets when implementation needs them; do not place credentials in this document or send them in chat. No dependencies, environment files, migrations, or cloud resources are created in Phase 1.

## 8. Phase 1 review and completion

Completed documentation work:

- [x] Read the implementation plan and repository instructions before changes.
- [x] Inventory operations against the current rendered screens and handlers.
- [x] Specify endpoint access and student ownership boundaries.
- [x] Record the user's PostgreSQL/Supabase platform choice.
- [x] Draft authentication, session, deactivation, response, and error contracts.
- [x] Identify configuration and companion work for later phases.

Completed decisions and contract definitions:

- [x] Confirm Next.js API routes and Supabase Auth as the identity service.
- [x] Confirm login-required browsing and private student interview history.
- [x] Confirm the session limits and administrator Remember me restriction.
- [x] Confirm invitation-based account setup and deactivation replacing student removal (user selected option 1).
- [x] Define the remaining API/error conventions and security defaults for later implementation.

Deployment vendor, operational log retention, and the interview evaluator can be resolved before their respective integration milestones; they do not authorize starting those phases. Phase 1 is complete. Wait for an explicit request to begin Phase 2.
