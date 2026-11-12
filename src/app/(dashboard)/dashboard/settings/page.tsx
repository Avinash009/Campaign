import type { Metadata } from "next"
import { requireBusinessContext } from "@/modules/auth/session"
import { getBusinessProfile } from "@/modules/business/service"
import { getActiveIndustries } from "@/modules/industries/service"
import { canEditProfile } from "@/modules/auth/rbac"
import { BusinessSettingsForm } from "@/components/dashboard/business-settings-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Business settings",
}

/** Business profile view/edit (Phase 2 task 2.4). */
export default async function SettingsPage() {
  const context = await requireBusinessContext()
  const [profile, industries] = await Promise.all([
    getBusinessProfile(context.businessId),
    getActiveIndustries(),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Business settings</h1>
        <p className="text-sm text-muted-foreground">
          Keep your public business details accurate — customers see them on your
          campaign pages.
        </p>
      </div>

      <BusinessSettingsForm
        profile={{
          name: profile.name,
          slug: profile.slug,
          email: profile.email,
          phone: profile.phone,
          website: profile.website,
          city: profile.city,
          state: profile.state,
          description: profile.description,
          logoUrl: profile.logoUrl,
          industry: profile.industry,
        }}
        industries={industries.map((industry) => ({
          id: industry.id,
          name: industry.name,
          slug: industry.slug,
        }))}
        canEdit={canEditProfile(context.role)}
      />
    </div>
  )
}
