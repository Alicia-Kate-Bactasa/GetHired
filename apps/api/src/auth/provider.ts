import { ApiError } from "../api/errors.js"
import type { AuthConfig } from "./config.js"
import { UUID, type ProviderTokens } from "./types.js"

export class RefreshReplayError extends ApiError {
  constructor() {
    super("SESSION_EXPIRED")
  }
}
export function createProvider(
  config: AuthConfig,
  fetcher: typeof fetch = fetch,
) {
  async function tokens(
    grant: "password" | "refresh_token",
    body: object,
  ): Promise<ProviderTokens> {
    let response: Response
    try {
      response = await fetcher(
        `${config.supabaseUrl}/auth/v1/token?grant_type=${grant}`,
        {
          method: "POST",
          headers: {
            apikey: config.publishableKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        },
      )
    } catch {
      throw new ApiError("SERVICE_UNAVAILABLE")
    }
    let data
    try {
      data = await response.json()
    } catch {
      throw new ApiError("SERVICE_UNAVAILABLE")
    }
    if (response.status === 429)
      throw new ApiError("RATE_LIMITED", { retryAfter: 60 })
    if (!response.ok) {
      if (
        grant === "refresh_token" &&
        data.error_code === "refresh_token_already_used"
      )
        throw new RefreshReplayError()
      if ([400, 401, 403, 422].includes(response.status))
        throw new ApiError(
          grant === "password" ? "INVALID_CREDENTIALS" : "SESSION_EXPIRED",
        )
      throw new ApiError("SERVICE_UNAVAILABLE")
    }
    if (
      typeof data.access_token !== "string" ||
      typeof data.refresh_token !== "string" ||
      !data.user ||
      typeof data.user.id !== "string" ||
      !UUID.test(data.user.id)
    )
      throw new ApiError("SERVICE_UNAVAILABLE")
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user.id,
      emailVerified: !!data.user.email_confirmed_at,
    }
  }
  return {
    login: (email: string, password: string) =>
      tokens("password", { email, password }),
    refresh: (refreshToken: string) =>
      tokens("refresh_token", { refresh_token: refreshToken }),
    async logout(accessToken: string) {
      try {
        const response = await fetcher(
          `${config.supabaseUrl}/auth/v1/logout?scope=local`,
          {
            method: "POST",
            headers: {
              apikey: config.publishableKey,
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(10000),
          },
        )
        if (!response.ok) throw new Error()
      } catch {
        throw new ApiError("SERVICE_UNAVAILABLE")
      }
    },
  }
}
