import "server-only"
import { ApiError } from "./errors"

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
}

export interface ApiResult {
  data: unknown
  status?: 200 | 201 | 202
  meta?: PaginationMeta
  headers?: HeadersInit
  /** Supply for creation when the resource has a corresponding GET endpoint. */
  location?: string
}

function responseHeaders(requestId: string, initial?: HeadersInit): Headers {
  const headers = new Headers(initial)
  headers.set("Content-Type", "application/json; charset=utf-8")
  headers.set("Cache-Control", "private, no-store")
  headers.set("X-Request-ID", requestId)
  headers.set("X-Content-Type-Options", "nosniff")
  return headers
}

export function successResponse(
  result: ApiResult,
  requestId: string,
): Response {
  const status = result.status ?? 200
  if (![200, 201, 202].includes(status) || result.data === undefined) {
    throw new Error("API success requires data and status 200, 201, or 202.")
  }
  if (result.meta) {
    const { page, pageSize, total } = result.meta
    if (
      !Array.isArray(result.data) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100 ||
      !Number.isSafeInteger(total) ||
      total < 0
    ) {
      throw new Error("Invalid API pagination metadata.")
    }
  }
  const headers = responseHeaders(requestId, result.headers)
  if (result.location) {
    if (
      status !== 201 ||
      !result.location.startsWith("/api/") ||
      /[\r\n]/.test(result.location)
    ) {
      throw new Error(
        "Location requires a 201 response and a local API resource path.",
      )
    }
    headers.set("Location", result.location)
  }
  return Response.json(
    {
      data: result.data,
      ...(result.meta ? { meta: result.meta } : {}),
      requestId,
    },
    {
      status,
      headers,
    },
  )
}

export function errorResponse(error: ApiError, requestId: string): Response {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
      requestId,
    },
    {
      status: error.status,
      headers: responseHeaders(requestId, error.headers),
    },
  )
}
