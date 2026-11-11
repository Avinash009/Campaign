import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlanCards } from "@/components/marketing/plan-cards"
import { EmptyState } from "@/components/shared/empty-state"
import { IndianRupee, ShieldCheck, Tag } from "lucide-react"
import { getActivePlans } from "@/modules/subscriptions/service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple INR pricing for CampaignHub — start free and upgrade as your campaigns grow.",
}

const PRICING_NOTES = [
  {
    icon: IndianRupee,
    title: "Prices in Indian rupees",
    description: "All amounts are shown in ₹ (INR), inclusive of the taxes we collect.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    description: "Export your leads anytime to CSV. No lock-in.",
  },
  {
    icon: Tag,
    title: "Change plans anytime",
    description: "Upgrade or downgrade when your campaign volume changes.",
  },
] as const

export default async function PricingPage() {
  const plans = await getActivePlans().catch((error) => {
    logger.warn("pricing.plans_unavailable", { error: String(error) })
    return []
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="mb-14 max-w-2xl space-y-4">
        <p className="text-sm font-medium text-primary">Pricing</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Pricing that follows your growth
        </h1>
        <p className="text-lg text-muted-foreground">
          Start free and pay only when your campaigns and team grow.
        </p>
      </div>

      {plans.length > 0 ? (
        <PlanCards plans={plans} />
      ) : (
        <EmptyState
          icon={Tag}
          title="Plans are being set up"
          description="The live plan catalog will appear here once the platform database is configured. The starter plan remains free while we finish setup."
          className="max-w-2xl mx-auto"
        />
      )}

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {PRICING_NOTES.map((note) => (
          <Card key={note.title} size="sm">
            <CardContent className="space-y-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <note.icon className="size-4" aria-hidden />
              </span>
              <h2 className="font-medium">{note.title}</h2>
              <p className="text-sm text-muted-foreground">{note.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-10" size="sm">
        <CardHeader>
          <CardTitle>Questions about billing?</CardTitle>
          <CardDescription>We answer honestly, including what is not included yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/contact">Contact us</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
