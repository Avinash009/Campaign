import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiPlatformAdmin } from "@/modules/auth/session"
import { updateIndustry } from "@/modules/admin/service"

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/admin/industries/:id — edit fields or activate/deactivate. */
export const PATCH = routeHandler<RouteContext>(async (request, { params }) => {
  const session = await requireApiPlatformAdmin()
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const industry = await updateIndustry(session.user.id, id, body, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json({ data: industry })
})
