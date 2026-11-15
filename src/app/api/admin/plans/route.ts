import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiPlatformAdmin } from "@/modules/auth/session"
import { createPlan, getPlatformPlans } from "@/modules/admin/service"

/** GET /api/admin/plans — full plan catalog, including inactive plans. */
export const GET = routeHandler(async () => {
  await requireApiPlatformAdmin()
  const plans = await getPlatformPlans()
  return NextResponse.json({ data: plans })
})

/** POST /api/admin/plans — add a subscription plan (amounts stored in paise). */
export const POST = routeHandler(async (request) => {
  const session = await requireApiPlatformAdmin()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const plan = await createPlan(session.user.id, body, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json({ data: plan }, { status: 201 })
})
