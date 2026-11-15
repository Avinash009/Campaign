import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiPlatformAdmin } from "@/modules/auth/session"
import { setBusinessStatus } from "@/modules/admin/service"

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/admin/businesses/:id/status — suspend or reactivate a tenant. */
export const PATCH = routeHandler<RouteContext>(async (request, { params }) => {
  const session = await requireApiPlatformAdmin()
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const result = await setBusinessStatus(session.user.id, id, body, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json({ data: result })
})
