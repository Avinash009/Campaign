import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatInr, type PublicPlan } from "@/modules/subscriptions/service"
import { cn } from "@/lib/utils"

interface PlanCardsProps {
  plans: PublicPlan[]
}

/** Pricing plan grid fed by the live plan catalog (docs/UI_DESIGN.md §6). */
export function PlanCards({ plans }: PlanCardsProps) {
  if (plans.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        Plans are unavailable right now. Please check back shortly.
      </p>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={cn(
            "relative",
            plan.isFeatured && "ring-2 ring-primary",
          )}
        >
          {plan.isFeatured && (
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">Most popular</Badge>
          )}
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold tracking-tight">
              {formatInr(plan.amountInPaise)}
              <span className="text-sm font-normal text-muted-foreground"> /{plan.interval === "MONTHLY" ? "month" : "year"}</span>
            </p>
            <ul className="space-y-2.5 text-sm">
              {renderFeatures(plan)}
            </ul>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button className="w-full" variant={plan.isFeatured ? "default" : "outline"} asChild>
              <a href="/register">Get started</a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function renderFeatures(plan: PublicPlan) {
  const features = Array.isArray(plan.features) ? (plan.features as unknown[]) : []
  if (features.length === 0) {
    return <li className="text-muted-foreground">Plan details coming soon.</li>
  }
  return features.map((feature, index) => (
    <li key={index} className="flex items-start gap-2">
      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>{String(feature)}</span>
    </li>
  ))
}
