import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { generateAdCopy } from "@/modules/ai/service"

/** POST /api/ai/ad-copy — generate headlines, descriptions and CTA labels. */
export const POST = routeHandler(async (request) => {
  const context = await requireApiBusinessContext()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const result = await generateAdCopy(context, body, { ipAddress: getClientIp(request) })
  return NextResponse.json({ data: result.copy, meta: result.meta })
})
