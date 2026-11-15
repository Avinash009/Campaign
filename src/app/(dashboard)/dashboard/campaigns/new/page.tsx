import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { CampaignForm } from "@/components/campaigns/campaign-form"
import { requireBusinessContext } from "@/modules/auth/session"
import { canWriteCampaigns } from "@/modules/auth/rbac"
import { getAiStatus } from "@/modules/ai/service"
import type { CampaignFormValues } from "@/modules/campaigns/schemas"
import { getCampaignFormContext } from "@/modules/campaigns/service"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "New campaign",
}

/** Campaign creation wizard — a single form with the four PRD sections (task 3.2). */
export default async function NewCampaignPage() {
  const context = await requireBusinessContext()
  if (!canWriteCampaigns(context.role)) redirect("/dashboard/campaigns")

  const formContext = await getCampaignFormContext(context.businessId)

  const defaultValues: CampaignFormValues = {
    name: "",
    description: "",
    industrySlug: formContext.businessIndustrySlug ?? "",
    objective: "LEAD_GENERATION",
    startDate: "",
    endDate: "",
    headline: "",
    promoDescription: "",
    productDetails: "",
    offerDetails: "",
    priceRupees: "",
    priceDisplay: "",
    ctaType: "ENQUIRE_NOW",
    videoUrl: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    targetLocation: "",
    targetAudience: "",
    ageRangeMin: "",
    ageRangeMax: "",
    interestsText: "",
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to campaigns
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Create a campaign</h1>
          <p className="text-sm text-muted-foreground">
            Describe your offer and how customers should reach you. You can add images and
            publish after saving.
          </p>
        </div>
      </div>

      <CampaignForm
        mode="create"
        industries={formContext.industries}
        defaultValues={defaultValues}
        campaignLimit={formContext.campaignLimit}
        campaignsUsed={formContext.campaignsUsed}
        planName={formContext.planName}
        aiConfigured={getAiStatus().configured}
      />
    </div>
  )
}
