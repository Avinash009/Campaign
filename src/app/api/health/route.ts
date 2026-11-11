import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** Liveness/readiness probe used by Cloud Run (and dev sanity checks). */
export async function GET() {
  let database = "up"
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    database = "down"
  }

  const healthy = database === "up"
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", database, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  )
}
