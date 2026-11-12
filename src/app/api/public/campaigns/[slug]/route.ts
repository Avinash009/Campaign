import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request"
import { getPublicCampaign } from "@/modules/campaigns/service"

type RouteContext = { params: Promise<{ slug: string }> }

const HOUR_MS = 60 * 60 * 1000

/**
 * GET /api/public/campaigns/:slug — public landing-page data.
 * Rate-limited because it is an unauthenticated endpoint; only ACTIVE
 * campaigns of ACTIVE businesses are returned.
 */
export const GET = routeHandler<RouteContext>(async (request, { params }) => {
  const ip = getClientIp(request)
  const limit = await checkRateLimit({
    key: `public-campaign:${ip}`,
    limit: 120,
    windowMs: HOUR_MS,
  })
  if (!limit.allowed) throw ApiError.tooManyRequests(limit.retryAfterSeconds)

  const { slug } = await params
  const campaign = await getPublicCampaign(slug)
  if (!campaign) throw ApiError.notFound("This campaign page is not available.")

  return NextResponse.json({ data: campaign })
})
