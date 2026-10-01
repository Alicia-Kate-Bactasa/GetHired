# B1: separate Node.js API and frontend proxy

**Date:** 2026-10-01. **Status:** implemented and locally verified. Live Supabase connection, production ingress verification, and Render deployment remain B2.

The [B0 amendment](backend-b0-contract.md) records the revised architecture and signup decisions. The existing middleware/auth implementation has moved to `apps/api/src`, retaining JWT verification, Supabase adapter, session store, revocation, cookies/CSRF, response contracts, limits, and request logging. Next.js forwards all `/api` requests through a single catch-all route. No authentication logic or database credentials are needed by the frontend server.

## Delivered files

| Location | Responsibility |
| --- | --- |
| `apps/api/src/server.ts` | Startup config checks, `0.0.0.0:PORT`, HTTP deadlines, shutdown/pool cleanup |
| `apps/api/src/app.ts`, `routes.ts` | Express transport, gateway boundary, five auth routes, JSON errors and live probe |
| `apps/api/src/api`, `auth`, `logging` | Ported framework-independent middleware and auth services |
| `src/server/proxy` | Fixed upstream, header allowlists, bounded body/response reading, deadlines and safe outage responses |
| `src/app/api/[[...path]]/route.ts` | Single browser-facing Next.js API proxy |
| `packages/contracts` | Public response/user/session wire types, separately built |
| `apps/api/tests`, `tests/api-proxy.test.ts` | Ported security/database tests and transport/proxy tests |
| `tests/backend-http-smoke.mjs` | Real local production API + Next.js topology verification |

The old concrete auth routes and `src/server/auth` implementation were removed. Next.js instrumentation validates only proxy configuration. The API uses compiled Node ESM with explicit relative `.js` imports; it requires no React server import condition. The Next.js compiler excludes the API/contracts workspaces.

## Local setup

1. Use Node **22.22.0**, pinned in `.node-version`, and run `npm install` at the repository root.
2. Copy root `.env.example` to `.env.local` and `apps/api/.env.example` to `apps/api/.env.local`. If either file exists, merge the new settings instead of overwriting it.
3. Generate a gateway secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Set the same value as `API_GATEWAY_SECRET` in both files. Do not reuse the auth cookie secret.
4. Leave `AUTH_ENABLED=false` in the API environment until B2. No Supabase credentials are needed to start the server or use the live probe. Keep the frontend upstream at `http://127.0.0.1:4000`; leave the trusted IP header unset for local development.
5. Run `npm run dev:api` in one terminal, then `npm run dev` in another. The API is on port 4000; Next.js remains on port 3000. Workspace dev commands build shared contracts first.

`GET http://localhost:4000/api/health/live` is public and returns JSON status. Other direct API requests require the gateway secret; use `http://localhost:3000/api/...` from the browser. Auth endpoints return `503 SERVICE_UNAVAILABLE` while auth is disabled. The existing mock screens remain prototypes until B3–B7 connect their features.

Previous root Supabase/auth/database variables should be moved to the API environment and removed from the frontend environment when configuring real services. This extraction does not rewrite existing private environment files. Only the API's development command loads `apps/api/.env.local`; production uses platform-provided environment variables.

## Build and verification commands

| Command | Result |
| --- | --- |
| `npm run build:api` | Builds contracts and emits standalone API JavaScript in `apps/api/dist` |
| `npm run build` | Builds contracts and the Next.js frontend |
| `npm run start:api` | Starts compiled API; production variables must already be supplied |
| `npm start` | Starts built Next.js frontend |
| `npm run typecheck` | Checks frontend, API source/tests, and shared types |
| `npm test` | Runs 40 API tests (including nested database checks) and eight proxy tests |
| `npm run test:http` | After both builds: starts temporary local services, runs 18 production HTTP checks, then stops only those processes |

The HTTP smoke uses random synthetic gateway/cookie secrets, an unreachable placeholder database, and local test ports. It checks flows that do not need real provider credentials: CSRF bootstrap, missing/forged credentials, invalid bodies/media/size, method handling, anonymous refresh/logout, multiple cookie deletions through Next.js, gateway/IP rejection, and backend outage. Its synthetic ingress header is a harness input, not a deployable production ingress configuration.

Verified on Node 22.22.0: all 48 tests, 18 production HTTP checks, frontend/API type checks, and both production builds passed. The earlier middleware database tests still use an embedded fixture, not hosted Supabase.

`npm audit` separately reported one pre-existing critical advisory for the installed Next.js 16.3.5: [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), concerning `next/og ImageResponse`; the audit identifies 16.3.6 as outside the affected range. B1 retains the existing Next.js dependency. Resolve this dependency finding before production deployment; passing the extraction tests does not clear that audit finding.

## Production boundary and B2 handoff

- Set API `APP_ORIGIN` to the HTTPS frontend origin, not the API's hostname. Keep the gateway secret private and identical on the two services.
- Verify the frontend ingress overwrites a single-IP header before setting `API_INGRESS_IP_HEADER`. The API accepts only the authenticated internal `x-gethired-client-ip` setting for `AUTH_TRUSTED_IP_HEADER`. Caller-provided forwarding chains are rejected.
- Prefer HTTPS for the upstream API. `API_ALLOW_PRIVATE_HTTP=true` is an explicit opt-in for trusted private connectivity. It is used on loopback in the production smoke only.
- Frontend `/api` fails closed when `API_BASE_URL` is absent. A configured but invalid gateway/ingress configuration fails startup. Neither case enables a mock API identity.
- The gateway passes original Origin/CSRF/Fetch Metadata; it never supplies a missing browser origin. It forwards individual Set-Cookie values and never follows redirects or automatically replays mutations.
- JSON request limit remains 64 KiB. Proxy response buffering is capped at 2 MiB; uploads and any larger response policy are later explicit extensions. Native HTTP-parser failures can occur before the JSON application boundary.
- `GET /api/health/live` reports process liveness only. Database readiness, migrations, hosted provider compatibility, SMTP, production IP trust, and cleanup scheduling are B2+ work.
- Existing student/admin pages and login/signup controls still use prototype behavior. This phase changes API hosting; it does not claim the UI is production protected.

Rollback requires a matched frontend/backend revision and compatible database/cookie configuration. No migration or live account change was made in B1.
