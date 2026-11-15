import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { getLeadQualification } from "@/modules/ai/service"

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/ai/leads/:id/qualification — transparent rule-based scoring. */
export const GET = routeHandler<RouteContext>(async (_request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params
  const qualification = await getLeadQualification(context, id)
  return NextResponse.json({ data: qualification })
})
