export const GATEWAY_HEADER = "x-gethired-gateway"
export const CLIENT_IP_HEADER = "x-gethired-client-ip"

export interface TransportConfig {
  port: number
  gatewaySecret: string
  bodyTimeoutMs: number
}

export function readTransportConfig(env: Readonly<Record<string, string | undefined>>): TransportConfig {
  const port = env.PORT ?? "4000"
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error("PORT must be an integer from 1 to 65535.")
  if (!/^[a-f0-9]{64}$/i.test(env.API_GATEWAY_SECRET ?? ""))
    throw new Error("API_GATEWAY_SECRET must be 32 random bytes encoded as 64 hex characters.")
  if (env.AUTH_TRUSTED_IP_HEADER && env.AUTH_TRUSTED_IP_HEADER !== CLIENT_IP_HEADER)
    throw new Error("AUTH_TRUSTED_IP_HEADER must be x-gethired-client-ip for the authenticated gateway.")
  return { port: Number(port), gatewaySecret: env.API_GATEWAY_SECRET!, bodyTimeoutMs: 10000 }
}
