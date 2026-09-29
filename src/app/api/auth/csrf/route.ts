import { createApiRoute } from "@/server/api/route"
import { getAuthService } from "@/server/auth/runtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = createApiRoute({
  route: "/api/auth/csrf",
  access: { kind: "public" },
  methods: {
    GET: {
      body: "none",
      handle: ({ request }) => getAuthService().csrf(request),
    },
  },
})
