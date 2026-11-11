import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { IndustryIcon } from "@/components/shared/industry-icon"
import { Database } from "lucide-react"
import { getActiveIndustries } from "@/modules/industries/service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Industries",
  description:
    "CampaignHub landing pages adapt to real estate, finance, insurance, education, healthcare, retail, travel and more.",
}

export default async function IndustriesPage() {
  const industries = await getActiveIndustries().catch((error) => {
    logger.warn("industries.unavailable", { error: String(error) })
    return []
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="mb-14 max-w-2xl space-y-4">
        <p className="text-sm font-medium text-primary">Industries</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          One platform, tuned to how your industry sells
        </h1>
        <p className="text-lg text-muted-foreground">
          Your campaign page shows the details your customers actually ask
          for — picked by industry, editable by you.
        </p>
      </div>

      {industries.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry) => (
            <Card key={industry.id} size="sm" className="h-full">
              <CardContent className="space-y-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <IndustryIcon iconKey={industry.iconKey} className="size-5" />
                </span>
                <h2 className="font-medium">{industry.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {industry.description ?? "Promotional landing pages tailored to this industry."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Database}
          title="Industry catalog is being set up"
          description="The industry list is managed in the platform database and will appear here once configured."
        />
      )}

      <div className="mt-14 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/register">Start free</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/features">Explore features</Link>
        </Button>
      </div>
    </div>
  )
}
