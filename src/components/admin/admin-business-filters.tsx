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

const STATUS_LABELS = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
} as const

interface AdminBusinessFiltersProps {
  defaultSearch: string
  defaultStatus: string
}

/** Business directory toolbar: search + status filter, mirrored in the URL. */
export function AdminBusinessFilters({ defaultSearch, defaultStatus }: AdminBusinessFiltersProps) {
  const router = useRouter()
  const [search, setSearch] = useState(defaultSearch)
  const [status, setStatus] = useState(defaultStatus || "all")

  function apply(nextStatus: string, nextSearch: string) {
    const params = new URLSearchParams()
    const trimmed = nextSearch.trim()
    if (trimmed) params.set("search", trimmed)
    if (nextStatus !== "all") params.set("status", nextStatus)
    const query = params.toString()
    router.push(query ? `/admin/businesses?${query}` : "/admin/businesses")
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
            placeholder="Search businesses, owners or emails"
            aria-label="Search businesses"
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
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="SUSPENDED">Suspended</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export const ADMIN_BUSINESS_STATUS_LABELS = STATUS_LABELS
