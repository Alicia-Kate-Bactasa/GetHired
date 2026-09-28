import { createApiRoute } from "@/server/api/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Includes /api itself. Future feature routes take precedence over this fallback.
export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = createApiRoute({
  route: "/api/[[...path]]",
  access: { kind: "public" },
  methods: {},
})
