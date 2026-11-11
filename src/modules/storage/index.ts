import { mkdir, writeFile, unlink } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { getEnv } from "@/lib/env"
import { ApiError } from "@/lib/errors"

/**
 * File storage abstraction.
 * - Local adapter (development): writes to LOCAL_STORAGE_PATH and serves via
 *   the public folder. Note: `next build` snapshots the public folder, so the
 *   GCS driver is required for production uploads.
 * - GCS adapter (production): configured via STORAGE_DRIVER=gcs — implemented
 *   in Phase 8 together with the deployment work.
 */

export interface StoredFile {
  url: string
  key: string
  contentType: string
  size: number
}

export interface UploadInput {
  data: Buffer
  contentType: string
  /** Relative storage key (no leading slash), e.g. "businesses/<id>/campaigns/<file>.jpg". */
  key: string
}

export interface StorageAdapter {
  readonly driver: "local" | "gcs"
  upload(input: UploadInput): Promise<StoredFile>
  remove(key: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Upload validation
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export function validateImageUpload(input: { contentType: string; size: number }): void {
  if (!ALLOWED_IMAGE_TYPES.has(input.contentType)) {
    throw ApiError.badRequest(
      "unsupported_image_type",
      "Only JPG, PNG or WebP images are allowed.",
    )
  }
  if (input.size > MAX_IMAGE_BYTES) {
    throw ApiError.badRequest("image_too_large", "Images must be 5 MB or smaller.")
  }
}

/** Builds a collision-free storage key under the given prefix. */
export function buildImageKey(prefix: string, contentType: string): string {
  const ext = EXTENSION_BY_TYPE[contentType]
  if (!ext) throw ApiError.badRequest("unsupported_image_type", "Unsupported image type.")
  const safePrefix = prefix.replace(/\/+$/, "")
  return `${safePrefix}/${Date.now()}-${randomUUID()}.${ext}`
}

// ---------------------------------------------------------------------------
// Local adapter (development)
// ---------------------------------------------------------------------------

export class LocalStorageAdapter implements StorageAdapter {
  readonly driver = "local" as const

  constructor(private readonly root: string, private readonly publicBaseUrl: string) {}

  async upload(input: UploadInput): Promise<StoredFile> {
    assertSafeKey(input.key)
    const target = path.join(process.cwd(), this.root, input.key)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, input.data)
    const normalizedRoot = this.root.replace(/\\/g, "/").replace(/^public\//, "")
    return {
      url: `${this.publicBaseUrl.replace(/\/$/, "")}/${normalizedRoot}/${input.key}`,
      key: input.key,
      contentType: input.contentType,
      size: input.data.byteLength,
    }
  }

  async remove(key: string): Promise<void> {
    assertSafeKey(key)
    const target = path.join(process.cwd(), this.root, key)
    await unlink(target).catch(() => undefined)
  }
}

function assertSafeKey(key: string): void {
  const normalized = key.replace(/\\/g, "/")
  if (normalized.startsWith("/") || normalized.includes("..") || normalized.includes("\0")) {
    throw ApiError.badRequest("unsafe_storage_key", "Invalid storage key.")
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getStorage(): StorageAdapter {
  const env = getEnv()
  switch (env.STORAGE_DRIVER) {
    case "local":
      return new LocalStorageAdapter(env.LOCAL_STORAGE_PATH, env.APP_URL)
    case "gcs":
      // Phase 8: implement with @google-cloud/storage + GCS_BUCKET_NAME.
      throw ApiError.serviceUnavailable(
        "storage_not_configured",
        "Cloud storage is not configured yet. Set STORAGE_DRIVER=local for development.",
      )
    default:
      throw ApiError.serviceUnavailable("storage_not_configured", "Unknown storage driver.")
  }
}
