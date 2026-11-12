"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch, ApiClientError } from "@/lib/api-client"
import { publicImageSrc } from "@/lib/image-src"
import { MAX_CAMPAIGN_IMAGES } from "@/modules/campaigns/constants"
import type { CampaignImageDto } from "@/modules/campaigns/types"

interface CampaignImageManagerProps {
  campaignId: string
  images: CampaignImageDto[]
  editable: boolean
}

/** Multi-image upload + removal (Phase 3 task 3.3). */
export function CampaignImageManager({
  campaignId,
  images,
  editable,
}: CampaignImageManagerProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const remaining = Math.max(0, MAX_CAMPAIGN_IMAGES - images.length)

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return

    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more image${remaining === 1 ? "" : "s"} to this campaign.`)
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      for (const file of files) formData.append("images", file)
      await apiFetch(`/api/campaigns/${campaignId}/images`, {
        method: "POST",
        body: formData,
      })
      toast.success(files.length === 1 ? "Image added" : `${files.length} images added`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Could not upload the images. Please try again.",
      )
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function removeImage(imageId: string) {
    setRemoving(imageId)
    try {
      await apiFetch(`/api/campaigns/${campaignId}/images/${imageId}`, { method: "DELETE" })
      toast.success("Image removed")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Could not remove the image. Please try again.",
      )
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-4">
      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No images yet. Add up to {MAX_CAMPAIGN_IMAGES} photos — the first one becomes the
          landing-page cover.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <li key={image.id} className="group relative overflow-hidden rounded-lg border border-border">
              <div className="relative aspect-[4/3] bg-muted">
                <Image
                  src={publicImageSrc(image.url)}
                  alt={image.altText ?? "Campaign image"}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
              {editable && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  aria-label="Remove image"
                  disabled={removing !== null}
                  onClick={() => void removeImage(image.id)}
                >
                  {removing === image.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-4" aria-hidden />
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            id="campaign-images"
            onChange={(event) => void handleFiles(event.target.files)}
            disabled={uploading || remaining === 0}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading || remaining === 0}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-4" aria-hidden />
            )}
            {uploading ? "Uploading…" : "Add images"}
          </Button>
          <span className="text-xs text-muted-foreground">
            JPG, PNG or WebP · up to 5 MB each · {remaining} slot{remaining === 1 ? "" : "s"} left
          </span>
        </div>
      )}
    </div>
  )
}
