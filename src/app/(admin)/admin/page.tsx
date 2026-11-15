import Link from "next/link"
import {
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  Inbox,
  Megaphone,
  Rocket,
  Timer,
  UserPlus,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatCard } from "@/components/shared/stat-card"
import { requirePlatformAdmin } from "@/modules/auth/session"
import { getPlatformStatistics, getRecentBusinesses } from "@/modules/admin/service"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Platform overview",
}

/** Cross-tenant platform overview (Phase 6 task 6.5). */
export default async function AdminOverviewPage() {
  await requirePlatformAdmin()
  const [statistics, recentBusinesses] = await Promise.all([
    getPlatformStatistics(),
    getRecentBusinesses(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
          <p className="text-sm text-muted-foreground">
            Cross-tenant platform totals — visible to platform administrators only. Counts are
            live; CampaignHub does not estimate or forecast them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/businesses">
              Businesses <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/campaigns">
              Campaigns <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total businesses" value={statistics.totalBusinesses} icon={Building2} />
        <StatCard label="Active businesses" value={statistics.activeBusinesses} icon={CheckCircle2} />
        <StatCard
          label="Suspended businesses"
          value={statistics.suspendedBusinesses}
          icon={Ban}
          description="Public pages are offline"
        />
        <StatCard
          label="Total users"
          value={statistics.totalUsers}
          icon={Users}
          description={`${statistics.pendingInvitations} pending invitation${statistics.pendingInvitations === 1 ? "" : "s"}`}
        />
        <StatCard label="Total campaigns" value={statistics.totalCampaigns} icon={Megaphone} />
        <StatCard label="Active campaigns" value={statistics.activeCampaigns} icon={Rocket} />
        <StatCard
          label="Total leads"
          value={statistics.totalLeads}
          icon={Users}
          description={`${statistics.newLeadsLast7Days} in the last 7 days`}
        />
        <StatCard
          label="Tracked page views"
          value={statistics.totalPageViews}
          icon={Eye}
          description="First-party, cookie-based"
        />
        <StatCard label="Server-recorded enquiries" value={statistics.totalEnquiries} icon={Inbox} />
        <StatCard label="Trial subscriptions" value={statistics.trialSubscriptions} icon={Timer} />
        <StatCard
          label="Active subscriptions"
          value={statistics.activeSubscriptions}
          icon={CreditCard}
        />
        <StatCard
          label="New leads (7 days)"
          value={statistics.newLeadsLast7Days}
          icon={UserPlus}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card size="sm" className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Newest businesses</CardTitle>
                <CardDescription>
                  Most recently registered businesses on the platform.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/businesses">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentBusinesses.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No businesses registered yet"
                description="Businesses appear here as owners complete registration."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentBusinesses.map((business) => (
                  <li
                    key={business.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        href={`/admin/businesses?search=${encodeURIComponent(business.name)}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {business.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {business.industryName ?? "No industry"} · {formatDate(business.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        business.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-amber-500/10 text-amber-700"
                      }
                    >
                      {business.status === "ACTIVE" ? "Active" : "Suspended"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Platform management</CardTitle>
            <CardDescription>
              Industry and plan catalogs are data — changes apply without a deploy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/admin/industries">
                Industries <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/admin/plans">
                Plans <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/admin/campaigns">
                Campaign monitoring <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
