import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LeadAssignForm } from "@/components/leads/lead-assign-form"
import { LeadFollowUpCard } from "@/components/leads/lead-follow-up-card"
import { LeadFollowUpForm } from "@/components/leads/lead-follow-up-form"
import { LeadNoteForm } from "@/components/leads/lead-note-form"
import { LeadQualificationCard } from "@/components/leads/lead-qualification-card"
import { LeadStatusForm } from "@/components/leads/lead-status-form"
import { LeadStatusBadge } from "@/components/shared/status-badge"
import { ApiError } from "@/lib/errors"
import {
  formatDate,
  formatDateTime,
  formatPhone,
  phoneTelHref,
  phoneWhatsAppHref,
} from "@/lib/format"
import { requireBusinessContext } from "@/modules/auth/session"
import { canAssignLeads, canEditLead } from "@/modules/auth/rbac"
import {
  LEAD_ACTIVITY_LABELS,
  LEAD_ACTIVITY_TONES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
} from "@/modules/leads/labels"
import { getLeadDetail, getLeadFilterOptions } from "@/modules/leads/service"
import { getLeadFollowUp, getLeadQualification } from "@/modules/ai/service"
import { isFollowUpOverdue } from "@/modules/leads/helpers"
import type { LeadActivityDto, LeadDetail } from "@/modules/leads/types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Lead",
}

const ACTIVITY_STYLES: Record<
  (typeof LEAD_ACTIVITY_TONES)[keyof typeof LEAD_ACTIVITY_TONES],
  { dot: string; icon: string }
> = {
  primary: { dot: "bg-primary/10", icon: "text-primary" },
  success: { dot: "bg-emerald-500/10", icon: "text-emerald-700" },
  warning: { dot: "bg-amber-500/10", icon: "text-amber-700" },
  muted: { dot: "bg-muted", icon: "text-muted-foreground" },
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

function activityBody(activity: LeadActivityDto): string | null {
  if (activity.fromStatus && activity.toStatus) {
    return `${LEAD_STATUS_LABELS[activity.fromStatus]} → ${LEAD_STATUS_LABELS[activity.toStatus]}`
  }
  if (activity.toStatus) return LEAD_STATUS_LABELS[activity.toStatus]
  return null
}

function Timeline({ activities }: { activities: LeadActivityDto[] }) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing has happened on this lead yet. Add a note or schedule a follow-up to start the
        history.
      </p>
    )
  }

  return (
    <ol className="space-y-4">
      {activities.map((activity) => {
        const tone = LEAD_ACTIVITY_TONES[activity.type] ?? "muted"
        const styles = ACTIVITY_STYLES[tone]
        const body = activityBody(activity)
        return (
          <li key={activity.id} className="flex gap-3">
            <span
              className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${styles.dot}`}
            >
              <Clock className={`size-3.5 ${styles.icon}`} aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-sm font-medium">{LEAD_ACTIVITY_LABELS[activity.type]}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(activity.createdAt)}
                </p>
              </div>
              {body && <p className="text-xs text-muted-foreground">{body}</p>}
              {activity.scheduledFor && (
                <p className="text-xs text-muted-foreground">
                  For {formatDate(activity.scheduledFor)}
                </p>
              )}
              {activity.note && (
                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                  {activity.note}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {activity.actorName ? `By ${activity.actorName}` : "Recorded by CampaignHub"}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Lead detail: contact details, quick actions, timeline and follow-up tools. */
export default async function LeadDetailPage({ params }: PageProps<"/dashboard/leads/[id]">) {
  const context = await requireBusinessContext()
  const { id } = await params

  let lead: LeadDetail
  try {
    lead = await getLeadDetail(context, id)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }

  const options = await getLeadFilterOptions(context)
  const [qualification, followUp] = await Promise.all([
    getLeadQualification(context, lead.id),
    getLeadFollowUp(context, lead.id),
  ])
  const isAssignee = lead.assignedTo?.id === context.userId
  const canEdit = canEditLead(context.role, isAssignee)
  const canAssign = canAssignLeads(context.role)
  const overdue = isFollowUpOverdue(lead.nextFollowUpAt)
  const campaignLabel = lead.campaign?.name ?? "Direct enquiry"

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to leads
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {lead.reference} · Received {formatDateTime(lead.createdAt)} ·{" "}
              {LEAD_SOURCE_LABELS[lead.source]}
            </p>
            <p className="text-sm text-muted-foreground">
              {lead.campaign ? (
                <>
                  From{" "}
                  <Link
                    href={`/dashboard/campaigns/${lead.campaign.id}`}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    {lead.campaign.name}
                  </Link>
                </>
              ) : (
                campaignLabel
              )}
              {lead.assignedTo
                ? ` · Assigned to ${isAssignee ? "you" : lead.assignedTo.name}`
                : " · Unassigned"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={phoneTelHref(lead.phone)}>
                <Phone className="size-4" aria-hidden /> Call
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={phoneWhatsAppHref(lead.phone)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            </Button>
            {lead.email && (
              <Button variant="outline" asChild>
                <a href={`mailto:${lead.email}`}>
                  <Mail className="size-4" aria-hidden /> Email
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enquiry details</CardTitle>
              <CardDescription>
                What the customer submitted through the campaign page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="divide-y divide-border">
                <DetailRow label="Phone" value={formatPhone(lead.phone)} />
                <DetailRow
                  label="Email"
                  value={
                    lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-primary underline underline-offset-4"
                      >
                        {lead.email}
                      </a>
                    ) : (
                      "Not shared"
                    )
                  }
                />
                <DetailRow
                  label="City"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
                      {lead.city ?? "Not shared"}
                    </span>
                  }
                />
                <DetailRow label="Interested in" value={lead.interestedIn ?? "Not specified"} />
                <DetailRow
                  label="Campaign"
                  value={
                    lead.campaign ? (
                      <Link
                        href={`/dashboard/campaigns/${lead.campaign.id}`}
                        className="text-primary underline underline-offset-4"
                      >
                        {lead.campaign.name}
                      </Link>
                    ) : (
                      "Direct enquiry"
                    )
                  }
                />
                <DetailRow label="Source" value={LEAD_SOURCE_LABELS[lead.source]} />
              </dl>

              <div className="space-y-1">
                <h3 className="text-sm font-medium">Message</h3>
                <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                  {lead.message?.trim() || "The customer did not add a message."}
                </p>
              </div>
            </CardContent>
          </Card>

          <LeadQualificationCard result={qualification} />

          <LeadFollowUpCard
            result={followUp}
            phone={lead.phone}
            email={lead.email}
            nextFollowUpAt={lead.nextFollowUpAt}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes & timeline</CardTitle>
              <CardDescription>
                Status changes, notes and follow-ups appear here for the whole team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {canEdit ? (
                <LeadNoteForm leadId={lead.id} />
              ) : (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  This lead is assigned to another teammate. You can read the history but only
                  the assignee, an owner or an admin can add notes.
                </p>
              )}
              <div className="border-t border-border pt-4">
                <Timeline activities={lead.activities} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>Keep the pipeline accurate for your team.</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadStatusForm leadId={lead.id} status={lead.status} canEdit={canEdit} />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4 text-primary" aria-hidden /> Follow-up
              </CardTitle>
              <CardDescription>
                {lead.nextFollowUpAt ? (
                  <span className={overdue ? "font-medium text-destructive" : undefined}>
                    {overdue ? "Overdue since" : "Scheduled for"}{" "}
                    {formatDate(lead.nextFollowUpAt)}
                  </span>
                ) : (
                  "No follow-up scheduled."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadFollowUpForm
                leadId={lead.id}
                nextFollowUpAt={lead.nextFollowUpAt}
                canEdit={canEdit}
              />
            </CardContent>
          </Card>

          {canAssign && (
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-primary" aria-hidden /> Assignment
                </CardTitle>
                <CardDescription>
                  Members see only leads assigned to them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeadAssignForm
                  leadId={lead.id}
                  assignedToId={lead.assignedTo?.id ?? null}
                  assignees={options.assignees}
                />
              </CardContent>
            </Card>
          )}

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Lead summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <DetailRow label="Reference" value={lead.reference} />
                <DetailRow label="Status" value={LEAD_STATUS_LABELS[lead.status]} />
                <DetailRow label="Source" value={LEAD_SOURCE_LABELS[lead.source]} />
                {lead.campaign && (
                  <DetailRow
                    label="Campaign"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Megaphone className="size-3.5 text-muted-foreground" aria-hidden />
                        {lead.campaign.name}
                      </span>
                    }
                  />
                )}
                <DetailRow
                  label="Assigned to"
                  value={
                    lead.assignedTo ? (
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="size-3.5 text-muted-foreground" aria-hidden />
                        {lead.assignedTo.name}
                      </span>
                    ) : (
                      "Unassigned"
                    )
                  }
                />
                <DetailRow
                  label="Last contacted"
                  value={lead.lastContactedAt ? formatDate(lead.lastContactedAt) : "Not yet"}
                />
                <DetailRow
                  label="Converted"
                  value={lead.convertedAt ? formatDate(lead.convertedAt) : "—"}
                />
                <DetailRow label="Lost" value={lead.lostAt ? formatDate(lead.lostAt) : "—"} />
                <DetailRow label="Received" value={formatDate(lead.createdAt)} />
                <DetailRow label="Updated" value={formatDate(lead.updatedAt)} />
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" aria-hidden /> Consent & privacy
              </CardTitle>
              <CardDescription>
                Captured when the enquiry was submitted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                {lead.consentGiven ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
                )}
                {lead.consentGiven
                  ? "The customer agreed to be contacted about this enquiry."
                  : "No consent record is stored for this lead."}
              </p>
              {lead.consentText && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs leading-relaxed">
                  &ldquo;{lead.consentText}&rdquo;
                </p>
              )}
              {lead.utmSource && (
                <dl className="space-y-1">
                  <DetailRow label="UTM source" value={lead.utmSource} />
                  <DetailRow label="UTM medium" value={lead.utmMedium ?? "—"} />
                  <DetailRow label="UTM campaign" value={lead.utmCampaign ?? "—"} />
                </dl>
              )}
              <p className="flex items-start gap-2 text-xs">
                <Phone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                CampaignHub never calls or messages customers. Calls, WhatsApp and email open
                your own apps.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
