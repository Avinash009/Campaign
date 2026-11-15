import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { getLeadFollowUp } from "@/modules/ai/service"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/ai/leads/:id/follow-up — rule-based drafts and next action.
 * CampaignHub never sends these messages; the UI offers copy and click-to-contact.
 */
export const GET = routeHandler<RouteContext>(async (_request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params
  const plan = await getLeadFollowUp(context, id)
  return NextResponse.json({ data: plan })
})
