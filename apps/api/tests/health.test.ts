import assert from "node:assert/strict"
import { test } from "node:test"
import { createReadinessProbe, REQUIRED_SCHEMA } from "../src/health.js"
import type { SqlClient } from "../src/auth/store.js"

test("readiness requires the schema marker, rolls back safely and releases on failure", async () => {
  for (const mode of ["ready", "missing", "outage"] as const) {
    const statements: string[] = []
    let released = false
    const client = { async query(sql: string, values?: unknown[]) {
      statements.push(sql)
      if (sql.includes("schema_versions")) {
        assert.deepEqual(values, [REQUIRED_SCHEMA])
        if (mode === "outage") throw new Error("private database diagnostics")
        return { rows: mode === "ready" ? [{ version: REQUIRED_SCHEMA }] : [], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    }, release() { released = true } } as SqlClient
    const probe = createReadinessProbe({ connect: async () => client })
    if (mode === "ready") {
      await probe()
      assert.equal(statements.at(-1), "commit")
    } else {
      await assert.rejects(probe(), { code: "SERVICE_UNAVAILABLE" })
      assert.equal(statements.at(-1), "rollback")
    }
    assert.equal(released, true)
  }
})

test("readiness shares concurrent probes and retries after connection failure", async () => {
  let connections = 0
  const probe = createReadinessProbe({ async connect() {
    connections++
    throw new Error("secret")
  } })
  const first = probe()
  assert.equal(probe(), first)
  await assert.rejects(first, { code: "SERVICE_UNAVAILABLE" })
  await assert.rejects(probe(), { code: "SERVICE_UNAVAILABLE" })
  assert.equal(connections, 2)
})

test("readiness diagnostics categorize failures, suppress secrets and throttle repeated logs", async () => {
  for (const [code, reason] of [["28P01", "database_login_rejected"],
    ["42501", "database_permission_denied"], ["SELF_SIGNED_CERT_IN_CHAIN", "database_tls_failed"],
    ["secret-driver-code", "database_probe_failed"]]) {
    const reports: unknown[] = []
    const probe = createReadinessProbe({ async connect() {
      throw Object.assign(new Error("postgresql://user:secret@host"), { code })
    } }, (failure) => reports.push(failure))
    await assert.rejects(probe(), { code: "SERVICE_UNAVAILABLE" })
    await assert.rejects(probe(), { code: "SERVICE_UNAVAILABLE" })
    assert.deepEqual(reports, [{ event: "api.readiness.failed", stage: "connect", reason }])
    assert.equal(JSON.stringify(reports).includes("secret"), false)
  }
})
