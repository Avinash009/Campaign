import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { removeCampaignImage } from "@/modules/campaigns/service"

type RouteContext = { params: Promise<{ id: string; imageId: string }> }

/** DELETE /api/campaigns/:id/images/:imageId — removes the row and stored file. */
export const DELETE = routeHandler<RouteContext>(async (request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id, imageId } = await params

  await removeCampaignImage(context, id, imageId, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json({ ok: true })
})
