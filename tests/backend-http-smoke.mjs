// Local production topology check. Uses synthetic configuration and no live database.
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { createServer } from "node:net"
import { once } from "node:events"
import { setTimeout as delay } from "node:timers/promises"

const root = new URL("../", import.meta.url)
const children = []
const gateway = randomBytes(32).toString("hex")
async function freePort() {
  const listener = createServer()
  listener.listen(0, "127.0.0.1")
  await once(listener, "listening")
  const port = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  return port
}
function launch(args, env) {
  const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"] })
  // Drain output; do not print raw framework/provider diagnostics from failed processes.
  child.stdout.resume()
  child.stderr.resume()
  children.push(child)
  return child
}
async function ready(url, child, headers = {}) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    assert.equal(child.exitCode, null, "Local smoke service exited before readiness")
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(1000) })
      if (response.ok) return
      await response.body?.cancel()
    } catch { /* Wait for the listener. */ }
    await delay(150)
  }
  throw new Error("Local smoke service did not become ready")
}

try {
  const apiPort = await freePort()
  const frontPort = await freePort()
  const apiUrl = `http://127.0.0.1:${apiPort}`
  const frontUrl = `http://127.0.0.1:${frontPort}`
  const origin = "https://gethired.example"
  const api = launch(["apps/api/dist/server.js"], {
    NODE_ENV: "production", PORT: String(apiPort), APP_ORIGIN: origin,
    API_GATEWAY_SECRET: gateway, API_MAX_BODY_BYTES: "65536", API_LOG_DESTINATION: "stdout",
    AUTH_ENABLED: "true", SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", SUPABASE_JWT_ALGORITHMS: "ES256",
    AUTH_COOKIE_SECRET: randomBytes(32).toString("hex"), AUTH_TRUSTED_IP_HEADER: "x-gethired-client-ip",
    DATABASE_URL: "postgresql://app:placeholder@127.0.0.1:1/postgres",
  })
  await ready(`${apiUrl}/api/health/live`, api)
  const frontend = launch(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(frontPort)], {
    NODE_ENV: "production", API_BASE_URL: apiUrl, API_GATEWAY_SECRET: gateway,
    API_ALLOW_PRIVATE_HTTP: "true", API_INGRESS_IP_HEADER: "x-smoke-ingress-ip",
  })
  const ingress = { "x-smoke-ingress-ip": "127.0.0.1" }
  await ready(`${frontUrl}/api/health/live`, frontend, ingress)
  const smoke = launch(["tests/auth-http-smoke.mjs"], {
    AUTH_SMOKE_URL: frontUrl, APP_ORIGIN: origin, AUTH_SMOKE_IP_HEADER: "x-smoke-ingress-ip",
  })
  const [code] = await once(smoke, "exit")
  assert.equal(code, 0, "Production proxy authentication smoke failed")
  assert.equal((await fetch(`${apiUrl}/api/auth/csrf`)).status, 403)
  assert.equal((await fetch(`${frontUrl}/api/auth/csrf`, { headers: { "x-gethired-client-ip": "127.0.0.1" } })).status, 503)
  const stopped = once(api, "exit")
  api.kill("SIGTERM")
  await stopped
  const outage = await fetch(`${frontUrl}/api/auth/me`, { headers: ingress })
  assert.equal(outage.status, 503)
  assert.equal((await outage.json()).error.code, "SERVICE_UNAVAILABLE")
  console.log("18 production topology checks passed (15 auth checks, gateway/IP rejection, backend outage).")
} finally {
  await Promise.all(children.filter(child => child.exitCode === null && child.signalCode === null).map(async child => {
    const exited = once(child, "exit")
    child.kill("SIGTERM")
    const timeout = setTimeout(() => child.kill("SIGKILL"), 5000)
    await exited
    clearTimeout(timeout)
  }))
}
