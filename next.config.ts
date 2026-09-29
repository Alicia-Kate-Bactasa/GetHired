import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async headers() {
    return ["/dashboard/:path*", "/admin/:path*", "/login/:path*"].map(
      (source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      }),
    )
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",

        hostname: "images.unsplash.com",
      },
    ],
  },
}

export default nextConfig
