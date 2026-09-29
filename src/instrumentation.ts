export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerConfig } = await import("./server/config")
    getServerConfig()
    const { getAuthConfig } = await import("./server/auth/config")
    getAuthConfig()
  }
}
