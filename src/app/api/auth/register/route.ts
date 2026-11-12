import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request"
import { registerSchema } from "@/modules/auth/schemas"
import { registerOwner } from "@/modules/auth/service"

const HOUR_MS = 60 * 60 * 1000

/**
 * POST /api/auth/register — creates an owner account.
 * The business is created in the onboarding step, once details are provided.
 * Rate-limited per IP (docs/API.md §1).
 */
export const POST = routeHandler(async (request) => {
  const ip = getClientIp(request)
  const limit = await checkRateLimit({ key: `register:${ip}`, limit: 10, windowMs: HOUR_MS })
  if (!limit.allowed) throw ApiError.tooManyRequests(limit.retryAfterSeconds)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  const result = await registerOwner(parsed.data, { ipAddress: ip })

  return NextResponse.json(
    { userId: result.userId, welcomeEmailDelivered: result.welcomeEmailDelivered },
    { status: 201 },
  )
})
