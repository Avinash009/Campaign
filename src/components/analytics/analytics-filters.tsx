"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  ANALYTICS_PERIODS,
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsCampaignOption,
  type AnalyticsPeriod,
} from "@/modules/analytics/types"

interface AnalyticsFiltersProps {
  period: AnalyticsPeriod
  campaignId: string
  campaigns: AnalyticsCampaignOption[]
}

function buildHref(period: AnalyticsPeriod, campaignId: string): string {
  const params = new URLSearchParams()
  if (period !== "30d") params.set("period", period)
  if (campaignId) params.set("campaignId", campaignId)
  const query = params.toString()
  return query ? `/dashboard/analytics?${query}` : "/dashboard/analytics"
}

/** Period presets + campaign filter, mirrored in the URL. */
export function AnalyticsFilters({ period, campaignId, campaigns }: AnalyticsFiltersProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <nav aria-label="Analytics period" className="flex flex-wrap gap-1.5">
        {ANALYTICS_PERIODS.map((option) => {
          const active = option === period
          return (
            <Link
              key={option}
              href={buildHref(option, campaignId)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {ANALYTICS_PERIOD_LABELS[option]}
            </Link>
          )
        })}
      </nav>

      <div className="w-full space-y-1 sm:w-64">
        <Label className="text-xs text-muted-foreground">Campaign</Label>
        <Select
          value={campaignId || "all"}
          onValueChange={(value) =>
            router.push(buildHref(period, value === "all" ? "" : value))
          }
        >
          <SelectTrigger className="w-full" aria-label="Filter analytics by campaign">
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
