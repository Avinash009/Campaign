import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { getLeadDetail } from "@/modules/leads/service"

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/leads/:id — lead detail with its activity timeline. */
export const GET = routeHandler<RouteContext>(async (_request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params
  const lead = await getLeadDetail(context, id)
  return NextResponse.json({ data: lead })
})
