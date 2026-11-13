import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Eye,
  Megaphone,
  Pencil,
  Target,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CampaignActions } from "@/components/campaigns/campaign-actions"
import { CampaignImageManager } from "@/components/campaigns/campaign-image-manager"
import { CampaignStatusBadge } from "@/components/shared/status-badge"
import { requireBusinessContext } from "@/modules/auth/session"
import { ApiError } from "@/lib/errors"
import { canWriteCampaigns } from "@/modules/auth/rbac"
import { CTA_LABELS, OBJECTIVE_LABELS } from "@/modules/campaigns/labels"
import { CAMPAIGN_STATUS_LABELS } from "@/modules/campaigns/lifecycle"
import { getCampaignDetail, publishBlockers } from "@/modules/campaigns/service"
import type { CampaignDetail } from "@/modules/campaigns/types"
import { formatDate, formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Campaign",
}

const PUBLISH_REQUIREMENTS = [
  { key: "headline", label: "Headline visitors will read first" },
  { key: "description", label: "A promotional description" },
  { key: "contact", label: "A contact phone number or email" },
  { key: "endDate", label: "A sensible end date" },
] as const

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

function ContentBlock({ title, body }: { title: string; body: string | null }) {
  if (!body?.trim()) return null
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
        {body}
      </p>
    </div>
  )
}

/** Campaign detail with lifecycle actions, image manager and publish checklist. */
export default async function CampaignDetailPage({
  params,
}: PageProps<"/dashboard/campaigns/[id]">) {
  const context = await requireBusinessContext()
  const { id } = await params

  let campaign: CampaignDetail
  try {
    campaign = await getCampaignDetail(context, id)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }

  const canManage = canWriteCampaigns(context.role)
  const editable = canManage && campaign.status !== "ARCHIVED"
  const blockers = publishBlockers(campaign)
  const isPublic = campaign.status === "ACTIVE"

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to campaigns
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {campaign.headline?.trim() || "No headline yet — add one before publishing."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/preview/campaigns/${campaign.id}`} target="_blank">
                <Eye className="size-4" aria-hidden /> Preview
              </Link>
            </Button>
            {editable && (
              <Button variant="outline" asChild>
                <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
                  <Pencil className="size-4" aria-hidden /> Edit
                </Link>
              </Button>
            )}
          </div>
        </div>

        <CampaignActions
          campaignId={campaign.id}
          status={campaign.status}
          publicUrl={campaign.publicUrl}
          canManage={canManage}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Landing page content</CardTitle>
              <CardDescription>
                What visitors see on the public campaign page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {campaign.status === "DRAFT" && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  This campaign is a draft. Only your team can open it until you publish.
                </p>
              )}

              <div className="space-y-1">
                <h3 className="text-sm font-medium">Headline</h3>
                <p className="text-sm text-muted-foreground">
                  {campaign.headline?.trim() || "Not set."}
                </p>
              </div>

              <ContentBlock
                title="Promotional description"
                body={campaign.promoDescription}
              />
              <ContentBlock title="Campaign description" body={campaign.description} />
              <ContentBlock title="Product or service details" body={campaign.productDetails} />
              <ContentBlock title="Offer details" body={campaign.offerDetails} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Price</h3>
                  <p className="text-sm text-muted-foreground">
                    {campaign.priceDisplay?.trim() ||
                      (campaign.priceInPaise !== null
                        ? `₹${(campaign.priceInPaise / 100).toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}`
                        : "Not shown")}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Call to action</h3>
                  <p className="text-sm text-muted-foreground">
                    {CTA_LABELS[campaign.ctaType]}
                  </p>
                </div>
              </div>

              {campaign.videoUrl && (
                <a
                  href={campaign.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
                >
                  <ExternalLink className="size-4" aria-hidden /> Campaign video
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="size-5 text-primary" aria-hidden /> Contact & targeting
              </CardTitle>
              <CardDescription>
                Click-to-contact details and optional audience context.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <dl className="space-y-1">
                <DetailRow label="Contact name" value={campaign.contactName ?? "—"} />
                <DetailRow
                  label="Phone"
                  value={
                    campaign.contactPhone ? (
                      <a
                        href={`tel:${campaign.contactPhone.replace(/[^\d+]/g, "")}`}
                        className="text-primary underline underline-offset-4"
                      >
                        {campaign.contactPhone}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <DetailRow
                  label="Email"
                  value={
                    campaign.contactEmail ? (
                      <a
                        href={`mailto:${campaign.contactEmail}`}
                        className="text-primary underline underline-offset-4"
                      >
                        {campaign.contactEmail}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </dl>
              <dl className="space-y-1">
                <DetailRow label="Location" value={campaign.targetLocation ?? "—"} />
                <DetailRow label="Audience" value={campaign.targetAudience ?? "—"} />
                <DetailRow
                  label="Age range"
                  value={
                    campaign.ageRangeMin === null && campaign.ageRangeMax === null
                      ? "—"
                      : `${campaign.ageRangeMin ?? "Any"}–${campaign.ageRangeMax ?? "Any"}`
                  }
                />
                <DetailRow
                  label="Interests"
                  value={campaign.interests.length > 0 ? campaign.interests.join(", ") : "—"}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Images</CardTitle>
              <CardDescription>
                {campaign.images.length} of 8 images. The first image is the cover.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignImageManager
                campaignId={campaign.id}
                images={campaign.images}
                editable={editable}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="size-4 text-primary" aria-hidden /> Publish checklist
              </CardTitle>
              <CardDescription>
                {campaign.status === "ACTIVE"
                  ? `Live${campaign.publishedAt ? ` since ${formatDate(campaign.publishedAt)}` : ""}.`
                  : campaign.status === "ARCHIVED"
                    ? "This campaign is archived and read-only."
                    : "Complete these items, then publish from the actions above."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {PUBLISH_REQUIREMENTS.map((requirement) => {
                  const done = !blockers.includes(requirement.key)
                  return (
                    <li key={requirement.key} className="flex items-start gap-2 text-sm">
                      {done ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                      ) : (
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                      )}
                      <span className={done ? "text-muted-foreground" : ""}>{requirement.label}</span>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Campaign summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <DetailRow label="Status" value={CAMPAIGN_STATUS_LABELS[campaign.status]} />
                <DetailRow label="Objective" value={OBJECTIVE_LABELS[campaign.objective]} />
                <DetailRow
                  label="Industry"
                  value={
                    campaign.industry ? (
                      <Badge variant="outline">{campaign.industry.name}</Badge>
                    ) : (
                      "None"
                    )
                  }
                />
                <DetailRow
                  label="Start date"
                  value={campaign.startDate ? formatDate(campaign.startDate) : "Not set"}
                />
                <DetailRow
                  label="End date"
                  value={campaign.endDate ? formatDate(campaign.endDate) : "Not set"}
                />
                <DetailRow
                  label="Published"
                  value={campaign.publishedAt ? formatDateTime(campaign.publishedAt) : "Not yet"}
                />
                <DetailRow
                  label="Created by"
                  value={campaign.createdBy?.name ?? "Team member"}
                />
                <DetailRow label="Created" value={formatDate(campaign.createdAt)} />
                <DetailRow label="Updated" value={formatDate(campaign.updatedAt)} />
                <DetailRow
                  label="Leads"
                  value={
                    <Link
                      href={`/dashboard/leads?campaignId=${campaign.id}`}
                      className="inline-flex items-center gap-1.5 text-primary underline underline-offset-4"
                    >
                      <Users className="size-3.5" aria-hidden />
                      {campaign.leadCount}
                    </Link>
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4 text-primary" aria-hidden /> Public link
              </CardTitle>
              <CardDescription>
                {isPublic
                  ? "Share this link in your messages and posts."
                  : "The link works only while the campaign is active."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">
                {campaign.publicUrl}
              </code>
              {campaign.leadCount === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Visitors use the enquiry form on the public page, or reach you directly with
                  the call, WhatsApp and email buttons. New enquiries appear under{" "}
                  <Link
                    href="/dashboard/leads"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Leads
                  </Link>
                  .
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
