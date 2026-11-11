import { Badge } from "@/components/ui/badge"
import type { CampaignStatus, LeadStatus } from "@prisma/client"

/**
 * Status → badge-variant mapping (see docs/UI_DESIGN.md §5).
 * Presentation only; the status values themselves come from Prisma enums.
 */

const CAMPAIGN_STATUS_STYLES: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  ACTIVE: { label: "Active", className: "bg-emerald-500/10 text-emerald-700" },
  PAUSED: { label: "Paused", className: "bg-amber-500/10 text-amber-700" },
  COMPLETED: { label: "Completed", className: "bg-sky-500/10 text-sky-700" },
  ARCHIVED: { label: "Archived", className: "bg-secondary text-secondary-foreground" },
}

const LEAD_STATUS_STYLES: Record<LeadStatus, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-primary/10 text-primary" },
  CONTACTED: { label: "Contacted", className: "bg-sky-500/10 text-sky-700" },
  INTERESTED: { label: "Interested", className: "bg-violet-500/10 text-violet-700" },
  QUALIFIED: { label: "Qualified", className: "bg-amber-500/10 text-amber-700" },
  CONVERTED: { label: "Converted", className: "bg-emerald-500/10 text-emerald-700" },
  LOST: { label: "Lost", className: "bg-destructive/10 text-destructive" },
}

function StatusBadge({ config }: { config: { label: string; className: string } }) {
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  )
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config = CAMPAIGN_STATUS_STYLES[status] ?? { label: status, className: "" }
  return <StatusBadge config={config} />
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = LEAD_STATUS_STYLES[status] ?? { label: status, className: "" }
  return <StatusBadge config={config} />
}
