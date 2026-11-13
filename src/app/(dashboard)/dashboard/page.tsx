import Link from "next/link"
import { Megaphone, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { CampaignStatusBadge, LeadStatusBadge } from "@/components/shared/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import {
  DASHBOARD_PERIODS,
  PERIOD_LABELS,
  getDashboardSummary,
  getRecentCampaigns,
  getRecentLeads,
  parseDashboardPeriod,
} from "@/modules/dashboard/service"
import { requireBusinessContext } from "@/modules/auth/session"
import { canWriteCampaigns } from "@/modules/auth/rbac"
import { formatDate, formatPhone } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  BadgeCheck,
  CheckCircle2,
  Inbox,
  Rocket,
  Target,
} from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const context = await requireBusinessContext()
  const params = await searchParams
  const period = parseDashboardPeriod(params.period)
  const canManageCampaigns = canWriteCampaigns(context.role)

  const [summary, recentCampaigns, recentLeads] = await Promise.all([
    getDashboardSummary(context.businessId, period),
    getRecentCampaigns(context.businessId, { period }),
    getRecentLeads(context.businessId, { period }),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {context.businessName} ·{" "}
            {context.role === "OWNER" ? "Owner" : context.role === "ADMIN" ? "Admin" : "Member"}{" "}
            view
          </p>
        </div>

        <nav aria-label="Dashboard period" className="flex flex-wrap gap-1.5">
          {DASHBOARD_PERIODS.map((option) => {
            const active = option === period
            return (
              <Link
                key={option}
                href={option === "all" ? "/dashboard" : `/dashboard?period=${option}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {PERIOD_LABELS[option]}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total campaigns"
          value={summary.totalCampaigns}
          icon={Megaphone}
          description={PERIOD_LABELS[period]}
        />
        <StatCard label="Active campaigns" value={summary.activeCampaigns} icon={Rocket} />
        <StatCard label="Total leads" value={summary.totalLeads} icon={Users} />
        <StatCard label="New leads" value={summary.newLeads} icon={Inbox} />
        <StatCard label="Qualified leads" value={summary.qualifiedLeads} icon={Target} />
        <StatCard label="Converted leads" value={summary.convertedLeads} icon={CheckCircle2} />
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="size-4 text-primary" aria-hidden /> Recent campaigns
            </CardTitle>
            <CardDescription>The newest campaigns created in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No campaigns in this period"
                description="Create a campaign to publish a shareable promotional page for your product or offer. Try a wider date range if you already have campaigns."
                action={
                  canManageCampaigns
                    ? { href: "/dashboard/campaigns/new", label: "Create your first campaign" }
                    : undefined
                }
                hint={canManageCampaigns ? undefined : "Ask an owner or admin to create a campaign."}
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentCampaigns.map((campaign) => (
                  <li key={campaign.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">{campaign.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {campaign.industry?.name ?? "No industry"} · {formatDate(campaign.createdAt)}
                      </p>
                    </div>
                    <CampaignStatusBadge status={campaign.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" aria-hidden /> Latest enquiries
            </CardTitle>
            <CardDescription>Newest leads from your campaign pages in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No enquiries in this period"
                description="Leads appear here as soon as customers submit your campaign enquiry forms."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentLeads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {lead.name}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {formatPhone(lead.phone)}
                        </span>
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          lead.campaign?.name ?? "Direct",
                          lead.city,
                          formatDate(lead.createdAt),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="size-4 text-primary" aria-hidden /> What&apos;s next
          </CardTitle>
          <CardDescription>Modules shipping in the upcoming milestones.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Analytics charts for views, visitors and conversion</li>
            <li>Honest ad-platform integrations once a provider is configured</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
