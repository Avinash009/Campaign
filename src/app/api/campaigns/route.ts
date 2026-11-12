import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { parseCampaignListQuery } from "@/modules/campaigns/schemas"
import { createCampaign, getCampaignList } from "@/modules/campaigns/service"

/** GET /api/campaigns — paginated, searchable campaign list for the session business. */
export const GET = routeHandler(async (request) => {
  const context = await requireApiBusinessContext()
  const query = parseCampaignListQuery(new URL(request.url).searchParams)
  const data = await getCampaignList(context.businessId, query)
  return NextResponse.json({ data })
})

/** POST /api/campaigns — create a DRAFT campaign. */
export const POST = routeHandler(async (request) => {
  const context = await requireApiBusinessContext()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const created = await createCampaign(context, body, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json(created, { status: 201 })
})
