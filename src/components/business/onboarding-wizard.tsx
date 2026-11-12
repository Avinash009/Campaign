"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, Rocket } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { LogoUploader } from "@/components/business/logo-uploader"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import {
  onboardingSchema,
  type OnboardingFormValues,
  type OnboardingInput,
} from "@/modules/business/schemas"

export interface OnboardingIndustry {
  id: string
  name: string
  slug: string
}

interface OnboardingWizardProps {
  industries: OnboardingIndustry[]
  /** Defaults to the signed-in owner's email so step 1 is quicker. */
  defaultEmail?: string
  ownerName?: string
}

const STEP_FIELDS: Array<Array<keyof OnboardingFormValues>> = [
  ["businessName", "businessEmail", "phone", "industrySlug", "website", "city", "state", "description"],
  [],
  [],
]

const STEP_LABELS = ["Business details", "Logo", "Review"] as const

export function OnboardingWizard({
  industries,
  defaultEmail = "",
  ownerName,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormValues, unknown, OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessName: "",
      businessEmail: defaultEmail,
      phone: "",
      industrySlug: "",
      website: "",
      city: "",
      state: "",
      description: "",
      logoUrl: "",
    },
    mode: "onTouched",
  })

  const values = useWatch({ control })

  async function nextStep() {
    const valid = await trigger(STEP_FIELDS[step], { shouldFocus: true })
    if (valid) setStep((current) => Math.min(current + 1, STEP_LABELS.length - 1))
  }

  async function onSubmit(input: OnboardingInput) {
    setSubmitting(true)
    setFormError(null)
    try {
      await apiFetch<{ businessId: string; slug: string }>("/api/business/onboarding", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Business profile created — welcome aboard!")
      // The JWT businessId may be stale, but the dashboard resolves the
      // membership from the database, so client navigation is enough.
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof OnboardingFormValues, { message: messages[0] })
          }
        }
        setFormError(error.message)
      } else {
        setFormError("Something went wrong. Please try again.")
      }
      setSubmitting(false)
    }
  }

  const selectedIndustry = industries.find((industry) => industry.slug === values.industrySlug)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-5" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          {ownerName ? `Welcome, ${ownerName.split(" ")[0]}` : "Set up your business"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tell us about your business. You can edit these details any time in Settings.
        </p>
      </div>

      {/* Step indicator */}
      <ol className="flex items-center justify-center gap-2" aria-label="Onboarding progress">
        {STEP_LABELS.map((label, index) => {
          const state = index === step ? "current" : index < step ? "done" : "upcoming"
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={
                  state === "done"
                    ? "flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    : state === "current"
                      ? "flex size-7 items-center justify-center rounded-full border border-primary text-sm font-medium text-primary"
                      : "flex size-7 items-center justify-center rounded-full border border-border text-sm text-muted-foreground"
                }
              >
                {state === "done" ? <Check className="size-4" aria-hidden /> : index + 1}
              </span>
              <span
                className={
                  state === "upcoming"
                    ? "hidden text-xs font-medium text-muted-foreground sm:inline"
                    : "hidden text-xs font-medium text-foreground sm:inline"
                }
              >
                {label}
              </span>
              {index < STEP_LABELS.length - 1 && (
                <span className="mx-1 h-px w-6 bg-border sm:w-10" aria-hidden />
              )}
            </li>
          )
        })}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEP_LABELS[step]}</CardTitle>
          <CardDescription>
            {step === 0
              ? "This becomes your public business profile on campaign pages."
              : step === 1
                ? "Optional — add a logo to make your campaign pages recognisable."
                : "Check the details before creating your business."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="businessName">Business name</Label>
                  <Input
                    id="businessName"
                    placeholder="Sri Geetha Realty"
                    aria-invalid={Boolean(errors.businessName)}
                    {...register("businessName")}
                  />
                  {errors.businessName && (
                    <p className="text-xs text-destructive">{errors.businessName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessEmail">Business email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="hello@business.com"
                    aria-invalid={Boolean(errors.businessEmail)}
                    {...register("businessEmail")}
                  />
                  {errors.businessEmail && (
                    <p className="text-xs text-destructive">{errors.businessEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    aria-invalid={Boolean(errors.phone)}
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="industrySlug">Industry</Label>
                  <Controller
                    control={control}
                    name="industrySlug"
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="industrySlug"
                          className="w-full"
                          aria-invalid={Boolean(errors.industrySlug)}
                        >
                          <SelectValue placeholder="Choose an industry" />
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
                  {errors.industrySlug && (
                    <p className="text-xs text-destructive">{errors.industrySlug.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website">Website (optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://business.com"
                    aria-invalid={Boolean(errors.website)}
                    {...register("website")}
                  />
                  {errors.website && (
                    <p className="text-xs text-destructive">{errors.website.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">City (optional)</Label>
                  <Input id="city" placeholder="Hyderabad" {...register("city")} />
                  {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state">State (optional)</Label>
                  <Input id="state" placeholder="Telangana" {...register("state")} />
                  {errors.state && (
                    <p className="text-xs text-destructive">{errors.state.message}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="description">About your business (optional)</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder="What you do, who you serve, what makes you different."
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <LogoUploader
                value={values.logoUrl || null}
                onChange={(url) => setValue("logoUrl", url ?? "", { shouldDirty: true })}
              />
            )}

            {step === 2 && (
              <div className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <ReviewRow label="Business name" value={values.businessName} />
                  <ReviewRow label="Industry" value={selectedIndustry?.name ?? values.industrySlug} />
                  <ReviewRow label="Business email" value={values.businessEmail} />
                  <ReviewRow label="Phone" value={values.phone} />
                  <ReviewRow label="Website" value={values.website} />
                  <ReviewRow
                    label="Location"
                    value={[values.city, values.state].filter(Boolean).join(", ")}
                  />
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      About
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {values.description || <span className="text-muted-foreground">Not provided</span>}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Logo</dt>
                    <dd>
                      {values.logoUrl ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">
                          Uploaded
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not uploaded</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  A 14-day free trial starts when your business is created. No payment details
                  are required, and nothing is charged automatically.
                </p>
              </div>
            )}

            {formError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                disabled={step === 0 || submitting}
              >
                <ArrowLeft className="size-4" aria-hidden /> Back
              </Button>

              {step < STEP_LABELS.length - 1 ? (
                <Button type="button" onClick={() => void nextStep()}>
                  Continue <ArrowRight className="size-4" aria-hidden />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Rocket className="size-4" aria-hidden />
                  )}
                  {submitting ? "Creating business…" : "Create business"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">
        {value?.trim() ? value : <span className="text-muted-foreground">Not provided</span>}
      </dd>
    </div>
  )
}
