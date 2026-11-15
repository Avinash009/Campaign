import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { getCampaignReview } from "@/modules/ai/service"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/ai/campaigns/:id/review — rule-based content and performance review.
 * No provider is required and nothing is forecast.
 */
export const GET = routeHandler<RouteContext>(async (_request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params
  const review = await getCampaignReview(context, id)
  return NextResponse.json({ data: review })
})
