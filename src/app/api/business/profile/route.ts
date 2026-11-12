import { NextResponse } from "next/server"
import { ApiError, routeHandler } from "@/lib/errors"
import { getClientIp } from "@/lib/request"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { profileUpdateSchema } from "@/modules/business/schemas"
import { getBusinessProfile, updateBusinessProfile } from "@/modules/business/service"

/** GET /api/business/profile — the caller's business profile. */
export const GET = routeHandler(async () => {
  const context = await requireApiBusinessContext()
  const profile = await getBusinessProfile(context.businessId)
  return NextResponse.json({ data: profile })
})

/** PATCH /api/business/profile — owners and admins may edit the profile. */
export const PATCH = routeHandler(async (request) => {
  const context = await requireApiBusinessContext()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest("invalid_json", "Send a valid JSON body.")
  }

  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  const profile = await updateBusinessProfile(context, parsed.data, {
    ipAddress: getClientIp(request),
  })
  return NextResponse.json({ data: profile })
})
