"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import {
  leadEnquirySchema,
  type LeadEnquiryFormValues,
  type LeadEnquiryInput,
} from "@/modules/leads/schemas"
import type { LeadEnquiryResult } from "@/modules/leads/types"

interface CampaignEnquiryFormProps {
  campaignSlug: string
  businessName: string
  /** Owner preview: render the form but block submission so no test leads are created. */
  disabled?: boolean
}

function utmFromLocation(): Partial<LeadEnquiryInput> {
  if (typeof window === "undefined") return {}
  const params = new URLSearchParams(window.location.search)
  const value = (key: string) => {
    const raw = params.get(key)?.trim()
    return raw ? raw.slice(0, 160) : undefined
  }
  return {
    utmSource: value("utm_source"),
    utmMedium: value("utm_medium"),
    utmCampaign: value("utm_campaign"),
    utmTerm: value("utm_term"),
    utmContent: value("utm_content"),
    referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
  }
}

/**
 * Public enquiry form (Phase 4 task 4.1). Required consent + privacy notice,
 * honeypot field and no auto-contact promises: the business contacts the
 * visitor directly.
 */
export function CampaignEnquiryForm({
  campaignSlug,
  businessName,
  disabled = false,
}: CampaignEnquiryFormProps) {
  const [result, setResult] = useState<LeadEnquiryResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<LeadEnquiryFormValues, unknown, LeadEnquiryInput>({
    resolver: zodResolver(leadEnquirySchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      city: "",
      interestedIn: "",
      message: "",
      consent: false,
      website: "",
    },
  })

  async function onSubmit(values: LeadEnquiryInput) {
    if (disabled) return
    setSubmitting(true)
    try {
      const payload = { ...values, ...utmFromLocation() }
      const response = await apiFetch<{ data: LeadEnquiryResult }>(
        `/api/public/campaigns/${encodeURIComponent(campaignSlug)}/enquiry`,
        { method: "POST", body: JSON.stringify(payload) },
      )
      setResult(response.data)
      reset()
      toast.success(
        response.data.duplicate ? "We already have your enquiry" : "Enquiry received",
      )
    } catch (error) {
      if (error instanceof ApiClientError) {
        const fields = [
          "name",
          "phone",
          "email",
          "city",
          "interestedIn",
          "message",
          "consent",
        ] as const
        for (const field of fields) {
          const message = error.fieldErrors[field]?.[0]
          if (message) setError(field, { message })
        }
        toast.error(error.message)
      } else {
        toast.error("Could not send the enquiry. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-emerald-900">
              {result.duplicate ? "We already have your enquiry" : "Enquiry received"}
            </h3>
            <p className="text-sm text-emerald-900/80">
              Your reference is <strong>{result.reference}</strong>.
            </p>
            <p className="text-sm text-emerald-900/80">
              {result.duplicate
                ? "This phone number already sent an enquiry for this campaign in the last 24 hours, so we did not create a duplicate. The business has your details."
                : `${businessName} will contact you directly using the details you shared.`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {disabled && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Preview only — the enquiry form is disabled here so no test leads are created.
          Visitors can submit it once the campaign is published.
        </p>
      )}

      {/* Honeypot: hidden from people, tempting for bots. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="enquiry-name">
            Your name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="enquiry-name"
            autoComplete="name"
            placeholder="Priya Sharma"
            disabled={disabled}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="enquiry-phone">
            Phone number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="enquiry-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            disabled={disabled}
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="enquiry-email">Email (optional)</Label>
          <Input
            id="enquiry-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={disabled}
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="enquiry-city">City (optional)</Label>
          <Input
            id="enquiry-city"
            autoComplete="address-level2"
            placeholder="Hyderabad"
            disabled={disabled}
            aria-invalid={Boolean(errors.city)}
            {...register("city")}
          />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enquiry-interest">What are you interested in? (optional)</Label>
        <Input
          id="enquiry-interest"
          placeholder="e.g. 3 BHK apartment, weekend slot, test drive"
          disabled={disabled}
          aria-invalid={Boolean(errors.interestedIn)}
          {...register("interestedIn")}
        />
        {errors.interestedIn && (
          <p className="text-xs text-destructive">{errors.interestedIn.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enquiry-message">Message (optional)</Label>
        <Textarea
          id="enquiry-message"
          rows={3}
          placeholder="Share anything the business should know before contacting you."
          disabled={disabled}
          aria-invalid={Boolean(errors.message)}
          {...register("message")}
        />
        {errors.message && (
          <p className="text-xs text-destructive">{errors.message.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2.5">
          <input
            id="enquiry-consent"
            type="checkbox"
            disabled={disabled}
            className="mt-0.5 size-4 rounded border-input accent-primary"
            aria-invalid={Boolean(errors.consent)}
            {...register("consent")}
          />
          <Label htmlFor="enquiry-consent" className="text-sm font-normal leading-relaxed">
            I agree to be contacted by {businessName} about this enquiry by phone, WhatsApp or
            email, and I have read the privacy notice.
          </Label>
        </div>
        {errors.consent && (
          <p className="text-xs text-destructive">{errors.consent.message}</p>
        )}
      </div>

      <div className="rounded-lg bg-white/70 px-3 py-2.5 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200">
        <strong className="font-medium text-slate-800">Privacy notice:</strong> your name, phone
        and any details you share go only to {businessName} so they can respond. CampaignHub
        stores the enquiry on the business&apos;s behalf and does not call or message you. Never
        share bank passwords, OTPs, PAN or Aadhaar numbers on this form.
      </div>

      <Button type="submit" disabled={disabled || submitting} className="w-full sm:w-auto">
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
        {submitting ? "Sending…" : disabled ? "Enquiry form (preview)" : "Send enquiry"}
      </Button>
    </form>
  )
}
