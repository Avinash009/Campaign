import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { inviteMemberSchema } from "@/modules/business/schemas"
import { inviteMember } from "@/modules/business/service"

const HOUR_MS = 60 * 60 * 1000

/** POST /api/business/team/invite — creates an INVITED membership + invite link. */
export const POST = routeHandler(async (request) => {
  const context = await requireApiBusinessContext()
  const ip = getClientIp(request)

  const limit = await checkRateLimit({
    key: `team-invite:${context.businessId}`,
    limit: 30,
    windowMs: HOUR_MS,
  })
  if (!limit.allowed) throw ApiError.tooManyRequests(limit.retryAfterSeconds)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const parsed = inviteMemberSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  const result = await inviteMember(context, parsed.data, { ipAddress: ip })
  return NextResponse.json(
    {
      invitationId: result.invitationId,
      inviteUrl: result.inviteUrl,
      emailDelivered: result.emailDelivered,
      expiresAt: result.expiresAt,
    },
    { status: 201 },
  )
})
