import { Flame, ShieldCheck, Snowflake, Sun } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { LeadQualificationResult } from "@/modules/ai/service"

/**
 * Transparent rule-based lead qualification (Phase 7 task 7.4).
 *
 * The score is a fixed, explainable sum over the lead's own fields — no model
 * call, no probability. Every point is listed so a teammate can disagree with a
 * reason instead of trusting a black box.
 */

const CATEGORY_STYLES = {
  hot: {
    label: "Hot",
    icon: Flame,
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    bar: "bg-rose-500",
  },
  warm: {
    label: "Warm",
    icon: Sun,
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  cold: {
    label: "Cold",
    icon: Snowflake,
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    bar: "bg-sky-500",
  },
} as const

export function LeadQualificationCard({ result }: { result: LeadQualificationResult }) {
  const { qualification } = result
  const style = CATEGORY_STYLES[qualification.category]
  const Icon = style.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          Lead qualification
          <Badge variant="secondary" className="font-normal">
            <ShieldCheck className="size-3" aria-hidden /> Rule-based
          </Badge>
        </CardTitle>
        <CardDescription>
          A fixed score over this lead&apos;s own details. Every point is listed below — no
          prediction and no hidden weighting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}
          >
            <Icon className="size-3.5" aria-hidden /> {style.label}
          </span>
          <span className="text-sm font-medium">{qualification.score} / 100</span>
        </div>

        <div
          role="img"
          aria-label={`Qualification score ${qualification.score} out of 100`}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={`h-full rounded-full ${style.bar}`}
            style={{ width: `${qualification.score}%` }}
          />
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">How the score is built</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {qualification.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Questions worth asking</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {qualification.suggestedQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-muted-foreground">
          Update the lead&apos;s status or details and this score changes. Use it to decide who to
          call first, not as a forecast of whether the customer will buy.
        </p>
      </CardContent>
    </Card>
  )
}
