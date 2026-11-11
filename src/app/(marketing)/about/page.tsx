import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { HeartHandshake, ShieldCheck, Target } from "lucide-react"

export const metadata: Metadata = {
  title: "About",
  description: "Why CampaignHub exists and the principles we build by.",
}

const VALUES = [
  {
    icon: Target,
    title: "Simplicity over clutter",
    description:
      "Small businesses do not need another enterprise maze. Every screen answers one question: what do I do next with my customers?",
  },
  {
    icon: ShieldCheck,
    title: "Honest software",
    description:
      "We do not simulate integrations. If a feature is not connected to a real service, it says so — clearly — until it is.",
  },
  {
    icon: HeartHandshake,
    title: "Customer data with respect",
    description:
      "Each business's data stays isolated. Enquiry forms never ask for bank passwords or government IDs, and always explain what the data is used for.",
  },
] as const

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="mb-12 max-w-2xl space-y-4">
        <p className="text-sm font-medium text-primary">About us</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Built for businesses that win customers one conversation at a time
        </h1>
        <p className="text-lg text-muted-foreground">
          CampaignHub started with a simple observation: most businesses
          advertise well but lose customers in the chaos that follows — missed
          calls, buried messages, forgotten follow-ups. We build the other half
          of advertising: turning attention into enquiries, and enquiries into
          customers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {VALUES.map((value) => (
          <Card key={value.title} size="sm">
            <CardContent className="space-y-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <value.icon className="size-4" aria-hidden />
              </span>
              <h2 className="font-medium">{value.title}</h2>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-10" size="sm">
        <CardContent className="space-y-3">
          <h2 className="font-medium">Where we are on the journey</h2>
          <p className="text-sm text-muted-foreground">
            Today, CampaignHub covers business profiles, campaign landing
            pages, enquiry collection and lead management. Advertising-platform
            publishing, AI assistance and automated email delivery are on our
            roadmap — and when they ship, they will be real integrations, not
            promises.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild>
              <Link href="/features">See current features</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
