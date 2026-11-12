"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { CampaignStatus } from "@prisma/client"
import { toast } from "sonner"
import { Copy, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import {
  CAMPAIGN_STATUS_LABELS,
  TRANSITION_ACTIONS,
  allowedCampaignTransitions,
} from "@/modules/campaigns/lifecycle"

interface CampaignActionsProps {
  campaignId: string
  status: CampaignStatus
  publicUrl: string
  canManage: boolean
}

function transitionLabel(from: CampaignStatus, to: CampaignStatus): string {
  if (to === "ACTIVE" && from === "PAUSED") return "Resume"
  return TRANSITION_ACTIONS[to]?.label ?? CAMPAIGN_STATUS_LABELS[to]
}

function successMessage(to: CampaignStatus): string {
  switch (to) {
    case "ACTIVE":
      return "Campaign is live"
    case "PAUSED":
      return "Campaign paused — the public page is offline"
    case "COMPLETED":
      return "Campaign marked complete"
    case "ARCHIVED":
      return "Campaign archived"
    default:
      return "Campaign updated"
  }
}

/** Publish/pause/complete/archive controls with a confirmation for archive. */
export function CampaignActions({
  campaignId,
  status,
  publicUrl,
  canManage,
}: CampaignActionsProps) {
  const router = useRouter()
  const [pending, setPending] = useState<CampaignStatus | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const transitions = allowedCampaignTransitions(status).filter(
    (target) => target !== "ARCHIVED",
  )

  async function changeStatus(target: CampaignStatus) {
    setPending(target)
    try {
      await apiFetch(`/api/campaigns/${campaignId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: target }),
      })
      toast.success(successMessage(target))
      setConfirmArchive(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Could not update the campaign. Please try again.",
      )
    } finally {
      setPending(null)
    }
  }

  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success("Public link copied")
    } catch {
      toast.error("Could not copy the link. Select it from the address bar instead.")
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "ACTIVE" && (
        <Button variant="outline" asChild>
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" aria-hidden /> Open public page
          </a>
        </Button>
      )}

      <Button variant="outline" onClick={copyPublicUrl}>
        <Copy className="size-4" aria-hidden /> Copy public link
      </Button>

      {canManage &&
        transitions.map((target) => {
          const isPending = pending === target
          return (
            <Button
              key={target}
              variant={target === "ACTIVE" ? "default" : "outline"}
              disabled={pending !== null}
              onClick={() => void changeStatus(target)}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isPending ? "Updating…" : transitionLabel(status, target)}
            </Button>
          )
        })}

      {canManage && status !== "ARCHIVED" && (
        <Dialog open={confirmArchive} onOpenChange={setConfirmArchive}>
          <Button variant="destructive" disabled={pending !== null} onClick={() => setConfirmArchive(true)}>
            Archive
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive this campaign?</DialogTitle>
              <DialogDescription>
                The public page goes offline and the campaign becomes read-only. Archived
                campaigns cannot be reopened.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmArchive(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={pending !== null}
                onClick={() => void changeStatus("ARCHIVED")}
              >
                {pending === "ARCHIVED" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {pending === "ARCHIVED" ? "Archiving…" : "Archive campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!canManage && (
        <span className="text-xs text-muted-foreground">
          Only owners and admins can change campaign status.
        </span>
      )}
    </div>
  )
}
