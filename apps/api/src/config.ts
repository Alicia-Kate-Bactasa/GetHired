export const MAX_JSON_BODY_BYTES = 64 * 1024

export interface ServerConfig {
  appOrigin: string
  maxBodyBytes: number
  logDestination: "stdout"
}

// Report variable names only: configuration values may contain credentials.
export function readServerConfig(
  env: Readonly<Record<string, string | undefined>>,
): ServerConfig {
  let origin: URL
  try {
    origin = new URL(env.APP_ORIGIN ?? "")
  } catch {
    throw new Error("APP_ORIGIN must be an absolute HTTP(S) origin.")
  }
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    (env.NODE_ENV === "production" && origin.protocol !== "https:")
  ) {
    throw new Error(
      "APP_ORIGIN must contain only an origin; production requires HTTPS.",
    )
  }

  const rawLimit = env.API_MAX_BODY_BYTES ?? String(MAX_JSON_BODY_BYTES)
  const maxBodyBytes = Number(rawLimit)
  if (
    !/^\d+$/.test(rawLimit) ||
    !Number.isSafeInteger(maxBodyBytes) ||
    maxBodyBytes < 1 ||
    maxBodyBytes > MAX_JSON_BODY_BYTES
  ) {
    throw new Error("API_MAX_BODY_BYTES must be an integer from 1 to 65536.")
  }
  if ((env.API_LOG_DESTINATION ?? "stdout") !== "stdout") {
    throw new Error("API_LOG_DESTINATION must be stdout.")
  }
  return Object.freeze({
    appOrigin: origin.origin,
    maxBodyBytes,
    logDestination: "stdout",
  })
}

let config: ServerConfig | undefined

export function getServerConfig(): ServerConfig {
  return (config ??= readServerConfig(process.env))
}
