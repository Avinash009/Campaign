import type { Metadata } from "next"
import Link from "next/link"
import {
  BarChart3,
  CheckCircle2,
  Eye,
  Inbox,
  MapPin,
  Megaphone,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AnalyticsFilters } from "@/components/analytics/analytics-filters"
import {
  CampaignComparisonChart,
  LeadStatusChart,
  PerformanceChart,
} from "@/components/analytics/analytics-charts"
import { EmptyState } from "@/components/shared/empty-state"
import { StatCard } from "@/components/shared/stat-card"
import { CampaignStatusBadge } from "@/components/shared/status-badge"
import { requireBusinessContext } from "@/modules/auth/session"
import { parseAnalyticsQuery } from "@/modules/analytics/schemas"
import { getAnalyticsOverview } from "@/modules/analytics/service"
import { ANALYTICS_PERIOD_LABELS } from "@/modules/analytics/types"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Analytics",
}

/** `12.5%`, or an em dash when the rate is undefined (no tracked visitors). */
function percentLabel(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`
}

/**
 * Campaign analytics (Phase 5). Every number comes from CampaignHub's own
 * landing-page events and lead records — no ad-platform impressions, clicks or
 * spend are implied or fabricated.
 */
export default async function AnalyticsPage({
  searchParams,
}: PageProps<"/dashboard/analytics">) {
  const context = await requireBusinessContext()
  const params = await searchParams
  const query = parseAnalyticsQuery(params)
  const overview = await getAnalyticsOverview(context, query)

  const { summary, performance, campaigns, locations, statuses } = overview
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "ACTIVE").length
  const hasActivity = overview.hasPageViews || summary.enquiries > 0
  const rangeLabel = overview.since
    ? `${formatDate(overview.since)} – ${formatDate(overview.until)}`
    : `Up to ${formatDate(overview.until)}`
  const selectedCampaign = campaigns.length === 1 ? campaigns[0] : null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="size-6 text-primary" aria-hidden /> Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Landing-page activity for {context.businessName} · {ANALYTICS_PERIOD_LABELS[overview.period]}
        </p>
      </div>

      <AnalyticsFilters
        period={overview.period}
        campaignId={overview.campaignId ?? ""}
        campaigns={overview.campaignOptions}
      />

      <Card size="sm">
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>
            {rangeLabel} · {activeCampaigns} active campaign{activeCampaigns === 1 ? "" : "s"}
            {selectedCampaign ? ` · ${selectedCampaign.name}` : " · all campaigns"}
          </p>
          <p>
            These numbers come from your own campaign pages and enquiry forms. CampaignHub does
            not receive ad impressions, clicks or spend from Google, Meta or any other platform.
            Visitors are counted with a first-party cookie; Do Not Track is respected.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Page views"
          value={summary.pageViews}
          icon={Eye}
          description={ANALYTICS_PERIOD_LABELS[overview.period]}
        />
        <StatCard
          label="Unique visitors"
          value={summary.uniqueVisitors}
          icon={Users}
          description="Distinct first-party visitor cookies"
        />
        <StatCard
          label="Enquiries"
          value={summary.enquiries}
          icon={Inbox}
          description="Leads created in this window"
        />
        <StatCard
          label="Conversion rate"
          value={percentLabel(summary.conversionRate)}
          icon={TrendingUp}
          description={
            summary.conversionRate === null
              ? "No tracked page views in this window"
              : "Enquiries ÷ unique visitors"
          }
        />
        <StatCard
          label="Qualified leads"
          value={summary.qualifiedLeads}
          icon={Target}
          description="Current status of leads from this window"
        />
        <StatCard
          label="Converted leads"
          value={summary.convertedLeads}
          icon={CheckCircle2}
          description="Current status of leads from this window"
        />
      </div>

      {!hasActivity ? (
        <Card size="sm">
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="No landing-page activity yet"
              description="Analytics fills in as visitors open your published campaign pages and submit enquiry forms. Publish a campaign and share its link to get started."
              action={{ href: "/dashboard/campaigns", label: "Go to campaigns" }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Performance over time</CardTitle>
              <CardDescription>
                Page views, unique visitors and enquiries per{" "}
                {overview.period === "all" ? "month" : "day"}. Enquiries use the right axis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceChart data={performance} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Enquiries by campaign</CardTitle>
                <CardDescription>
                  Campaign-wise comparison for the selected window (top eight with activity).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CampaignComparisonChart data={campaigns} />
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Enquiries by current status</CardTitle>
                <CardDescription>
                  Where the leads received in this window stand today.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeadStatusChart data={statuses} />
              </CardContent>
            </Card>
          </div>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="size-4 text-primary" aria-hidden /> Campaign performance
              </CardTitle>
              <CardDescription>
                Views, visitors, enquiries and conversion for each campaign in the window.
                Conversion needs tracked page views, so it stays blank until a campaign gets
                visits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No campaigns to compare"
                  description="Create a campaign to publish a shareable promotional page for your product or offer."
                  action={{ href: "/dashboard/campaigns/new", label: "Create a campaign" }}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Page views</TableHead>
                        <TableHead className="text-right">Visitors</TableHead>
                        <TableHead className="text-right">Enquiries</TableHead>
                        <TableHead className="text-right">Conversion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="max-w-[16rem]">
                            <Link
                              href={`/dashboard/campaigns/${campaign.id}`}
                              className="block truncate font-medium hover:underline"
                            >
                              {campaign.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <CampaignStatusBadge status={campaign.status} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {campaign.pageViews}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {campaign.visitors}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {campaign.leads}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              campaign.conversionRate === null && "text-muted-foreground",
                            )}
                          >
                            {percentLabel(campaign.conversionRate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" aria-hidden /> Leads by location
              </CardTitle>
              <CardDescription>
                Cities shared on enquiry forms in this window. Enquiries without a city are
                grouped as &ldquo;Not shared&rdquo;.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No enquiries in this window yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>City</TableHead>
                        <TableHead className="text-right">Enquiries</TableHead>
                        <TableHead className="text-right">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((row) => (
                        <TableRow key={row.city}>
                          <TableCell className="font-medium">{row.city}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {percentLabel(row.share)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/leads">Open lead inbox</Link>
            </Button>
            {overview.campaignId && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/analytics">Clear campaign filter</Link>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
