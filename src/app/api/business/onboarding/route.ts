import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request"
import { requireApiUser } from "@/modules/auth/session"
import { onboardingSchema } from "@/modules/business/schemas"
import { completeOnboarding } from "@/modules/business/service"

const HOUR_MS = 60 * 60 * 1000

/** POST /api/business/onboarding — creates the business + OWNER membership. */
export const POST = routeHandler(async (request) => {
  const session = await requireApiUser()
  const ip = getClientIp(request)

  const limit = await checkRateLimit({
    key: `onboarding:${session.user.id}`,
    limit: 5,
    windowMs: HOUR_MS,
  })
  if (!limit.allowed) throw ApiError.tooManyRequests(limit.retryAfterSeconds)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const parsed = onboardingSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  const business = await completeOnboarding(session.user.id, parsed.data, { ipAddress: ip })

  return NextResponse.json({ businessId: business.id, slug: business.slug }, { status: 201 })
})
