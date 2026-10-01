import {
  createRemoteJWKSet,
  jwtVerify,
  errors,
  type JWTVerifyGetKey,
} from "jose"
import { ApiError } from "../api/errors.js"
import type { AuthConfig } from "./config.js"
import { UUID, type Identity } from "./types.js"

export function createJwtVerifier(config: AuthConfig, key?: JWTVerifyGetKey) {
  const issuer = `${config.supabaseUrl}/auth/v1`
  // The URL comes only from configuration. Never follow jku/x5u from a token.
  const jwks =
    key ??
    createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
      timeoutDuration: 5000,
      cooldownDuration: 30000,
      cacheMaxAge: 300000,
    })
  return async (token: string): Promise<Identity> => {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        algorithms: config.algorithms,
        issuer,
        audience: "authenticated",
        clockTolerance: 30,
        requiredClaims: ["sub", "session_id", "iat", "exp"],
      })
      if (
        !UUID.test(payload.sub!) ||
        typeof payload.session_id !== "string" ||
        !UUID.test(payload.session_id) ||
        !Number.isSafeInteger(payload.iat) ||
        !Number.isSafeInteger(payload.exp) ||
        payload.iat! > Date.now() / 1000 + 30 ||
        payload.exp! <= payload.iat! ||
        payload.exp! - payload.iat! > 900
      )
        throw new ApiError("UNAUTHENTICATED")
      return { userId: payload.sub!, sessionId: payload.session_id }
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (error instanceof errors.JWTExpired)
        throw new ApiError("SESSION_EXPIRED")
      if (
        error instanceof errors.JWTClaimValidationFailed ||
        error instanceof errors.JWSSignatureVerificationFailed ||
        error instanceof errors.JWSInvalid ||
        error instanceof errors.JWTInvalid ||
        error instanceof errors.JOSEAlgNotAllowed ||
        error instanceof errors.JWKSNoMatchingKey
      )
        throw new ApiError("UNAUTHENTICATED")
      throw new ApiError("SERVICE_UNAVAILABLE")
    }
  }
}
