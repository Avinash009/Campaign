"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { apiFetch, errorMessage } from "@/lib/api-client"

const ACCEPTED = "image/jpeg,image/png,image/webp"
const MAX_BYTES = 5 * 1024 * 1024

interface LogoUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

/**
 * Uploads a business logo through our own storage API. The returned URL is
 * stored on the business record — external image URLs are rejected server-side.
 * Local development stores files under `public/uploads`; the helper text says
 * so instead of implying cloud storage that is not configured yet.
 */
export function LogoUploader({ value, onChange, disabled = false }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return

    if (!ACCEPTED.split(",").includes(file.type)) {
      toast.error("Use a JPG, PNG or WebP image.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("Images must be 5 MB or smaller.")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await apiFetch<{ logoUrl: string }>("/api/business/logo", {
        method: "POST",
        body: formData,
      })
      onChange(result.logoUrl)
      toast.success("Logo uploaded")
    } catch (error) {
      toast.error(errorMessage(error, "Could not upload the logo. Please try again."))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
          {value ? (
            <Image
              src={value}
              alt="Business logo preview"
              width={80}
              height={80}
              unoptimized
              className="size-full object-contain"
            />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-4" aria-hidden />
            )}
            {uploading ? "Uploading…" : value ? "Replace logo" : "Upload logo"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => onChange(null)}
            >
              <Trash2 className="size-4" aria-hidden /> Remove
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <p className="text-xs text-muted-foreground">
        JPG, PNG or WebP up to 5 MB. Square logos look best. Files are stored on this
        CampaignHub server — cloud storage is not configured in this environment.
      </p>
    </div>
  )
}
