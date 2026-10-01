// Run against the frontend proxy plus the standalone API with production placeholder auth.
// Exercises routes that never need a live provider/database; no credentials are submitted.
import assert from "node:assert/strict"

const base = new URL(process.env.AUTH_SMOKE_URL ?? "http://localhost:3103")
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname))
const origin = process.env.APP_ORIGIN ?? "https://gethired.example"
let count = 0
async function check(path, status, code, options = {}) {
  const headers = new Headers(options.headers)
  // Local smoke harness only; production ingress must overwrite its configured IP header.
  if (process.env.AUTH_SMOKE_IP_HEADER) headers.set(process.env.AUTH_SMOKE_IP_HEADER, "127.0.0.1")
  const response = await fetch(new URL(path, base), { ...options, headers })
  assert.equal(response.status, status, `${options.method ?? "GET"} ${path}`)
  assert.equal(response.headers.get("cache-control"), "private, no-store")
  const body = options.method === "HEAD" ? null : await response.json()
  if (body) assert.equal(body.requestId, response.headers.get("x-request-id"))
  if (code) assert.equal(body.error.code, code)
  count++
  return { response, body }
}
const { response, body } = await check("/api/auth/csrf", 200)
const binding = response.headers.getSetCookie()[0]
assert.match(binding, /^__Host-gethired-browser=/)
assert.match(binding, /HttpOnly; SameSite=Lax; Secure/)
assert.doesNotMatch(binding, /Domain=/)
const headers = { Cookie: binding.split(";")[0], Origin: origin, "X-CSRF-Token": body.data.csrfToken, "Content-Type": "application/json" }
await check("/api/auth/me", 401, "UNAUTHENTICATED", { headers: { Cookie: "role=admin", "X-Role": "admin" } })
await check("/api/auth/login", 405, "METHOD_NOT_ALLOWED")
await check("/api/auth/me", 405, "METHOD_NOT_ALLOWED", { method: "OPTIONS" })
await check("/api/auth/me", 405, undefined, { method: "HEAD" })
await check("/api/unknown-phase3", 404, "NOT_FOUND")
await check("/api/auth/csrf", 403, "CSRF_FAILED", { headers: { Origin: "https://evil.invalid" } })
await check("/api/auth/login", 403, "CSRF_FAILED", { method: "POST", body: "{}" })
await check("/api/auth/login", 403, "CSRF_FAILED", { method: "POST", headers: { ...headers, Origin: "https://evil.invalid" }, body: "{}" })
await check("/api/auth/login", 400, "INVALID_JSON", { method: "POST", headers, body: "{" })
await check("/api/auth/login", 400, "VALIDATION_ERROR", { method: "POST", headers, body: "{}" })
await check("/api/auth/login", 415, "UNSUPPORTED_MEDIA_TYPE", { method: "POST", headers: { ...headers, "Content-Type": "text/plain" }, body: "{}" })
await check("/api/auth/login", 413, "PAYLOAD_TOO_LARGE", { method: "POST", headers, body: "x".repeat(65537) })
await check("/api/auth/refresh", 401, "UNAUTHENTICATED", { method: "POST", headers, body: "{}" })
const logout = await check("/api/auth/logout", 200, undefined, { method: "POST", headers, body: "{}" })
assert.deepEqual(logout.body.data, { loggedOut: true })
assert.equal(logout.response.headers.getSetCookie().filter(cookie => cookie.includes("Max-Age=0")).length, 3)
console.log(`${count} production HTTP checks passed.`)
