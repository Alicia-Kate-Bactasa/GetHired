import { createApiRoute } from "@/server/api/route"
import { ApiError } from "@/server/api/errors"
import { getAuthService } from "@/server/auth/runtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = createApiRoute({
  route: "/api/auth/me",
  access: { kind: "protected" },
  methods: {
    GET: {
      body: "none",
      handle: ({ actor }) => {
        if (!actor?.auth) throw new ApiError("UNAUTHENTICATED")
        return getAuthService().me(actor.auth)
      },
    },
  },
})
