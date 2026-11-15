"use client"

import { CalendarClock, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react"
import { CopyButton } from "@/components/ai/copy-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate, phoneTelHref, phoneWhatsAppHref } from "@/lib/format"
import type { AiFollowUpMessage, AiFollowUpPlan } from "@/modules/ai"
import type { LeadFollowUpResult } from "@/modules/ai/service"

/**
 * Rule-based follow-up assistant (Phase 7 task 7.5).
 *
 * Drafts are composed from the lead's own details. CampaignHub never sends
 * them: the user copies the text or opens their own phone, WhatsApp or email
 * app. Nothing here is a delivery receipt.
 */

const PRIORITY_STYLES: Record<
  AiFollowUpPlan["priority"],
  { label: string; variant: "destructive" | "default" | "outline" }
> = {
  high: { label: "High priority", variant: "destructive" },
  medium: { label: "Medium priority", variant: "default" },
  low: { label: "Low priority", variant: "outline" },
}

const CHANNEL_ICONS = {
  CALL: Phone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
} as const

function ChannelAction({
  message,
  phone,
  email,
}: {
  message: AiFollowUpMessage
  phone: string
  email: string | null
}) {
  if (message.channel === "CALL") {
    return (
      <Button size="sm" variant="outline" asChild>
        <a href={phoneTelHref(phone)}>
          <Phone className="size-3.5" aria-hidden /> Open dialler
        </a>
      </Button>
    )
  }

  if (message.channel === "WHATSAPP") {
    return (
      <Button size="sm" variant="outline" asChild>
        <a
          href={`${phoneWhatsAppHref(phone)}?text=${encodeURIComponent(message.body)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle className="size-3.5" aria-hidden /> Open in WhatsApp
        </a>
      </Button>
    )
  }

  if (!email) return null
  return (
    <Button size="sm" variant="outline" asChild>
      <a
        href={`mailto:${email}?subject=${encodeURIComponent(
          message.subject ?? "",
        )}&body=${encodeURIComponent(message.body)}`}
      >
        <Mail className="size-3.5" aria-hidden /> Open in email app
      </a>
    </Button>
  )
}

interface LeadFollowUpCardProps {
  result: LeadFollowUpResult
  phone: string
  email: string | null
  nextFollowUpAt: Date | null
}

export function LeadFollowUpCard({
  result,
  phone,
  email,
  nextFollowUpAt,
}: LeadFollowUpCardProps) {
  const { plan } = result
  const priority = PRIORITY_STYLES[plan.priority]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          Follow-up assistant
          <Badge variant="secondary" className="font-normal">
            <ShieldCheck className="size-3" aria-hidden /> Rule-based
          </Badge>
          <Badge variant={priority.variant}>{priority.label}</Badge>
        </CardTitle>
        <CardDescription>
          Drafted from this lead&apos;s details. CampaignHub does not send anything — copy a
          draft or open it in your own app and press send yourself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">{plan.summary}</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">Next action</dt>
              <dd className="mt-0.5 leading-relaxed">{plan.nextAction}</dd>
            </div>
            <div className="rounded-md bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">Suggested timing</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 leading-relaxed">
                <CalendarClock className="size-3.5 shrink-0" aria-hidden />
                {plan.suggestedWhen}
                {nextFollowUpAt ? ` · currently ${formatDate(nextFollowUpAt)}` : ""}
              </dd>
            </div>
          </dl>
        </div>

        {plan.cautions.length > 0 && (
          <ul className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            {plan.cautions.map((caution) => (
              <li key={caution}>{caution}</li>
            ))}
          </ul>
        )}

        {plan.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outreach draft is suggested for this lead right now. The cautions above explain
            why.
          </p>
        ) : (
          <div className="space-y-4">
            {plan.messages.map((message) => {
              const Icon = CHANNEL_ICONS[message.channel]
              return (
                <section key={message.channel} className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="size-4 text-primary" aria-hidden /> {message.label}
                  </h3>
                  {message.subject && (
                    <p className="text-xs text-muted-foreground">
                      Subject: {message.subject}
                    </p>
                  )}
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm leading-relaxed whitespace-pre-line">
                    {message.body}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton value={message.body} label="Copy draft" />
                    <ChannelAction message={message} phone={phone} email={email} />
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
