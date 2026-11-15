import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone } from "lucide-react"
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
import { AdminCampaignFilters } from "@/components/admin/admin-campaign-filters"
import { CampaignStatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { requirePlatformAdmin } from "@/modules/auth/session"
import {
  parseAdminCampaignListQuery,
  type AdminCampaignListQuery,
} from "@/modules/admin/schemas"
import { getPlatformCampaignList } from "@/modules/admin/service"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Campaigns",
}

function pageHref(query: AdminCampaignListQuery, page: number): string {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search)
  if (query.status) params.set("status", query.status)
  if (page > 1) params.set("page", String(page))
  const suffix = params.toString()
  return suffix ? `/admin/campaigns?${suffix}` : "/admin/campaigns"
}

/** Cross-tenant campaign monitoring — read-only (Phase 6 task 6.4). */
export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePlatformAdmin()
  const params = await searchParams
  const query = parseAdminCampaignListQuery(params)
  const result = await getPlatformCampaignList(query)
  const hasFilters = Boolean(query.search || query.status)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Every campaign across the platform, with tracked page views, enquiries and leads.
          Monitoring is read-only — campaign changes stay with the owning business.
        </p>
      </div>

      <Card size="sm">
        <CardContent className="space-y-4">
          <AdminCampaignFilters
            defaultSearch={query.search ?? ""}
            defaultStatus={query.status ?? "all"}
          />

          <p className="text-xs text-muted-foreground">
            {result.total} campaign{result.total === 1 ? "" : "s"}
            {hasFilters ? " matching your filters" : ""}
          </p>

          {result.items.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title={hasFilters ? "No campaigns match those filters" : "No campaigns yet"}
              description={
                hasFilters
                  ? "Try a different status or clear the search to see every campaign."
                  : "Campaigns appear here once businesses start creating promotional pages."
              }
              hint={hasFilters ? "Adjust the filters above." : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Page views</TableHead>
                    <TableHead className="text-right">Enquiries</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((campaign) => {
                    const isPublic = campaign.status === "ACTIVE" && campaign.businessStatus === "ACTIVE"
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-sm font-medium">{campaign.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {campaign.industryName ?? "No industry"} ·{" "}
                              <span className="font-mono">/c/{campaign.slug}</span>
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-sm">{campaign.businessName}</p>
                            {campaign.businessStatus === "SUSPENDED" && (
                              <Badge
                                variant="secondary"
                                className="bg-amber-500/10 text-amber-700"
                              >
                                Business suspended
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CampaignStatusBadge status={campaign.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{campaign.pageViews}</TableCell>
                        <TableCell className="text-right tabular-nums">{campaign.enquiries}</TableCell>
                        <TableCell className="text-right tabular-nums">{campaign.leadCount}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(campaign.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isPublic ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/c/${campaign.slug}`} target="_blank" rel="noreferrer">
                                View <ExternalLink className="size-3.5" aria-hidden />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not public</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
