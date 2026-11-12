"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { CalendarDays, Loader2, Save, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import {
  CTA_LABELS,
  OBJECTIVE_DESCRIPTIONS,
  OBJECTIVE_LABELS,
} from "@/modules/campaigns/labels"
import {
  CAMPAIGN_OBJECTIVES,
  CTA_TYPES,
  campaignInputSchema,
  type CampaignFormValues,
  type CampaignInput,
} from "@/modules/campaigns/schemas"
import type { CampaignCreated } from "@/modules/campaigns/types"

export interface CampaignFormIndustry {
  id: string
  name: string
  slug: string
}

interface CampaignFormProps {
  mode: "create" | "edit"
  campaignId?: string
  industries: CampaignFormIndustry[]
  defaultValues: CampaignFormValues
  campaignLimit: number | null
  campaignsUsed: number
  planName: string | null
}

const EDITABLE_FIELDS = new Set<string>([
  "name",
  "description",
  "industrySlug",
  "objective",
  "startDate",
  "endDate",
  "headline",
  "promoDescription",
  "productDetails",
  "offerDetails",
  "priceRupees",
  "priceDisplay",
  "ctaType",
  "videoUrl",
  "contactName",
  "contactPhone",
  "contactEmail",
  "targetLocation",
  "targetAudience",
  "ageRangeMin",
  "ageRangeMax",
  "interestsText",
])

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

/**
 * Campaign creation/edit form (Phase 3 tasks 3.2 + 3.5). Four content sections
 * mirror the PRD: basic, promotional, contact/CTA and targeting. Images are
 * managed on the campaign detail page because they need a campaign id.
 */
export function CampaignForm({
  mode,
  campaignId,
  industries,
  defaultValues,
  campaignLimit,
  campaignsUsed,
  planName,
}: CampaignFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<CampaignFormValues, unknown, CampaignInput>({
    resolver: zodResolver(campaignInputSchema),
    defaultValues,
    mode: "onTouched",
  })

  const selectedObjective = useWatch({ control, name: "objective" }) ?? "LEAD_GENERATION"

  async function onSubmit(input: CampaignInput) {
    setPending(true)
    setFormError(null)
    try {
      if (mode === "create") {
        const created = await apiFetch<CampaignCreated>("/api/campaigns", {
          method: "POST",
          body: JSON.stringify(input),
        })
        toast.success("Campaign created as a draft")
        router.push(`/dashboard/campaigns/${created.id}`)
        router.refresh()
        return
      }

      await apiFetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      })
      toast.success("Campaign updated")
      router.push(`/dashboard/campaigns/${campaignId}`)
      router.refresh()
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (EDITABLE_FIELDS.has(field)) {
            setError(field as keyof CampaignFormValues, { message: messages[0] })
          }
        }
        setFormError(error.message)
        toast.error(error.message)
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } finally {
      setPending(false)
    }
  }

  const atLimit =
    mode === "create" && campaignLimit !== null && campaignsUsed >= campaignLimit

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {atLimit && (
        <Alert variant="destructive">
          <Sparkles className="size-4" aria-hidden />
          <AlertDescription>
            You have used {campaignsUsed} of {campaignLimit} campaigns on the{" "}
            {planName ?? "current"} plan. Archive an old campaign or upgrade to create
            another.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic details</CardTitle>
          <CardDescription>
            The internal name and timing. Visitors see the headline and promotional
            content in the next sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Campaign name</Label>
            <Input
              id="name"
              placeholder="Luxury apartments in Hyderabad"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Internal description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="What this campaign is about. Used on the landing page when no promotional description is set."
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industrySlug">Industry template</Label>
            <Controller
              control={control}
              name="industrySlug"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={pending}
                >
                  <SelectTrigger id="industrySlug" className="w-full">
                    <SelectValue placeholder="Use my business industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry.id} value={industry.slug}>
                        {industry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.industrySlug?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="objective">Objective</Label>
            <Controller
              control={control}
              name="objective"
              render={({ field }) => (
                <Select
                  value={field.value ?? "LEAD_GENERATION"}
                  onValueChange={field.onChange}
                  disabled={pending}
                >
                  <SelectTrigger id="objective" className="w-full">
                    <SelectValue placeholder="Choose an objective" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_OBJECTIVES.map((objective) => (
                      <SelectItem key={objective} value={objective}>
                        {OBJECTIVE_LABELS[objective]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              {OBJECTIVE_DESCRIPTIONS[selectedObjective]}
            </p>
            <FieldError message={errors.objective?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            <FieldError message={errors.startDate?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" type="date" {...register("endDate")} />
            <FieldError message={errors.endDate?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="size-5 text-primary" aria-hidden /> Promotional content
          </CardTitle>
          <CardDescription>
            What visitors read on the landing page. Keep claims accurate — the page is
            published under your business name.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              placeholder="Signature 2 & 3 BHK apartments in Kondapur"
              aria-invalid={Boolean(errors.headline)}
              {...register("headline")}
            />
            <p className="text-xs text-muted-foreground">Required before you can publish.</p>
            <FieldError message={errors.headline?.message} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="promoDescription">Promotional description</Label>
            <Textarea
              id="promoDescription"
              rows={4}
              placeholder="The main pitch that appears under the headline."
              aria-invalid={Boolean(errors.promoDescription)}
              {...register("promoDescription")}
            />
            <FieldError message={errors.promoDescription?.message} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="productDetails">Product or service details</Label>
            <Textarea
              id="productDetails"
              rows={4}
              placeholder="Sizes, features, inclusions — the details a customer needs to decide."
              aria-invalid={Boolean(errors.productDetails)}
              {...register("productDetails")}
            />
            <FieldError message={errors.productDetails?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offerDetails">Offer details</Label>
            <Textarea
              id="offerDetails"
              rows={3}
              placeholder="Early-bird pricing, limited inventory, launch discount…"
              aria-invalid={Boolean(errors.offerDetails)}
              {...register("offerDetails")}
            />
            <FieldError message={errors.offerDetails?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priceDisplay">Price shown on the page</Label>
            <Input
              id="priceDisplay"
              placeholder="₹85 Lakhs onwards"
              aria-invalid={Boolean(errors.priceDisplay)}
              {...register("priceDisplay")}
            />
            <p className="text-xs text-muted-foreground">
              Free text, useful for ranges. Leave blank if you would rather not show a price.
            </p>
            <FieldError message={errors.priceDisplay?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priceRupees">Price (₹, optional)</Label>
            <Input
              id="priceRupees"
              inputMode="decimal"
              placeholder="850000"
              aria-invalid={Boolean(errors.priceRupees)}
              {...register("priceRupees")}
            />
            <p className="text-xs text-muted-foreground">
              Stored as exact paise. Shown only when “Price shown” is blank.
            </p>
            <FieldError message={errors.priceRupees?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="videoUrl">Video URL (optional)</Label>
            <Input
              id="videoUrl"
              type="url"
              placeholder="https://youtube.com/watch?v=…"
              aria-invalid={Boolean(errors.videoUrl)}
              {...register("videoUrl")}
            />
            <p className="text-xs text-muted-foreground">
              Linked from the landing page; we do not embed third-party players.
            </p>
            <FieldError message={errors.videoUrl?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact & call to action</CardTitle>
          <CardDescription>
            Visitors contact you directly with call, WhatsApp and email links. CampaignHub
            does not place calls or send messages for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ctaType">Call to action</Label>
            <Controller
              control={control}
              name="ctaType"
              render={({ field }) => (
                <Select
                  value={field.value ?? "ENQUIRE_NOW"}
                  onValueChange={field.onChange}
                  disabled={pending}
                >
                  <SelectTrigger id="ctaType" className="w-full">
                    <SelectValue placeholder="Choose a call to action" />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_TYPES.map((cta) => (
                      <SelectItem key={cta} value={cta}>
                        {CTA_LABELS[cta]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.ctaType?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactName">Contact name</Label>
            <Input
              id="contactName"
              placeholder="Sales desk"
              aria-invalid={Boolean(errors.contactName)}
              {...register("contactName")}
            />
            <FieldError message={errors.contactName?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Contact phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="+91 98480 12345"
              aria-invalid={Boolean(errors.contactPhone)}
              {...register("contactPhone")}
            />
            <FieldError message={errors.contactPhone?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="sales@business.com"
              aria-invalid={Boolean(errors.contactEmail)}
              {...register("contactEmail")}
            />
            <FieldError message={errors.contactEmail?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Targeting</CardTitle>
          <CardDescription>
            Optional context for your team and future ad integrations. CampaignHub does not
            run ads on Google or Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="targetLocation">Target location</Label>
            <Input
              id="targetLocation"
              placeholder="Hyderabad, Telangana"
              aria-invalid={Boolean(errors.targetLocation)}
              {...register("targetLocation")}
            />
            <FieldError message={errors.targetLocation?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="targetAudience">Target audience</Label>
            <Input
              id="targetAudience"
              placeholder="Families upgrading to premium homes"
              aria-invalid={Boolean(errors.targetAudience)}
              {...register("targetAudience")}
            />
            <FieldError message={errors.targetAudience?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ageRangeMin">Minimum age</Label>
            <Input
              id="ageRangeMin"
              inputMode="numeric"
              placeholder="25"
              aria-invalid={Boolean(errors.ageRangeMin)}
              {...register("ageRangeMin")}
            />
            <FieldError message={errors.ageRangeMin?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ageRangeMax">Maximum age</Label>
            <Input
              id="ageRangeMax"
              inputMode="numeric"
              placeholder="55"
              aria-invalid={Boolean(errors.ageRangeMax)}
              {...register("ageRangeMax")}
            />
            <FieldError message={errors.ageRangeMax?.message} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="interestsText">Interests</Label>
            <Input
              id="interestsText"
              placeholder="luxury homes, investment property, gated community"
              aria-invalid={Boolean(errors.interestsText)}
              {...register("interestsText")}
            />
            <p className="text-xs text-muted-foreground">
              Separate interests with commas (up to 10).
            </p>
            <FieldError message={errors.interestsText?.message} />
          </div>
        </CardContent>
      </Card>

      {formError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || atLimit || (mode === "edit" && !isDirty)}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create campaign"
              : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link
            href={
              mode === "edit" && campaignId
                ? `/dashboard/campaigns/${campaignId}`
                : "/dashboard/campaigns"
            }
          >
            Cancel
          </Link>
        </Button>
        {mode === "create" && (
          <span className="text-xs text-muted-foreground">
            Saved as a draft. Add images and publish from the campaign page.
          </span>
        )}
      </div>
    </form>
  )
}
