# Phase 2: Shared API foundation

**2026-10-01 extraction:** The shared API implementation now lives in `apps/api/src` and executes in a separate Node.js service. Follow the [B1 guide](backend-b1-extraction.md) for current setup and commands; the earlier design and verification below are historical context.

**Status:** Complete. Implements only Phase 2 of the [implementation plan](api-middleware-implementation-plan.md), using the [Phase 1 contract](api-phase-1-contract.md).

## What is available

| Module | Responsibility |
| --- | --- |
| `src/server/api/route.ts` | Explicit route access, method dispatch, request UUIDs, error boundary, access hook, request completion logging |
| `src/server/api/body.ts` | Bounded stream reads and JSON object parsing |
| `src/server/api/responses.ts` | JSON success/error envelopes, pagination metadata, response headers |
| `src/server/api/errors.ts` | All Phase 1 error codes, fixed safe messages, HTTP status mapping, `Allow` and `Retry-After` |
| `src/server/logging/request.ts` | JSON request logs to stdout using an explicit field allowlist |
| `src/server/config.ts` | Server configuration validation and cached access |
| `src/instrumentation.ts` | Configuration validation when Next.js initializes its Node server |
| `src/app/api/[[...path]]/route.ts` | JSON 404 fallback for `/api` and unknown API paths |

Server modules import `server-only` so Next.js rejects their use in client bundles. `server-only` is the only new runtime dependency; `tsx` runs TypeScript tests during development.

## Configuration and setup

Copy `.env.example` to `.env.local`, then run `npm run dev`. Existing local environment files should be edited to add the variables instead of overwritten. On PowerShell systems with script execution disabled, use `npm.cmd`.

| Variable | Required/default | Rules |
| --- | --- | --- |
| `APP_ORIGIN` | Required | Absolute HTTP(S) origin; no credentials, path, query, or fragment. Production requires HTTPS. Development example: `http://localhost:3000`. |
| `API_MAX_BODY_BYTES` | Default `65536` | Positive integer, at most 64 KiB. May lower the Phase 1 ceiling. |
| `API_LOG_DESTINATION` | Default `stdout` | Only `stdout` is supported. The deployment platform collects the JSON output. |

These are server variables; do not add `NEXT_PUBLIC_` prefixes. No Supabase credentials are required in this phase. Production builds/startup should receive the deployed HTTPS origin through the environment. Configuration errors name the variable without printing its value.

Startup validation uses Next.js's [`register` instrumentation hook](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation). The configured origin establishes the later CSRF configuration contract; origin enforcement and CSRF tokens belong to Phase 3.

The hosting vendor, collector configuration, and retention remain deployment decisions. Phase 2 writes structured request records to stdout; it does not provision external logging or audit storage.

## Route pattern for later phases

This example is documentation only; no company endpoint is implemented:

```ts
import { createApiRoute } from "@/server/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = createApiRoute({
  route: "/api/companies",
  access: { kind: "protected", permission: "companies:read" },
  methods: {
    GET: {
      body: "none",
      handle: async () => ({
        data: [],
        meta: { page: 1, pageSize: 20, total: 0 },
      }),
    },
  },
});
```

Each route must declare `{ kind: "public" }` or `{ kind: "protected", permission?: string }`. Every method on that route shares its access policy. Permission names are metadata in this phase. Protected requests return `503 SERVICE_UNAVAILABLE` until a trusted server `enforceAccess` implementation verifies identity, live sessions, account state, and any declared permission. The handler is never invoked on denial. No cookie, role header, or local storage value supplies an actor.

The second argument accepts `enforceAccess`, a configuration getter, and a request logger. This small boundary supports later authentication modules and isolated tests. The access implementation must return an internal actor UUID or throw a safe `ApiError`; resource ownership still belongs in services and scoped database queries.

Return an object containing `data`, with optional `status: 200 | 201 | 202`, `meta`, `headers`, and `location`. Default status is `200`; use `201` for creation and `202` for accepted email work. Supply a local `/api/...` location for creation when a corresponding resource GET exists. No `204` or raw `Response` returns are supported. Pagination metadata requires array data, page ≥ 1, page size 1–100, and nonnegative total. Query defaults and feature validation remain Phase 5 work.

For errors, throw `new ApiError(code)`. `VALIDATION_ERROR` accepts developer-authored `fieldErrors`. `METHOD_NOT_ALLOWED` requires `allow`; `RATE_LIMITED` requires positive integer `retryAfter` seconds. Unexpected errors, including response serialization failures, become generic `500 INTERNAL_ERROR` responses. Never put submitted values or provider diagnostics in field errors.

Export all seven handler functions as shown. This gives unsupported methods a JSON `405` with `Allow`, including `OPTIONS`, instead of Next.js's automatic responses. `HEAD` has no response body, as required by HTTP; it retains the API status, request ID, and cache headers. It is unsupported unless explicitly declared. Methods outside the seven supported by Next.js, malformed transport requests, and upstream hosting failures may be rejected before the wrapper; clients must tolerate those framework/upstream responses.

## Request processing and limits

1. Generate a UUID and start timing. Incoming `X-Request-ID` is ignored.
2. Load validated configuration and select the declared method; return 404/405 immediately when no handler exists.
3. Read at most the configured body limit, counting actual bytes. A large `Content-Length` can reject early; a missing or understated value cannot bypass the limit.
4. Enforce protected access through the server hook.
5. Parse the declared body and resolve asynchronous route parameters.
6. Invoke the handler, serialize the JSON envelope, and write one completion log.

Declare `body: "json"` for ordinary bodies. It accepts UTF-8 `application/json` objects, rejects malformed JSON, and returns `415` for other content types or compressed bodies. `body: "none"` rejects unexpected body content. Handlers receive parsed `body: unknown`; the request stream has already been consumed. Later feature schemas must validate this value before use.

Multipart uploads are not enabled. The later image endpoint must add a bounded multipart reader and enforce the separate 2 MiB file, decoded format, and dimension rules from Phase 1. Unsupported methods and unknown routes are rejected without buffering their bodies. Transport timeouts and limits before Next.js are hosting responsibilities.

## Privacy and caching

API responses, including errors, use `Cache-Control: private, no-store`, JSON content type, `X-Request-ID`, and `X-Content-Type-Options: nosniff`. The wrapper overwrites handler-supplied cache and request ID headers. Login, dashboard, and admin page responses also receive `private, no-store` through `next.config.ts`.

Request logs include timestamp, static route template, method, status, duration, request ID, optional verified actor UUID, and safe error code. They exclude URLs, query strings, route parameter values, bodies, headers, cookies, tokens, and exception messages/stacks. This allowlist applies to the application logger; deployment/access log settings must also exclude credentials before authentication integration.

A failed request logger cannot turn an access denial into success or break an otherwise valid response. Audit persistence, security event coverage, and transactional audit guarantees remain Phase 6 work.

## Verification

- `npm test`: 18 tests passed, covering response/status contracts, method handling, access declarations and denial, JSON/media failures, stream cancellation, UTF-8 byte limits, safe unexpected errors, log privacy/failure behavior, and configuration validation.
- `npm run typecheck`: passed.
- `npm run build` with a configured production HTTPS origin: passed.
- Production HTTP checks: 14 requests across `/api` and an unknown path, covering all seven supported methods; verified 404, JSON envelopes where HTTP allows a body, matching request IDs, and private cache headers.
- Production page checks: `/dashboard`, `/admin`, and `/login` returned `200` with `private, no-store`.
- Invalid-origin startup check: the instrumentation hook rejected server preparation with a safe configuration error.

Phase 1 remains the historical contract. No Supabase integration, JWT verification, session lifecycle, CSRF implementation, permission mapping, ownership policies, feature schemas, audit database, business endpoints, or frontend API migration was added. Existing UI authentication is still the prototype. Phase 3 requires a separate request.
