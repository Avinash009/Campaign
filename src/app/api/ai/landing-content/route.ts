import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { generateLandingContent } from "@/modules/ai/service"

/** POST /api/ai/landing-content — generate headline, description and offer copy. */
export const POST = routeHandler(async (request) => {
  const context = await requireApiBusinessContext()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const result = await generateLandingContent(context, body, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json({ data: result.content, meta: result.meta })
})
