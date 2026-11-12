import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { getCampaignDetail, updateCampaign } from "@/modules/campaigns/service"

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/campaigns/:id — campaign detail with images. */
export const GET = routeHandler<RouteContext>(async (_request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params
  const campaign = await getCampaignDetail(context, id)
  return NextResponse.json({ data: campaign })
})

/**
 * PATCH /api/campaigns/:id — partial update. The service merges the patch over
 * the current values before validating, so the form can also submit a full body.
 */
export const PATCH = routeHandler<RouteContext>(async (request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const updated = await updateCampaign(context, id, body, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json(updated)
})
