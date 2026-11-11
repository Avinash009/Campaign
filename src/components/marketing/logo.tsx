import Link from "next/link"
import { Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  /** Compact hides the wordmark (used in tight spaces). */
  compact?: boolean
}

/** CampaignHub wordmark: indigo badge + white megaphone. */
export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="CampaignHub home">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Megaphone className="size-4" aria-hidden />
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          CampaignHub
        </span>
      )}
    </Link>
  )
}
