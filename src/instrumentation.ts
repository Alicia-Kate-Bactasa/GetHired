export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getProxyConfig } = await import("./server/proxy/config")
    getProxyConfig()
  }
}
