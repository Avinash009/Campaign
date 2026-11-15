"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { BusinessStatus } from "@prisma/client"
import { toast } from "sonner"
import { Loader2, Play, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch, errorMessage } from "@/lib/api-client"

interface BusinessStatusActionProps {
  businessId: string
  businessName: string
  status: BusinessStatus
}

/**
 * Suspend/reactivate a tenant (Phase 6 task 6.1). Suspending takes the
 * business's public campaign pages offline; data is retained and reactivation
 * is immediate.
 */
export function BusinessStatusAction({
  businessId,
  businessName,
  status,
}: BusinessStatusActionProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function update(nextStatus: BusinessStatus) {
    setPending(true)
    try {
      await apiFetch(`/api/admin/businesses/${businessId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      })
      toast.success(
        nextStatus === "SUSPENDED"
          ? `${businessName} suspended — public pages are offline`
          : `${businessName} reactivated`,
      )
      setConfirmOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the business. Please try again."))
    } finally {
      setPending(false)
    }
  }

  if (status === "ACTIVE") {
    return (
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
          <Ban className="size-4" aria-hidden /> Suspend
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {businessName}?</DialogTitle>
            <DialogDescription>
              Their public campaign pages go offline immediately. The business, its data and
              its team stay in place, and you can reactivate it at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => void update("SUSPENDED")}
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {pending ? "Suspending…" : "Suspend business"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => void update("ACTIVE")}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Play className="size-4" aria-hidden />
      )}
      {pending ? "Activating…" : "Activate"}
    </Button>
  )
}
