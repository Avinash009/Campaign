import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IndustryManager } from "@/components/admin/industry-manager"
import { requirePlatformAdmin } from "@/modules/auth/session"
import { getPlatformIndustries } from "@/modules/admin/service"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Industries",
}

/** Industry catalog management (Phase 6 task 6.2). */
export default async function AdminIndustriesPage() {
  await requirePlatformAdmin()
  const industries = await getPlatformIndustries()
  const activeCount = industries.filter((industry) => industry.isActive).length

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Industries</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} of {industries.length} industries are active. Deactivated industries
            stay attached to existing businesses but disappear from onboarding and marketing
            pages.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/industries" target="_blank" rel="noreferrer">
            Public industries page <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <IndustryManager industries={industries} />
    </div>
  )
}
