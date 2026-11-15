import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiPlatformAdmin } from "@/modules/auth/session"
import { createIndustry, getPlatformIndustries } from "@/modules/admin/service"

/** GET /api/admin/industries — full catalog, including inactive entries. */
export const GET = routeHandler(async () => {
  await requireApiPlatformAdmin()
  const industries = await getPlatformIndustries()
  return NextResponse.json({ data: industries })
})

/** POST /api/admin/industries — add an industry row (no code changes needed). */
export const POST = routeHandler(async (request) => {
  const session = await requireApiPlatformAdmin()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const industry = await createIndustry(session.user.id, body, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json({ data: industry }, { status: 201 })
})
