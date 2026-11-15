import { CircleAlert, Info, Lightbulb, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CampaignReviewResult } from "@/modules/ai/service"
import type { AiCampaignSuggestion } from "@/modules/ai"

/**
 * Rule-based campaign review (Phase 7 task 7.3).
 *
 * Every suggestion is derived from the campaign's own fields and its measured
 * first-party landing-page activity. There is no model call and no forecast, so
 * the card is labelled as rule-based rather than AI-generated.
 */

const SEVERITY_STYLES: Record<
  AiCampaignSuggestion["severity"],
  { icon: typeof Info; className: string; label: string }
> = {
  warning: { icon: CircleAlert, className: "text-amber-600", label: "Fix this" },
  improvement: { icon: Lightbulb, className: "text-primary", label: "Improve" },
  info: { icon: Info, className: "text-muted-foreground", label: "Note" },
}

export function CampaignReviewCard({ review }: { review: CampaignReviewResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          Campaign review
          <Badge variant="secondary" className="font-normal">
            <ShieldCheck className="size-3" aria-hidden /> Rule-based
          </Badge>
        </CardTitle>
        <CardDescription>
          Checks this campaign&apos;s content and its {review.periodLabel.toLowerCase()} of
          landing-page activity. No prediction or hidden scoring — each point below points at a
          field or a measured number.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {review.suggestions.map((suggestion) => {
            const style = SEVERITY_STYLES[suggestion.severity]
            const Icon = style.icon
            return (
              <li key={suggestion.title} className="flex items-start gap-3">
                <Icon className={`mt-0.5 size-4 shrink-0 ${style.className}`} aria-hidden />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {suggestion.title}
                    <span className="sr-only"> ({style.label})</span>
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {suggestion.detail}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
