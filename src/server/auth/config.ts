import "server-only"

export interface AuthConfig {
  enabled: boolean
  production: boolean
  supabaseUrl: string
  publishableKey: string
  databaseUrl: string
  algorithms: ("ES256" | "RS256")[]
  cookieSecret: string
  trustedIpHeader?: string
}

export function readAuthConfig(
  env: Readonly<Record<string, string | undefined>>,
): AuthConfig {
  const enabled = env.AUTH_ENABLED === "true"
  if (env.AUTH_ENABLED && !["true", "false"].includes(env.AUTH_ENABLED))
    throw new Error("AUTH_ENABLED must be true or false.")
  const base = { enabled, production: env.NODE_ENV === "production" }
  if (!enabled)
    return {
      ...base,
      supabaseUrl: "",
      publishableKey: "",
      databaseUrl: "",
      algorithms: [],
      cookieSecret: "",
    }
  let url: URL
  try {
    url = new URL(env.SUPABASE_URL ?? "")
  } catch {
    throw new Error("SUPABASE_URL is required.")
  }
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "SUPABASE_URL must be a hosted Supabase project HTTPS origin.",
    )
  const algorithms = (env.SUPABASE_JWT_ALGORITHMS ?? "")
    .split(",")
    .map((value) => value.trim())
  if (
    !algorithms.length ||
    algorithms.some((value) => !["ES256", "RS256"].includes(value))
  )
    throw new Error(
      "SUPABASE_JWT_ALGORITHMS must explicitly allow ES256 and/or RS256.",
    )
  if (!env.SUPABASE_PUBLISHABLE_KEY || /\s/.test(env.SUPABASE_PUBLISHABLE_KEY))
    throw new Error("SUPABASE_PUBLISHABLE_KEY is required.")
  let database: URL
  try {
    database = new URL(env.DATABASE_URL ?? "")
  } catch {
    throw new Error("DATABASE_URL is required.")
  }
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !database.hostname ||
    !database.username ||
    database.search
  )
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection URL without query options; TLS is enforced by the client.",
    )
  if (!/^[a-f0-9]{64}$/i.test(env.AUTH_COOKIE_SECRET ?? ""))
    throw new Error(
      "AUTH_COOKIE_SECRET must be 32 random bytes encoded as 64 hex characters.",
    )
  const trustedIpHeader = env.AUTH_TRUSTED_IP_HEADER?.toLowerCase()
  if (trustedIpHeader && !/^[a-z0-9-]+$/.test(trustedIpHeader))
    throw new Error("AUTH_TRUSTED_IP_HEADER must be a header name.")
  if (base.production && !trustedIpHeader)
    throw new Error(
      "AUTH_TRUSTED_IP_HEADER requires a deployment proxy that overwrites the header.",
    )
  return {
    ...base,
    supabaseUrl: url.origin,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    databaseUrl: env.DATABASE_URL!,
    algorithms: algorithms as AuthConfig["algorithms"],
    cookieSecret: env.AUTH_COOKIE_SECRET!,
    trustedIpHeader,
  }
}

let config: AuthConfig | undefined
export function getAuthConfig() {
  return (config ??= readAuthConfig(process.env))
}
