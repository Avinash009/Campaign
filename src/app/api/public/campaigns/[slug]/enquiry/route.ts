import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request"
import { submitEnquiry } from "@/modules/leads/service"

type RouteContext = { params: Promise<{ slug: string }> }

const HOUR_MS = 60 * 60 * 1000

/**
 * POST /api/public/campaigns/:slug/enquiry — public enquiry intake.
 * Rate-limited by IP (5/hour), validated, honeypot-checked and deduped by
 * phone + campaign within 24 hours. Returns 201 when created and 200 when the
 * enquiry already exists, always with a visitor-facing reference.
 */
export const POST = routeHandler<RouteContext>(async (request, { params }) => {
  const ip = getClientIp(request)
  const limit = await checkRateLimit({
    key: `enquiry:${ip}`,
    limit: 5,
    windowMs: HOUR_MS,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many enquiries from this connection. Please try again later.",
          details: { retryAfterSeconds: limit.retryAfterSeconds },
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const { slug } = await params
  const result = await submitEnquiry(slug, body, { ipAddress: ip })

  return NextResponse.json(
    { data: result },
    { status: result.duplicate ? 200 : 201 },
  )
})
