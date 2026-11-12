"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
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
import { LogoUploader } from "@/components/business/logo-uploader"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import {
  profileUpdateSchema,
  type ProfileUpdateFormValues,
  type ProfileUpdateInput,
} from "@/modules/business/schemas"

export interface EditableBusinessProfile {
  name: string
  slug: string
  email: string
  phone: string | null
  website: string | null
  city: string | null
  state: string | null
  description: string | null
  logoUrl: string | null
  industry: { id: string; name: string; slug: string } | null
}

export interface SettingsIndustry {
  id: string
  name: string
  slug: string
}

interface BusinessSettingsFormProps {
  profile: EditableBusinessProfile
  industries: SettingsIndustry[]
  canEdit: boolean
}

const EDITABLE_FIELDS = new Set([
  "businessName",
  "businessEmail",
  "phone",
  "industrySlug",
  "website",
  "city",
  "state",
  "description",
  "logoUrl",
])

/** Business profile editor (Phase 2 task 2.4). Members get a read-only view. */
export function BusinessSettingsForm({
  profile,
  industries,
  canEdit,
}: BusinessSettingsFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileUpdateFormValues, unknown, ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      businessName: profile.name,
      businessEmail: profile.email,
      phone: profile.phone ?? "",
      industrySlug: profile.industry?.slug ?? "",
      website: profile.website ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      description: profile.description ?? "",
      logoUrl: profile.logoUrl ?? "",
    },
    mode: "onTouched",
  })

  const logoUrl = useWatch({ control, name: "logoUrl" })

  async function onSubmit(input: ProfileUpdateInput) {
    setPending(true)
    setFormError(null)
    try {
      await apiFetch("/api/business/profile", {
        method: "PATCH",
        body: JSON.stringify(input),
      })
      toast.success("Business profile updated")
      router.refresh()
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (EDITABLE_FIELDS.has(field)) {
            setError(field as keyof ProfileUpdateFormValues, { message: messages[0] })
          }
        }
        setFormError(error.message)
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business profile</CardTitle>
          <CardDescription>
            Shown on your campaign pages and used by teammates. Public address:{" "}
            <span className="font-mono text-xs">/b/{profile.slug}</span> (campaign pages
            arrive with the campaigns milestone).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              disabled={!canEdit || pending}
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
              disabled={!canEdit || pending}
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
              disabled={!canEdit || pending}
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industrySlug">Industry</Label>
            <Controller
              control={control}
              name="industrySlug"
              render={({ field }) => (
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  disabled={!canEdit || pending}
                >
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
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://business.com"
              disabled={!canEdit || pending}
              aria-invalid={Boolean(errors.website)}
              {...register("website")}
            />
            {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" disabled={!canEdit || pending} {...register("city")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input id="state" disabled={!canEdit || pending} {...register("state")} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">About your business</Label>
            <Textarea
              id="description"
              rows={4}
              disabled={!canEdit || pending}
              placeholder="What you do, who you serve, what makes you different."
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logo</CardTitle>
          <CardDescription>Used on campaign pages and in the app sidebar.</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploader
            value={logoUrl || null}
            onChange={(url) => setValue("logoUrl", url ?? "", { shouldDirty: true })}
            disabled={!canEdit || pending}
          />
        </CardContent>
      </Card>

      {formError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || !isDirty}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {!isDirty && (
            <span className="text-xs text-muted-foreground">No unsaved changes.</span>
          )}
        </div>
      ) : (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Only owners and admins can edit the business profile.
        </p>
      )}
    </form>
  )
}
