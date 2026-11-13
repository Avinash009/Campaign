import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Download, Inbox, Users } from "lucide-react"
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
import { EmptyState } from "@/components/shared/empty-state"
import { LeadStatusBadge } from "@/components/shared/status-badge"
import { LeadFilters } from "@/components/leads/lead-filters"
import { requireBusinessContext } from "@/modules/auth/session"
import { canWriteCampaigns, isManager } from "@/modules/auth/rbac"
import { LEAD_SOURCE_LABELS } from "@/modules/leads/labels"
import {
  leadFiltersToSearchParams,
  parseLeadListQuery,
} from "@/modules/leads/schemas"
import { getLeadFilterOptions, getLeadList } from "@/modules/leads/service"
import { isFollowUpOverdue } from "@/modules/leads/helpers"
import { formatDate, formatPhone } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Leads",
}

/** Lead inbox with search, filters, pagination and CSV export (Phase 4). */
export default async function LeadsPage({ searchParams }: PageProps<"/dashboard/leads">) {
  const context = await requireBusinessContext()
  const params = await searchParams
  const query = parseLeadListQuery(params)
  const manager = isManager(context.role)
  const canCreateCampaigns = canWriteCampaigns(context.role)

  const [result, options] = await Promise.all([
    getLeadList(context, query),
    getLeadFilterOptions(context),
  ])

  const hasFilters =
    Boolean(query.search) ||
    Boolean(query.status) ||
    Boolean(query.campaignId) ||
    Boolean(query.assignedTo) ||
    Boolean(query.from) ||
    Boolean(query.to)

  const exportParams = leadFiltersToSearchParams(query)
  const exportHref = exportParams.toString()
    ? `/api/leads/export?${exportParams.toString()}`
    : "/api/leads/export"

  function pageHref(page: number) {
    const next = leadFiltersToSearchParams(query)
    if (page > 1) next.set("page", String(page))
    if (query.pageSize !== 20) next.set("pageSize", String(query.pageSize))
    const search = next.toString()
    return search ? `/dashboard/leads?${search}` : "/dashboard/leads"
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} {result.total === 1 ? "lead" : "leads"}
            {manager ? " across your campaigns." : " assigned to you."}
            {!manager && (
              <span className="ml-1">Owners and admins can see the full team inbox.</span>
            )}
          </p>
        </div>

        <Button variant="outline" asChild>
          <a href={exportHref} download>
            <Download className="size-4" aria-hidden /> Export CSV
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <LeadFilters
            defaultSearch={query.search ?? ""}
            defaultStatus={query.status ?? ""}
            defaultCampaignId={query.campaignId ?? ""}
            defaultAssignedTo={query.assignedTo ?? ""}
            defaultFrom={query.from ?? ""}
            defaultTo={query.to ?? ""}
            campaigns={options.campaigns}
            assignees={options.assignees}
            canAssign={manager}
          />

          {result.items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={hasFilters ? "No leads match these filters" : "No leads yet"}
              description={
                hasFilters
                  ? "Try a different status, campaign or date range, or clear the filters."
                  : "Publish a campaign page and share its public link. Enquiries submitted there appear here automatically."
              }
              action={
                !hasFilters && canCreateCampaigns
                  ? { href: "/dashboard/campaigns", label: "Go to campaigns" }
                  : undefined
              }
              hint={
                hasFilters
                  ? "Adjust the filters above."
                  : canCreateCampaigns
                    ? undefined
                    : "Ask an owner or admin to share a campaign link."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Next follow-up</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((lead) => {
                    const overdue = isFollowUpOverdue(lead.nextFollowUpAt)
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="min-w-0 space-y-0.5">
                            <Link
                              href={`/dashboard/leads/${lead.id}`}
                              className="block truncate text-sm font-medium hover:underline"
                            >
                              {lead.name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {[formatPhone(lead.phone), lead.city, lead.interestedIn]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.campaign ? (
                            <Link
                              href={`/dashboard/campaigns/${lead.campaign.id}`}
                              className="block max-w-48 truncate text-sm hover:underline"
                            >
                              {lead.campaign.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">Direct</span>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {LEAD_SOURCE_LABELS[lead.source]}
                          </p>
                        </TableCell>
                        <TableCell>
                          <LeadStatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {lead.assignedTo?.name ?? (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={
                            overdue
                              ? "text-sm font-medium text-destructive"
                              : "text-sm text-muted-foreground"
                          }
                        >
                          {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : "—"}
                          {overdue && <span className="block text-xs">Overdue</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(lead.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/leads/${lead.id}`}>View</Link>
                          </Button>
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
                Page {result.page} of {result.totalPages} · {result.total}{" "}
                {result.total === 1 ? "lead" : "leads"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={result.page <= 1}
                  asChild={result.page > 1}
                >
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

          {result.items.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              Exports include the same filters and cap at 5,000 leads.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
