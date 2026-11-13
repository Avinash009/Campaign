import Image from "next/image"
import Link from "next/link"
import type { CampaignStatus } from "@prisma/client"
import {
  CalendarDays,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { publicImageSrc } from "@/lib/image-src"
import { formatDate } from "@/lib/format"
import { CTA_ACTION_LABELS } from "@/modules/campaigns/labels"
import { CAMPAIGN_STATUS_LABELS } from "@/modules/campaigns/lifecycle"
import type { PublicCampaign } from "@/modules/campaigns/types"
import { CampaignEnquiryForm } from "./campaign-enquiry-form"
import { getLandingTemplate } from "./templates"

/**
 * Shared public landing-page renderer (Phase 3 tasks 3.7 + 3.8). Used by
 * `/c/[slug]` and the owner preview. Contact actions are click-to-contact only
 * (`tel:`, `mailto:`, `wa.me`) — CampaignHub never claims to send messages.
 */

interface CampaignLandingProps {
  campaign: PublicCampaign
  /** When set, renders the owner preview banner with the current status. */
  previewStatus?: CampaignStatus
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`
}

function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  const withCountry = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${withCountry}`
}

function priceLabel(campaign: PublicCampaign): string | null {
  if (campaign.priceDisplay?.trim()) return campaign.priceDisplay.trim()
  if (campaign.priceInPaise === null) return null
  return `₹${(campaign.priceInPaise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`
}

function TextBlock({
  title,
  body,
  className,
}: {
  title: string
  body: string
  className?: string
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">{body}</p>
    </section>
  )
}

export function CampaignLanding({ campaign, previewStatus }: CampaignLandingProps) {
  const template = getLandingTemplate(campaign.industry?.slug)
  const TemplateIcon = template.icon
  const phone = campaign.contactPhone?.trim() || campaign.business.phone?.trim() || ""
  const email = campaign.contactEmail?.trim() || campaign.business.email
  const price = priceLabel(campaign)
  const cover = campaign.images[0]
  const gallery = campaign.images.slice(1)
  const description = campaign.promoDescription?.trim() || campaign.description?.trim() || ""
  const primaryLabel = CTA_ACTION_LABELS[campaign.ctaType]

  const detailRows = [
    { icon: MapPin, label: "Location", value: campaign.targetLocation },
    { icon: Users, label: "Audience", value: campaign.targetAudience },
    { icon: TemplateIcon, label: "Category", value: campaign.industry?.name ?? null },
    {
      icon: CalendarDays,
      label: "Dates",
      value:
        campaign.startDate || campaign.endDate
          ? [
              campaign.startDate ? `From ${formatDate(campaign.startDate)}` : null,
              campaign.endDate ? `until ${formatDate(campaign.endDate)}` : null,
            ]
              .filter(Boolean)
              .join(" ")
          : null,
    },
  ].filter((row) => row.value)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {previewStatus && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          Preview only — this page is {CAMPAIGN_STATUS_LABELS[previewStatus].toLowerCase()}
          {previewStatus === "ACTIVE"
            ? " and visible to visitors."
            : " and not visible to visitors until you publish it."}
        </div>
      )}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {campaign.business.logoUrl ? (
              <Image
                src={publicImageSrc(campaign.business.logoUrl)}
                alt={`${campaign.business.name} logo`}
                width={36}
                height={36}
                className="size-9 rounded-lg object-cover"
                unoptimized
              />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                {campaign.business.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{campaign.business.name}</p>
              <p className="truncate text-xs text-slate-500">
                {campaign.business.city
                  ? `${campaign.business.city}${campaign.business.state ? `, ${campaign.business.state}` : ""}`
                  : "Campaign page"}
              </p>
            </div>
          </div>
          {phone && (
            <a
              href={telHref(phone)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              <Phone className="size-4" aria-hidden /> Call
            </a>
          )}
        </div>
      </header>

      <main>
        <section className={cn("text-white", template.heroClass)}>
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-16">
            <div className="space-y-5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1",
                  template.chipClass,
                )}
              >
                <TemplateIcon className="size-3.5" aria-hidden />
                {template.eyebrow}
              </span>

              <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                {campaign.headline?.trim() || campaign.name}
              </h1>

              {description && (
                <p className="max-w-xl text-base leading-relaxed whitespace-pre-line text-white/85">
                  {description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {price && (
                  <span className="rounded-lg bg-white/15 px-3 py-1.5 text-base font-semibold ring-1 ring-white/20">
                    {price}
                  </span>
                )}
                {campaign.industry?.name && (
                  <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/15">
                    {campaign.industry.name}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="#enquiry"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                >
                  <Send className="size-4" aria-hidden /> Send an enquiry
                </a>
                {phone && (
                  <a
                    href={telHref(phone)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    <Phone className="size-4" aria-hidden /> {primaryLabel}
                  </a>
                )}
                {phone && (
                  <a
                    href={whatsappHref(phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    <MessageCircle className="size-4" aria-hidden /> WhatsApp
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    <Mail className="size-4" aria-hidden /> Email
                  </a>
                )}
              </div>

              <p className="text-xs text-white/70">
                You contact {campaign.contactName?.trim() || campaign.business.name} directly.
                CampaignHub does not call or message you.
              </p>
            </div>

            {cover && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-white/20">
                <Image
                  src={publicImageSrc(cover.url)}
                  alt={cover.altText ?? campaign.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                  unoptimized
                  priority
                />
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-8">
              {gallery.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {gallery.map((image) => (
                    <div
                      key={image.id}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200"
                    >
                      <Image
                        src={publicImageSrc(image.url)}
                        alt={image.altText ?? campaign.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}

              {campaign.productDetails?.trim() && (
                <TextBlock title={template.highlightsTitle} body={campaign.productDetails} />
              )}

              {campaign.offerDetails?.trim() && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="size-4 text-slate-700" aria-hidden />
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                      {template.offerTitle}
                    </h2>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">
                    {campaign.offerDetails}
                  </p>
                </div>
              )}

              {template.disclaimer && (
                <p className="rounded-lg bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
                  <ShieldCheck className="mr-1.5 inline size-3.5 align-text-bottom" aria-hidden />
                  {template.disclaimer}
                </p>
              )}

              {detailRows.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    {template.detailsTitle}
                  </h2>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {detailRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                      >
                        <row.icon className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
                        <div className="min-w-0">
                          <dt className="text-xs font-medium text-slate-500">{row.label}</dt>
                          <dd className="text-sm text-slate-800">{row.value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {campaign.videoUrl && (
                <a
                  href={campaign.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
                >
                  <ExternalLink className="size-4" aria-hidden /> Watch the video
                </a>
              )}

              <section
                id="enquiry"
                className="scroll-mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
              >
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Send an enquiry
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  Share your details and{" "}
                  {campaign.contactName?.trim() || campaign.business.name} will contact you
                  directly. CampaignHub stores the enquiry on the business&apos;s behalf.
                </p>
                <CampaignEnquiryForm
                  campaignSlug={campaign.slug}
                  businessName={campaign.business.name}
                  disabled={Boolean(previewStatus)}
                />
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Get in touch
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {campaign.contactName?.trim() || campaign.business.name}
                </p>

                <div className="mt-4 space-y-2">
                  {phone && (
                    <a
                      href={telHref(phone)}
                      className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <Phone className="size-4" aria-hidden /> {phone}
                    </a>
                  )}
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      <Mail className="size-4" aria-hidden /> {email}
                    </a>
                  )}
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{campaign.business.name}</p>
                  {campaign.business.website && (
                    <a
                      href={campaign.business.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-700 underline underline-offset-4"
                    >
                      <ExternalLink className="size-3.5" aria-hidden /> Website
                    </a>
                  )}
                  {campaign.business.description && (
                    <p className="text-xs leading-relaxed">{campaign.business.description}</p>
                  )}
                </div>
              </div>

              <p className="px-1 text-xs leading-relaxed text-slate-500">
                Campaign details are published by {campaign.business.name}. Verify pricing and
                availability directly with the business before making a decision.
              </p>
            </aside>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {campaign.business.name}
            {campaign.business.city ? ` · ${campaign.business.city}` : ""}
          </p>
          <p className="text-xs">
            Published with{" "}
            <Link href="/" className="font-medium text-slate-800 underline underline-offset-4">
              CampaignHub
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
