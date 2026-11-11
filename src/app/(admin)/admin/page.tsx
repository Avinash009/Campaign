import {
  Building2,
  CheckCircle2,
  Megaphone,
  Rocket,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatCard } from "@/components/shared/stat-card"
import { getPlatformStatistics, getRecentBusinesses } from "@/modules/admin/service"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Platform overview",
}

export default async function AdminOverviewPage() {
  const [statistics, recentBusinesses] = await Promise.all([
    getPlatformStatistics(),
    getRecentBusinesses(),
  ])

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
        <p className="text-sm text-muted-foreground">
          Cross-tenant platform totals — visible to platform administrators only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total businesses" value={statistics.totalBusinesses} icon={Building2} />
        <StatCard label="Active businesses" value={statistics.activeBusinesses} icon={CheckCircle2} />
        <StatCard label="Total users" value={statistics.totalUsers} icon={Users} />
        <StatCard label="Total campaigns" value={statistics.totalCampaigns} icon={Megaphone} />
        <StatCard label="Active campaigns" value={statistics.activeCampaigns} icon={Rocket} />
        <StatCard label="Total leads" value={statistics.totalLeads} icon={Users} />
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Newest businesses</CardTitle>
          <CardDescription>Most recently registered businesses on the platform.</CardDescription>
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
                    <p className="truncate text-sm font-medium">{business.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {business.industryName ?? "No industry"} · {formatDate(business.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={business.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}
                  >
                    {business.status === "ACTIVE" ? "Active" : "Suspended"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
