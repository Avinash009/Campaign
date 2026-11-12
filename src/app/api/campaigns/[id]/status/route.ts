import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { changeCampaignStatus } from "@/modules/campaigns/service"

type RouteContext = { params: Promise<{ id: string }> }

/** POST /api/campaigns/:id/status — publish/pause/complete/archive with lifecycle rules. */
export const POST = routeHandler<RouteContext>(async (request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const result = await changeCampaignStatus(context, id, body, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json(result)
})
