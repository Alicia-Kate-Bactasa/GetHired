import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { ApiError } from "../api/errors.js"
import type { AuthConfig } from "./config.js"
import { UUID, type Session } from "./types.js"

export interface BrowserBinding {
  nonce: string
  sessionId: string | null
  expires: number
}
export function createBrowserSecurity(config: AuthConfig, appOrigin: string) {
  const prefix = config.production ? "__Host-gethired-" : "gethired-dev-"
  const names = {
    access: `${prefix}access`,
    refresh: `${prefix}refresh`,
    binding: `${prefix}browser`,
  }
  const mac = (purpose: string, value: string) =>
    createHmac("sha256", Buffer.from(config.cookieSecret, "hex"))
      .update(`${purpose}:${value}`)
      .digest("base64url")
  const equal = (left: string, right: string) =>
    left.length === right.length &&
    timingSafeEqual(Buffer.from(left), Buffer.from(right))
  function read(request: Request, name: string) {
    const entries = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${name}=`))
    if (entries.length !== 1) return undefined
    const value = entries[0].slice(name.length + 1)
    return value.length <= 3800 && /^[A-Za-z0-9._~-]+$/.test(value)
      ? value
      : undefined
  }
  function binding(request: Request): BrowserBinding | null {
    const cookie = read(request, names.binding)
    if (!cookie) return null
    const [payload, signature, extra] = cookie.split(".")
    if (
      !payload ||
      !signature ||
      extra ||
      !equal(mac("binding", payload), signature)
    )
      return null
    try {
      const value = JSON.parse(
        Buffer.from(payload, "base64url").toString(),
      ) as BrowserBinding
      if (
        !/^[\w-]{43}$/.test(value.nonce) ||
        !(
          value.sessionId === null ||
          (typeof value.sessionId === "string" && UUID.test(value.sessionId))
        ) ||
        !Number.isSafeInteger(value.expires) ||
        value.expires <= Date.now()
      )
        return null
      return value
    } catch {
      return null
    }
  }
  function cookie(
    headers: Headers,
    name: string,
    value: string,
    maxAge?: number,
  ) {
    if (value.length > 3800 || (value && !/^[A-Za-z0-9._~-]+$/.test(value)))
      throw new ApiError("SERVICE_UNAVAILABLE")
    headers.append(
      "Set-Cookie",
      `${name}=${value}; Path=/; HttpOnly; SameSite=Lax${
        config.production ? "; Secure" : ""
      }${maxAge !== undefined ? `; Max-Age=${maxAge}` : ""}`,
    )
  }
  function issueBinding(headers: Headers, session?: Session) {
    const value: BrowserBinding = {
      nonce: randomBytes(32).toString("base64url"),
      sessionId: session?.id ?? null,
      expires: session?.expiresAt.getTime() ?? Date.now() + 8 * 3600000,
    }
    const payload = Buffer.from(JSON.stringify(value)).toString("base64url")
    cookie(
      headers,
      names.binding,
      `${payload}.${mac("binding", payload)}`,
      session?.rememberMe ? remaining(session) : undefined,
    )
    return value
  }
  const csrfToken = (value: BrowserBinding) =>
    mac("csrf", JSON.stringify(value))
  function assertMutation(request: Request) {
    const value = binding(request)
    const token = request.headers.get("x-csrf-token") ?? ""
    if (
      request.headers.get("origin") !== appOrigin ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      !value ||
      !/^[\w-]{43}$/.test(token) ||
      !equal(csrfToken(value), token)
    )
      throw new ApiError("CSRF_FAILED")
    return value
  }
  function remaining(session: Session) {
    return Math.max(
      0,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    )
  }
  return {
    names,
    read,
    binding,
    assertMutation,
    issueBinding,
    csrfToken,
    setCredentials(
      headers: Headers,
      access: string,
      refresh: string,
      session: Session,
    ) {
      const age = session.rememberMe ? remaining(session) : undefined
      cookie(headers, names.access, access, age)
      cookie(headers, names.refresh, refresh, age)
    },
    clear(headers: Headers) {
      for (const name of Object.values(names)) cookie(headers, name, "", 0)
    },
  }
}
