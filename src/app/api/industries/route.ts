import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { getActiveIndustries } from "@/modules/industries/service"

/** GET /api/industries — public industry catalog. */
export const GET = routeHandler(async () => {
  const industries = await getActiveIndustries()
  return NextResponse.json({ data: industries })
})
