import type { ApiErrorCode } from "../api/errors.js"

export interface RequestLog {
  requestId: string
  route: string
  method: string
  status: number
  durationMs: number
  actorId?: string
  errorCode?: ApiErrorCode
}

export type RequestLogger = (entry: RequestLog) => void | Promise<void>

export const logRequest: RequestLogger = (entry) => {
  // Explicit allowlist. Never serialize a Request, Error, URL, or arbitrary context.
  console.info(
    JSON.stringify({
      event: "api.request.completed",
      timestamp: new Date().toISOString(),
      requestId: entry.requestId,
      route: entry.route,
      method: entry.method,
      status: entry.status,
      durationMs: entry.durationMs,
      ...(entry.actorId ? { actorId: entry.actorId } : {}),
      ...(entry.errorCode ? { errorCode: entry.errorCode } : {}),
    }),
  )
}
