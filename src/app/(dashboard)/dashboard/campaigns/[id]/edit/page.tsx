import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { CampaignForm } from "@/components/campaigns/campaign-form"
import { requireBusinessContext } from "@/modules/auth/session"
import { ApiError } from "@/lib/errors"
import { canWriteCampaigns } from "@/modules/auth/rbac"
import {
  getCampaignFormContext,
  getCampaignFormValues,
} from "@/modules/campaigns/service"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Edit campaign",
}

/** Campaign edit form (Phase 3 task 3.5). Archived campaigns are read-only. */
export default async function EditCampaignPage({
  params,
}: PageProps<"/dashboard/campaigns/[id]/edit">) {
  const context = await requireBusinessContext()
  const { id } = await params

  if (!canWriteCampaigns(context.role)) redirect(`/dashboard/campaigns/${id}`)

  let values
  let status
  try {
    const formValues = await getCampaignFormValues(context, id)
    values = formValues.values
    status = formValues.status
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }

  if (status === "ARCHIVED") redirect(`/dashboard/campaigns/${id}`)

  const formContext = await getCampaignFormContext(context.businessId)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-3">
        <Link
          href={`/dashboard/campaigns/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to campaign
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Edit campaign</h1>
          <p className="text-sm text-muted-foreground">
            Changes appear on the public page immediately after you save.
          </p>
        </div>
      </div>

      <CampaignForm
        mode="edit"
        campaignId={id}
        industries={formContext.industries}
        defaultValues={values}
        campaignLimit={formContext.campaignLimit}
        campaignsUsed={formContext.campaignsUsed}
        planName={formContext.planName}
      />
    </div>
  )
}
