import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CampaignLanding } from "@/components/landing/campaign-landing"
import { ApiError } from "@/lib/errors"
import { requireBusinessContext } from "@/modules/auth/session"
import { getCampaignPreview } from "@/modules/campaigns/service"

/**
 * Owner/admin preview of a campaign landing page (Phase 3 task 3.6). Lives
 * outside the dashboard group so the page renders without the app shell —
 * exactly as visitors will see it — with a status banner on top.
 */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Campaign preview",
  robots: { index: false, follow: false },
}

export default async function CampaignPreviewPage({
  params,
}: PageProps<"/preview/campaigns/[id]">) {
  const context = await requireBusinessContext()
  const { id } = await params

  let preview
  try {
    preview = await getCampaignPreview(context, id)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }

  return <CampaignLanding campaign={preview.campaign} previewStatus={preview.status} />
}
