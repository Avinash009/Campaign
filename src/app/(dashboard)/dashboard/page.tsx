import { Megaphone, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { CampaignStatusBadge, LeadStatusBadge } from "@/components/shared/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import {
  getDashboardSummary,
  getRecentCampaigns,
  getRecentLeads,
} from "@/modules/dashboard/service"
import { requireBusinessContext } from "@/modules/auth/session"
import { formatDate } from "@/lib/format"
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

export default async function DashboardPage() {
  const context = await requireBusinessContext()

  const [summary, recentCampaigns, recentLeads] = await Promise.all([
    getDashboardSummary(context.businessId),
    getRecentCampaigns(context.businessId),
    getRecentLeads(context.businessId),
  ])

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {context.businessName} · {context.role === "OWNER" ? "Owner" : context.role === "ADMIN" ? "Admin" : "Member"} view
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total campaigns" value={summary.totalCampaigns} icon={Megaphone} />
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
            <CardDescription>The latest campaigns created for this business.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Campaign creation arrives with the campaigns milestone — your first promotional page is coming soon."
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
            <CardDescription>Newest leads from your campaign pages.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No enquiries yet"
                description="Leads appear here as soon as customers submit your campaign enquiry forms."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentLeads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">
                        {lead.name}
                        <span className="ml-2 font-normal text-muted-foreground">{lead.phone}</span>
                      </p>
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
            <li>Business registration &amp; team invitations (next milestone)</li>
            <li>Campaign creation with industry landing pages</li>
            <li>Lead pipeline with follow-ups and CSV export</li>
            <li>Analytics charts for views, visitors and conversion</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
