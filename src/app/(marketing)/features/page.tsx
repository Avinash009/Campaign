import type { Metadata } from "next"
import Link from "next/link"
import {
  BarChart3,
  Building2,
  CalendarClock,
  Camera,
  ClipboardList,
  FileDown,
  LayoutTemplate,
  Megaphone,
  MessageSquareText,
  Phone,
  Search,
  UserCheck,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Features",
  description:
    "Campaign builder, industry landing pages, lead inbox, team roles and honest analytics — what CampaignHub does today.",
}

const FEATURE_GROUPS = [
  {
    heading: "Campaigns & landing pages",
    features: [
      {
        icon: Megaphone,
        title: "Campaign builder",
        description:
          "Name, describe and schedule campaigns. Set objectives, target location and audience, then publish when ready.",
      },
      {
        icon: LayoutTemplate,
        title: "Industry-tailored pages",
        description:
          "Promotional sections shaped per industry — property details for real estate, eligibility for finance, course info for education.",
      },
      {
        icon: Camera,
        title: "Images & video",
        description:
          "Upload offer images (JPG, PNG, WebP up to 5 MB each) and link a video to showcase what you are promoting.",
      },
      {
        icon: Building2,
        title: "Public campaign URLs",
        description:
          "Every campaign gets its own link like /c/your-offer to share on WhatsApp, posters, or anywhere you advertise.",
      },
      {
        icon: CalendarClock,
        title: "Lifecycle controls",
        description:
          "Preview drafts, publish, pause, complete and archive — with validation so published pages never miss required details.",
      },
    ],
  },
  {
    heading: "Leads & teamwork",
    features: [
      {
        icon: ClipboardList,
        title: "Structured lead inbox",
        description:
          "Every enquiry arrives with name, phone, city, message and campaign source — searchable and filterable.",
      },
      {
        icon: UserCheck,
        title: "Status pipeline",
        description:
          "Move leads through New, Contacted, Interested, Qualified, Converted or Lost — with a full activity trail.",
      },
      {
        icon: Users,
        title: "Team roles",
        description:
          "Owners and admins manage everything; members work their assigned leads. Every action is logged.",
      },
      {
        icon: Phone,
        title: "One-click contact",
        description:
          "Call, email or open a WhatsApp chat directly from a lead — links open your own apps, so nothing is sent secretly.",
      },
      {
        icon: Search,
        title: "Follow-ups & export",
        description:
          "Schedule follow-up dates, add internal notes and export filtered leads to CSV for reporting.",
      },
    ],
  },
  {
    heading: "Analytics",
    features: [
      {
        icon: BarChart3,
        title: "Landing-page analytics",
        description:
          "Page views, unique visitors and enquiries per campaign, measured from real visits to your published pages.",
      },
      {
        icon: MessageSquareText,
        title: "Conversion tracking",
        description:
          "See enquiry conversion (leads ÷ unique visitors) by campaign and over time — no vanity metrics.",
      },
      {
        icon: FileDown,
        title: "Reports you can act on",
        description:
          "Filter by date and campaign to find what is working and where to improve.",
      },
    ],
  },
] as const

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="mb-14 max-w-2xl space-y-4">
        <p className="text-sm font-medium text-primary">Features</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Everything your promotions need — nothing they don&apos;t
        </h1>
        <p className="text-lg text-muted-foreground">
          CampaignHub focuses on the loop that matters: publish an offer,
          capture the enquiry, close the customer.
        </p>
      </div>

      <div className="space-y-14">
        {FEATURE_GROUPS.map((group) => (
          <section key={group.heading} className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">{group.heading}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {group.features.map((feature) => (
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
        ))}
      </div>

      {/* Honest scope note */}
      <Card className="mt-14">
        <CardHeader>
          <CardTitle>What CampaignHub does not do (yet)</CardTitle>
          <CardDescription>
            We would rather tell you plainly than oversell.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <Badge variant="outline" className="mr-2 text-muted-foreground">Not included</Badge>
            Placing or managing ads on Google, Meta or other ad platforms. Your
            campaign page is yours to share wherever you like.
          </p>
          <p>
            <Badge variant="outline" className="mr-2 text-muted-foreground">Not included</Badge>
            Automated email delivery to your leads. Email sending arrives with a
            real provider integration — until then, contact actions are links
            that open your own email or chat apps.
          </p>
          <p>
            <Badge variant="outline" className="mr-2 text-muted-foreground">Roadmap</Badge>
            AI assistance for ad copy, campaign improvements and lead
            qualification — planned, and only shipping as real integrations.
          </p>
        </CardContent>
      </Card>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/register">Start free</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/pricing">View pricing</Link>
        </Button>
      </div>
    </div>
  )
}
