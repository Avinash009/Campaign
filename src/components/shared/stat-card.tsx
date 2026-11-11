import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  description?: string
}

/** Dashboard summary stat card (count + label + icon). */
export function StatCard({ label, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </CardContent>
    </Card>
  )
}
