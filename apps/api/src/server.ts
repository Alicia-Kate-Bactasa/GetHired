import { createServer } from "node:http"
import createApp from "./app.js"
import { getServerConfig } from "./config.js"
import { getAuthConfig } from "./auth/config.js"
import { closeAuthService } from "./auth/runtime.js"
import { readTransportConfig } from "./http/config.js"

async function start() {
  getServerConfig()
  getAuthConfig()
  const config = readTransportConfig(process.env)
  const server = createServer(createApp(config))
  server.requestTimeout = 15000
  server.headersTimeout = 10000
  server.keepAliveTimeout = 5000
  server.on("error", () => {
    console.error(JSON.stringify({ event: "api.server.failed" }))
    process.exitCode = 1
  })
  let stopping = false
  const stop = () => {
    if (stopping) return
    stopping = true
    const deadline = setTimeout(() => { server.closeAllConnections(); process.exit(1) }, 25000)
    deadline.unref()
    server.close(async () => {
      try { await closeAuthService() } finally { clearTimeout(deadline) }
    })
    server.closeIdleConnections()
  }
  process.once("SIGTERM", stop)
  process.once("SIGINT", stop)
  server.listen(config.port, "0.0.0.0", () => {
    console.info(JSON.stringify({ event: "api.server.started", port: config.port }))
  })
}

start().catch((error) => {
  // Startup errors are our configuration messages only; never emit raw provider errors.
  console.error(JSON.stringify({ event: "api.configuration.failed", message: error instanceof Error ? error.message : "Invalid configuration." }))
  process.exitCode = 1
})
