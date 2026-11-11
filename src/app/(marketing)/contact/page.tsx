import type { Metadata } from "next"
import { Mail, MessageCircle, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the CampaignHub team.",
}

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    title: "Email us",
    description: "The most reliable way to reach us — we reply to every message.",
    action: { label: "hello@campaignhub.app", href: "mailto:hello@campaignhub.app" },
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "For quick questions during business hours.",
    action: { label: "Chat with us", href: "https://wa.me/919000000000" },
  },
  {
    icon: Clock,
    title: "Response time",
    description: "We usually respond within one business day (Mon–Sat, IST).",
    action: null,
  },
] as const

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="mb-12 max-w-2xl space-y-4">
        <p className="text-sm font-medium text-primary">Contact</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Talk to the people building CampaignHub
        </h1>
        <p className="text-lg text-muted-foreground">
          Questions about whether it fits your business? Tell us what you sell
          and we will show you how a campaign page would look.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {CONTACT_CHANNELS.map((channel) => (
          <Card key={channel.title} size="sm" className="h-full">
            <CardContent className="space-y-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <channel.icon className="size-4" aria-hidden />
              </span>
              <h2 className="font-medium">{channel.title}</h2>
              <p className="text-sm text-muted-foreground">{channel.description}</p>
              {channel.action && (
                <a
                  href={channel.action.href}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {channel.action.label}
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-10" size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            A note on this page
            <Badge variant="outline" className="text-muted-foreground">Honest scope</Badge>
          </CardTitle>
          <CardDescription>
            Why there is no contact form here yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Contact forms that quietly store messages without delivering them
            anywhere are worse than no form. Until our email integration is
            live, this page offers direct contact links — they open your own
            email or chat app, and nothing is sent on your behalf behind the
            scenes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
