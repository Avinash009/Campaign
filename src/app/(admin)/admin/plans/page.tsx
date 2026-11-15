import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PlanManager } from "@/components/admin/plan-manager"
import { requirePlatformAdmin } from "@/modules/auth/session"
import { getPlatformPlans } from "@/modules/admin/service"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Plans",
}

/** Subscription plan management (Phase 6 task 6.3). */
export default async function AdminPlansPage() {
  await requirePlatformAdmin()
  const plans = await getPlatformPlans()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
          <p className="text-sm text-muted-foreground">
            Subscription plans shown on the pricing page. Amounts are integer paise; campaign and
            member limits apply to new campaigns and invitations.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/pricing" target="_blank" rel="noreferrer">
            Public pricing page <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <PlanManager plans={plans} />
    </div>
  )
}
