import { ApiError } from "./api/errors.js"
import type { SqlPool } from "./auth/store.js"

export const REQUIRED_SCHEMA = "202610050001"

// One in-flight probe per process prevents public probes exhausting the pool.
export function createReadinessProbe(pool: SqlPool) {
  let pending: Promise<void> | undefined
  return function ready(): Promise<void> {
    return pending ??= check().finally(() => { pending = undefined })
  }
  async function check() {
    let client: Awaited<ReturnType<SqlPool["connect"]>> | undefined
    try {
      client = await pool.connect()
      await client.query("begin read only")
      await client.query("set local statement_timeout = '2000ms'")
      const result = await client.query(
        "select version from gethired_private.schema_versions where version = $1",
        [REQUIRED_SCHEMA],
      )
      if (result.rows.length !== 1) throw new Error("Schema unavailable")
      // Exercise runtime grants and the provider bridge without reading user data.
      await client.query(`select gethired_private.provider_session_live(
        '00000000-0000-0000-0000-000000000000'::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid)`)
      await client.query("select id from gethired_private.accounts limit 0")
      await client.query("commit")
    } catch {
      if (client) try { await client.query("rollback") } catch { /* Safe failure below. */ }
      throw new ApiError("SERVICE_UNAVAILABLE")
    } finally { client?.release() }
  }
}
