import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request"
import { recordPageView } from "@/modules/analytics/service"

type RouteContext = { params: Promise<{ slug: string }> }

const HOUR_MS = 60 * 60 * 1000

/**
 * POST /api/public/campaigns/:slug/events — landing-page page-view beacon.
 * Rate-limited by IP, validated, and only accepted for published campaigns of
 * active businesses. Returns 202 so the page never waits on analytics.
 */
export const POST = routeHandler<RouteContext>(async (request, { params }) => {
  const ip = getClientIp(request)
  const limit = await checkRateLimit({
    key: `campaign-event:${ip}`,
    limit: 120,
    windowMs: HOUR_MS,
  })
  if (!limit.allowed) throw ApiError.tooManyRequests(limit.retryAfterSeconds)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const { slug } = await params
  const result = await recordPageView(slug, body, {
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
  })

  return NextResponse.json({ data: result }, { status: 202 })
})
