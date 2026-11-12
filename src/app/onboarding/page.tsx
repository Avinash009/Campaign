import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { hasCompletedOnboarding } from "@/modules/business/service"
import { getActiveIndustries } from "@/modules/industries/service"
import { Logo } from "@/components/marketing/logo"
import { OnboardingWizard } from "@/components/business/onboarding-wizard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Set up your business",
  description: "Add your business details to start creating campaigns on CampaignHub.",
}

/**
 * Onboarding wizard (Phase 2 task 2.3). Registration creates the user; the
 * business is created here so we collect real details before any campaign work.
 */
export default async function OnboardingPage() {
  const session = await requireUser()

  if (session.user.isPlatformAdmin) redirect("/admin")
  if (await hasCompletedOnboarding(session.user.id)) redirect("/dashboard")

  const industries = await getActiveIndustries()

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4 sm:px-6">
          <Logo />
          <span className="ml-auto text-xs text-muted-foreground">Takes about a minute</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <OnboardingWizard
          industries={industries.map((industry) => ({
            id: industry.id,
            name: industry.name,
            slug: industry.slug,
          }))}
          defaultEmail={session.user.email ?? ""}
          ownerName={session.user.name ?? undefined}
        />
      </main>
    </div>
  )
}
