"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LEAD_STATUSES } from "@/modules/leads/schemas"
import { LEAD_STATUS_LABELS } from "@/modules/leads/labels"
import type { LeadAssignee, LeadCampaignOption } from "@/modules/leads/types"

interface LeadFiltersProps {
  defaultSearch: string
  defaultStatus: string
  defaultCampaignId: string
  defaultAssignedTo: string
  defaultFrom: string
  defaultTo: string
  campaigns: LeadCampaignOption[]
  assignees: LeadAssignee[]
  canAssign: boolean
}

interface FilterState {
  search: string
  status: string
  campaignId: string
  assignedTo: string
  from: string
  to: string
}

/** List toolbar: search, status, campaign, assignee and date filters in the URL. */
export function LeadFilters({
  defaultSearch,
  defaultStatus,
  defaultCampaignId,
  defaultAssignedTo,
  defaultFrom,
  defaultTo,
  campaigns,
  assignees,
  canAssign,
}: LeadFiltersProps) {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterState>({
    search: defaultSearch,
    status: defaultStatus || "all",
    campaignId: defaultCampaignId || "all",
    assignedTo: defaultAssignedTo || "all",
    from: defaultFrom,
    to: defaultTo,
  })

  const hasFilters =
    Boolean(filters.search) ||
    filters.status !== "all" ||
    filters.campaignId !== "all" ||
    filters.assignedTo !== "all" ||
    Boolean(filters.from) ||
    Boolean(filters.to)

  function apply(next: Partial<FilterState>) {
    const merged = { ...filters, ...next }
    setFilters(merged)

    const params = new URLSearchParams()
    if (merged.search.trim()) params.set("search", merged.search.trim())
    if (merged.status !== "all") params.set("status", merged.status)
    if (merged.campaignId !== "all") params.set("campaignId", merged.campaignId)
    if (merged.assignedTo !== "all") params.set("assignedTo", merged.assignedTo)
    if (merged.from) params.set("from", merged.from)
    if (merged.to) params.set("to", merged.to)

    const query = params.toString()
    router.push(query ? `/dashboard/leads?${query}` : "/dashboard/leads")
  }

  return (
    <div className="space-y-3">
      <form
        className="flex flex-1 items-center gap-2"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          apply({ search: filters.search })
        }}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Search name, phone, email, city or message"
            aria-label="Search leads"
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => apply({ status: value })}
          >
            <SelectTrigger className="w-full" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {LEAD_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Campaign</Label>
          <Select
            value={filters.campaignId}
            onValueChange={(value) => apply({ campaignId: value })}
          >
            <SelectTrigger className="w-full" aria-label="Filter by campaign">
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

        {canAssign && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Assigned to</Label>
            <Select
              value={filters.assignedTo}
              onValueChange={(value) => apply({ assignedTo: value })}
            >
              <SelectTrigger className="w-full" aria-label="Filter by assignee">
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone</SelectItem>
                <SelectItem value="me">Me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="lead-from" className="text-xs text-muted-foreground">
            Received from
          </Label>
          <Input
            id="lead-from"
            type="date"
            value={filters.from}
            onChange={(event) => apply({ from: event.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="lead-to" className="text-xs text-muted-foreground">
            Received until
          </Label>
          <Input
            id="lead-to"
            type="date"
            value={filters.to}
            onChange={(event) => apply({ to: event.target.value })}
          />
        </div>
      </div>

      {hasFilters && (
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/leads">Clear filters</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
