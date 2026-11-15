import { NextResponse } from "next/server"
import { routeHandler } from "@/lib/errors"
import { requireApiBusinessContext } from "@/modules/auth/session"
import { getAiStatus } from "@/modules/ai/service"

/**
 * GET /api/ai/status — whether provider-backed generation is configured.
 * Rule-based features work regardless; this only gates ad copy and landing copy.
 */
export const GET = routeHandler(async () => {
  await requireApiBusinessContext()
  return NextResponse.json({ data: getAiStatus() })
})
