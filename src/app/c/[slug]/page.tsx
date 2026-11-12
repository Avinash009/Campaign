import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CampaignLanding } from "@/components/landing/campaign-landing"
import { getPublicCampaign } from "@/modules/campaigns/service"

/**
 * Public campaign landing page (Phase 3 task 3.8). Standalone — no dashboard
 * chrome — and only ACTIVE campaigns of ACTIVE businesses resolve; everything
 * else is a 404 so paused/archived pages go offline immediately.
 */

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const campaign = await getPublicCampaign(slug)

  if (!campaign) {
    return { title: "Campaign not available" }
  }

  const title = campaign.headline?.trim() || campaign.name
  const description =
    campaign.promoDescription?.trim() ||
    campaign.description?.trim() ||
    `${campaign.name} — published by ${campaign.business.name}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  }
}

export default async function PublicCampaignPage({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params
  const campaign = await getPublicCampaign(slug)
  if (!campaign) notFound()

  return <CampaignLanding campaign={campaign} />
}
