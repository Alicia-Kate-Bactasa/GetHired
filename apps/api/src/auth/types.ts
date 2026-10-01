export interface Identity {
  userId: string
  sessionId: string
}
import type { User } from "@gethired/contracts"
export type { User } from "@gethired/contracts"
export interface Session {
  id: string
  accountId: string
  createdAt: Date
  expiresAt: Date
  lastActivityAt: Date
  rememberMe: boolean
  revokedAt: Date | null
}
export interface Principal {
  id: string
  identity: Identity
  user: User
  session: Session
}
export interface ProviderTokens {
  accessToken: string
  refreshToken: string
  userId: string
  emailVerified: boolean
}
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function sessionPolicy(role: User["role"], rememberMe: boolean) {
  const persistent = role === "student" && rememberMe
  return {
    rememberMe: persistent,
    absoluteMs: (persistent ? 30 * 24 : 8) * 60 * 60 * 1000,
    idleMs: (persistent ? 7 * 24 * 60 : 30) * 60 * 1000,
  }
}
