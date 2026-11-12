import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Megaphone, Plus } from "lucide-react"
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
import { CampaignFilters } from "@/components/campaigns/campaign-filters"
import { CampaignStatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { requireBusinessContext } from "@/modules/auth/session"
import { canWriteCampaigns } from "@/modules/auth/rbac"
import { OBJECTIVE_LABELS } from "@/modules/campaigns/labels"
import { parseCampaignListQuery } from "@/modules/campaigns/schemas"
import { getCampaignList, getCampaignPlanUsage } from "@/modules/campaigns/service"
import { formatDate } from "@/lib/format"
import { publicImageSrc } from "@/lib/image-src"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Campaigns",
}

/** Campaign list with search, status filter and pagination (Phase 3 task 3.4). */
export default async function CampaignsPage({ searchParams }: PageProps<"/dashboard/campaigns">) {
  const context = await requireBusinessContext()
  const params = await searchParams
  const query = parseCampaignListQuery(params)

  const [result, usage] = await Promise.all([
    getCampaignList(context.businessId, query),
    getCampaignPlanUsage(context.businessId),
  ])

  const canManage = canWriteCampaigns(context.role)
  const hasFilters = Boolean(query.search || query.status)

  function pageHref(page: number): string {
    const next = new URLSearchParams()
    if (query.search) next.set("search", query.search)
    if (query.status) next.set("status", query.status)
    if (page > 1) next.set("page", String(page))
    const suffix = next.toString()
    return suffix ? `/dashboard/campaigns?${suffix}` : "/dashboard/campaigns"
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Promotional pages for {context.businessName}. Drafts stay private until you
            publish them.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/dashboard/campaigns/new">
              <Plus className="size-4" aria-hidden /> New campaign
            </Link>
          </Button>
        )}
      </div>

      <Card size="sm">
        <CardContent className="space-y-4">
          <CampaignFilters
            defaultSearch={query.search ?? ""}
            defaultStatus={query.status ?? "all"}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {result.total} campaign{result.total === 1 ? "" : "s"}
              {hasFilters ? " matching your filters" : ""}
            </span>
            <span>
              {usage.campaignLimit === null
                ? "Unlimited campaigns on your plan"
                : `${usage.campaignsUsed} of ${usage.campaignLimit} campaigns used`}
              {usage.planName ? ` · ${usage.planName} plan` : ""}
            </span>
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title={hasFilters ? "No campaigns match those filters" : "No campaigns yet"}
              description={
                hasFilters
                  ? "Try a different status or clear the search to see all campaigns."
                  : "Create your first campaign to publish a shareable promotional page for your product or offer."
              }
              action={
                canManage && !hasFilters
                  ? { href: "/dashboard/campaigns/new", label: "Create your first campaign" }
                  : undefined
              }
              hint={hasFilters ? "Adjust the filters above." : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Objective</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {campaign.coverImageUrl ? (
                            <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                              <Image
                                src={publicImageSrc(campaign.coverImageUrl)}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                              <Megaphone className="size-4 text-muted-foreground" aria-hidden />
                            </span>
                          )}
                          <div className="min-w-0 space-y-0.5">
                            <Link
                              href={`/dashboard/campaigns/${campaign.id}`}
                              className="block truncate text-sm font-medium hover:underline"
                            >
                              {campaign.name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {[
                                campaign.industry?.name,
                                campaign.priceDisplay,
                                campaign.headline,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "No industry set"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CampaignStatusBadge status={campaign.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{OBJECTIVE_LABELS[campaign.objective]}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{campaign.leadCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(campaign.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/campaigns/${campaign.id}`}>View</Link>
                        </Button>
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
                    <Link href={pageHref(result.page - 1)}>
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
                    <Link href={pageHref(result.page + 1)}>
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
