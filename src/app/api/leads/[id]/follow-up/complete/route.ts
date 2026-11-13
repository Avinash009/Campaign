import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { completeLeadFollowUp } from "@/modules/leads/service"

type RouteContext = { params: Promise<{ id: string }> }

/** POST /api/leads/:id/follow-up/complete — mark the scheduled follow-up done. */
export const POST = routeHandler<RouteContext>(async (request, { params }) => {
  const context = await requireApiBusinessContext()
  const { id } = await params

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    // An empty body is fine for "mark done".
    body = {}
  }

  const lead = await completeLeadFollowUp(context, id, body)
  return NextResponse.json({ data: lead })
})
