import { prisma } from "@/lib/prisma"

/**
 * Subscription plans. The pricing pages read this catalog; amounts are
 * integer paise (INR) — never floats.
 */

export interface PublicPlan {
  id: string
  slug: string
  name: string
  description: string | null
  amountInPaise: number
  currency: string
  interval: "MONTHLY" | "YEARLY"
  features: unknown
  isFeatured: boolean
}

export async function getActivePlans(): Promise<PublicPlan[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })

  return plans.map((plan) => ({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    amountInPaise: plan.amount,
    currency: plan.currency,
    interval: plan.interval,
    features: plan.features,
    isFeatured: plan.isFeatured,
  }))
}

/** The business's current subscription + plan label (null = none on record). */
export async function getBusinessSubscription(
  businessId: string,
): Promise<{ status: string; planName: string } | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
    select: { status: true, plan: { select: { name: true } } },
  })
  if (!subscription) return null
  return { status: subscription.status, planName: subscription.plan.name }
}

/** Formats paise as ₹ display text: 99900 → "₹999". */
export function formatInr(amountInPaise: number): string {
  const rupees = amountInPaise / 100
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}
