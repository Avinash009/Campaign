import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiUser } from "@/modules/auth/session"
import { acceptInviteSchema } from "@/modules/business/schemas"
import { acceptInvitation } from "@/modules/business/service"

/** POST /api/business/team/invite/accept — binds the invite to the signed-in user. */
export const POST = routeHandler(async (request) => {
  const session = await requireApiUser()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const parsed = acceptInviteSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  const user = {
    id: session.user.id,
    email: session.user.email ?? "",
  }

  const result = await acceptInvitation(user, parsed.data, { ipAddress: getClientIp(request) })

  return NextResponse.json({
    businessId: result.businessId,
    businessName: result.businessName,
    role: result.role,
  })
})
