import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  LayoutTemplate,
  Megaphone,
  MessageSquareText,
  Plus,
  Share2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { PlanCards } from "@/components/marketing/plan-cards"
import { IndustryIcon } from "@/components/shared/industry-icon"
import { getActiveIndustries } from "@/modules/industries/service"
import { getActivePlans } from "@/modules/subscriptions/service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Smarter advertising & lead generation for your business",
  description:
    "Create promotional campaigns, publish landing pages, collect customer enquiries and manage leads to closure — all in one place.",
}

const HOW_IT_WORKS = [
  {
    title: "Create your business profile",
    description:
      "Sign up, tell us about your business and pick your industry. Your dashboard is ready in minutes.",
  },
  {
    title: "Launch a campaign landing page",
    description:
      "Describe your product or offer, add images and a call-to-action. Publish a shareable page at its own URL.",
  },
  {
    title: "Collect and manage leads",
    description:
      "Enquiries arrive as structured leads. Track every status, assign follow-ups and close more deals.",
  },
] as const

const KEY_FEATURES = [
  {
    icon: LayoutTemplate,
    title: "Industry-tailored landing pages",
    description:
      "Promotional pages shaped for real estate, finance, education, healthcare, retail and more — from one campaign builder.",
  },
  {
    icon: Megaphone,
    title: "Campaign management",
    description:
      "Create, preview, publish, pause and archive campaigns with start dates, objectives and offers.",
  },
  {
    icon: ClipboardList,
    title: "Lead inbox that works",
    description:
      "Every enquiry becomes a lead with name, phone, city and message — searchable, filterable and exportable.",
  },
  {
    icon: Users,
    title: "Team roles & assignment",
    description:
      "Invite your team, assign leads and follow the full history of every conversation in one timeline.",
  },
  {
    icon: BarChart3,
    title: "Honest analytics",
    description:
      "See page views, unique visitors and enquiry conversion — measured from real landing-page activity.",
  },
  {
    icon: Share2,
    title: "Shareable public URLs",
    description:
      "Every campaign gets a clean link like campaignhub.app/c/your-offer — share it anywhere you advertise.",
  },
] as const

const FAQS = [
  {
    question: "Does CampaignHub publish ads to Google or Meta for me?",
    answer:
      "No. In this release, CampaignHub creates promotional landing pages with shareable URLs and collects the enquiries they generate. It does not place or manage ads on Google, Meta or any ad platform, and we will not claim otherwise until a real integration ships.",
  },
  {
    question: "What does a campaign landing page include?",
    answer:
      "A headline, your offer and product details, images, optional video and pricing, your contact details and an enquiry form. Content sections adapt to your industry — for example property details for real estate or course information for education.",
  },
  {
    question: "How do I get the enquiries?",
    answer:
      "Enquiries appear instantly in your lead dashboard with the customer's name, phone, city and message. You can call, email or message them with one click, and track their status from New to Converted.",
  },
  {
    question: "What does it cost?",
    answer:
      "You can start free. Paid plans add higher campaign limits and team seats — see the pricing above. All prices are in Indian rupees.",
  },
  {
    question: "Is my customer data safe?",
    answer:
      "Each business's data is isolated and only visible to its own team. Enquiry forms never ask for bank details, passwords or government IDs, and every form shows a clear privacy notice.",
  },
] as const

const DEMO_STORIES = [
  {
    business: "Metro property advisors",
    industry: "Real estate",
    quote:
      "Our site-visit enquiries stopped getting lost in WhatsApp. Every walk-in request lands as a lead with a follow-up date.",
    person: "Sales head (demo)",
  },
  {
    business: "City coaching classes",
    industry: "Education",
    quote:
      "We shared the campaign link before admissions season and tracked exactly how many visitors turned into admission enquiries.",
    person: "Owner (demo)",
  },
] as const

export default async function HomePage() {
  const [industries, plans] = await Promise.all([
    getActiveIndustries().catch((error) => {
      logger.warn("home.industries_unavailable", { error: String(error) })
      return []
    }),
    getActivePlans().catch((error) => {
      logger.warn("home.plans_unavailable", { error: String(error) })
      return []
    }),
  ])

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/60 to-background">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <div className="space-y-6">
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              Advertising & lead generation, simplified
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Grow your business with smarter advertising & lead generation
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">
              CampaignHub turns your offers into promotional landing pages,
              collects customer enquiries as structured leads, and helps your
              team follow every conversation through to closure.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  Start free <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/features">Explore features</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required · Prices in ₹ (INR)
            </p>
          </div>

          <HeroPanel />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <SectionHeading
          kicker="How it works"
          title="From offer to closed customer in three steps"
          description="Everything lives in one dashboard — no spreadsheets, no lost WhatsApp messages."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <Card key={step.title} size="sm">
              <CardContent className="space-y-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
                  {index + 1}
                </span>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Industries */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <SectionHeading
            kicker="Industries"
            title="Built for how your industry sells"
            description="Landing-page sections adapt to what your customers need to know."
          />
          {industries.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {industries.map((industry) => (
                <Link
                  key={industry.id}
                  href="/industries"
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <IndustryIcon iconKey={industry.iconKey} className="size-5 text-primary" />
                  {industry.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
              The industry catalog is being set up. Please check back shortly.
            </p>
          )}
        </div>
      </section>

      {/* Key features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <SectionHeading
          kicker="Key features"
          title="Everything you need to run promotions"
          description="Campaigns, landing pages, leads and analytics in one workspace."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {KEY_FEATURES.map((feature) => (
            <Card key={feature.title} size="sm">
              <CardContent className="space-y-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <feature.icon className="size-4" aria-hidden />
                </span>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Success stories — clearly labelled demo content */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <SectionHeading
            kicker="Customer success stories"
            title="How teams use CampaignHub"
            description="Illustrative examples of the workflow in action."
          />
          <div className="grid gap-6 md:grid-cols-2">
            {DEMO_STORIES.map((story) => (
              <Card key={story.business} size="sm">
                <CardContent className="space-y-4">
                  <Badge variant="outline" className="text-muted-foreground">
                    Demo content
                  </Badge>
                  <blockquote className="text-sm leading-relaxed text-pretty">
                    “{story.quote}”
                  </blockquote>
                  <div className="text-sm">
                    <p className="font-medium">{story.business}</p>
                    <p className="text-muted-foreground">
                      {story.industry} · {story.person}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <SectionHeading
          kicker="Pricing plans"
          title="Simple pricing that grows with you"
          description="Start free, upgrade when your campaigns do. All amounts in ₹ (INR)."
        />
        <PlanCards plans={plans} />
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
        <SectionHeading
          kicker="FAQ"
          title="Questions, answered honestly"
          description="What CampaignHub does today — and what it does not."
        />
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA band */}
      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Ready to turn your next offer into leads?
          </h2>
          <p className="max-w-xl text-primary-foreground/80">
            Create your business profile and publish your first campaign page
            today.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                <Plus className="size-4" aria-hidden /> Start free
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

function SectionHeading({
  kicker,
  title,
  description,
}: {
  kicker: string
  title: string
  description: string
}) {
  return (
    <div className="mb-10 max-w-2xl space-y-3">
      <p className="text-sm font-medium text-primary">{kicker}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

/** Stylised product illustration for the hero (decorative, not real data). */
function HeroPanel() {
  return (
    <div className="relative" aria-hidden>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-destructive/40" />
          <span className="size-2.5 rounded-full bg-amber-500/40" />
          <span className="size-2.5 rounded-full bg-emerald-500/40" />
          <span className="ml-3 truncate rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
            campaignhub.app/c/your-next-offer
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Megaphone, label: "Active campaigns", value: "12" },
            { icon: MessageSquareText, label: "New leads", value: "38" },
            { icon: Building2, label: "Leads converted", value: "9" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border p-3">
              <stat.icon className="mb-2 size-4 text-primary" />
              <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-2.5 w-24 rounded bg-muted-foreground/20" />
            <div className="h-2.5 w-12 rounded bg-muted-foreground/10" />
          </div>
          <div className="flex h-24 items-end gap-2">
            {[35, 55, 40, 70, 50, 85, 65, 95, 75, 60].map((height, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-primary/70"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {["Priya S. — Enquired about 2BHK", "Rahul M. — Requested callback"].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
            >
              <span className="text-xs text-muted-foreground">{row}</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                New
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Illustrative dashboard preview
      </p>
    </div>
  )
}
