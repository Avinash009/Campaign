"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CAMPAIGN_STATUSES } from "@/modules/campaigns/schemas"

const STATUS_LABELS: Record<(typeof CAMPAIGN_STATUSES)[number], string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
}

interface AdminCampaignFiltersProps {
  defaultSearch: string
  defaultStatus: string
}

/** Platform campaign monitor toolbar: search + status filter. */
export function AdminCampaignFilters({
  defaultSearch,
  defaultStatus,
}: AdminCampaignFiltersProps) {
  const router = useRouter()
  const [search, setSearch] = useState(defaultSearch)
  const [status, setStatus] = useState(defaultStatus || "all")

  function apply(nextStatus: string, nextSearch: string) {
    const params = new URLSearchParams()
    const trimmed = nextSearch.trim()
    if (trimmed) params.set("search", trimmed)
    if (nextStatus !== "all") params.set("status", nextStatus)
    const query = params.toString()
    router.push(query ? `/admin/campaigns?${query}` : "/admin/campaigns")
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        className="flex flex-1 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          apply(status, search)
        }}
        role="search"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaigns or businesses"
            aria-label="Search campaigns"
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <Select
        value={status}
        onValueChange={(value) => {
          setStatus(value)
          apply(value, search)
        }}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {CAMPAIGN_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
