import type { Metadata } from "next"
import Link from "next/link"
import { Building2, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdminBusinessFilters } from "@/components/admin/admin-business-filters"
import { BusinessStatusAction } from "@/components/admin/business-status-action"
import { EmptyState } from "@/components/shared/empty-state"
import { requirePlatformAdmin } from "@/modules/auth/session"
import {
  parseAdminBusinessListQuery,
  type AdminBusinessListQuery,
} from "@/modules/admin/schemas"
import { getPlatformBusinessList } from "@/modules/admin/service"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Businesses",
}

function pageHref(query: AdminBusinessListQuery, page: number): string {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search)
  if (query.status) params.set("status", query.status)
  if (page > 1) params.set("page", String(page))
  const suffix = params.toString()
  return suffix ? `/admin/businesses?${suffix}` : "/admin/businesses"
}

/** Cross-tenant business directory with suspension controls (Phase 6 task 6.1). */
export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePlatformAdmin()
  const params = await searchParams
  const query = parseAdminBusinessListQuery(params)
  const result = await getPlatformBusinessList(query)
  const hasFilters = Boolean(query.search || query.status)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
        <p className="text-sm text-muted-foreground">
          Every tenant on the platform. Suspending a business takes its public pages offline
          immediately; its data and team are retained.
        </p>
      </div>

      <Card size="sm">
        <CardContent className="space-y-4">
          <AdminBusinessFilters
            defaultSearch={query.search ?? ""}
            defaultStatus={query.status ?? "all"}
          />

          <p className="text-xs text-muted-foreground">
            {result.total} business{result.total === 1 ? "" : "es"}
            {hasFilters ? " matching your filters" : ""}
          </p>

          {result.items.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={hasFilters ? "No businesses match those filters" : "No businesses yet"}
              description={
                hasFilters
                  ? "Try a different status or clear the search to see every tenant."
                  : "Businesses appear here as owners complete onboarding."
              }
              hint={hasFilters ? "Adjust the filters above." : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Campaigns</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell>
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate text-sm font-medium">{business.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {business.ownerName ?? "Unknown owner"} · {business.ownerEmail ?? business.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {business.industryName ?? "—"}
                      </TableCell>
                      <TableCell>
                        {business.planName ? (
                          <div className="space-y-0.5">
                            <p className="text-sm">{business.planName}</p>
                            <p className="text-xs text-muted-foreground">
                              {business.subscriptionStatus?.toLowerCase() ?? "no subscription"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No plan</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {business.campaignCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{business.leadCount}</TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(business.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <BusinessStatusAction
                            businessId={business.id}
                            businessName={business.name}
                            status={business.status}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {result.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Page {result.page} of {result.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={result.page <= 1} asChild={result.page > 1}>
                  {result.page > 1 ? (
                    <Link href={pageHref(query, result.page - 1)}>
                      <ChevronLeft className="size-4" aria-hidden /> Previous
                    </Link>
                  ) : (
                    <span>
                      <ChevronLeft className="size-4" aria-hidden /> Previous
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={result.page >= result.totalPages}
                  asChild={result.page < result.totalPages}
                >
                  {result.page < result.totalPages ? (
                    <Link href={pageHref(query, result.page + 1)}>
                      Next <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  ) : (
                    <span>
                      Next <ChevronRight className="size-4" aria-hidden />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
