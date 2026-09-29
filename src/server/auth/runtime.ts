import "server-only"
import { ApiError } from "../api/errors"
import { getServerConfig } from "../config"
import { getAuthConfig } from "./config"
import { createJwtVerifier } from "./jwt"
import { createProvider } from "./provider"
import { createAuthService } from "./service"
import { createAuthStore, createDatabasePool } from "./store"

let service: ReturnType<typeof createAuthService> | undefined
export function getAuthService() {
  const config = getAuthConfig()
  if (!config.enabled) throw new ApiError("SERVICE_UNAVAILABLE")
  return (service ??= createAuthService({
    config,
    appOrigin: getServerConfig().appOrigin,
    provider: createProvider(config),
    verify: createJwtVerifier(config),
    store: createAuthStore(createDatabasePool(config)),
  }))
}
