import { randomUUID } from "node:crypto"
import { readFile, rm, stat } from "node:fs/promises"
import path from "node:path"
import { afterAll, describe, expect, it } from "vitest"
import {
  buildImageKey,
  LocalStorageAdapter,
  MAX_IMAGE_BYTES,
  validateImageUpload,
} from "./index"
import { ApiError } from "@/lib/errors"

// The local adapter joins process.cwd() with its root, so tests use a
// throwaway directory inside the project (gitignored) instead of the OS
// temp dir (absolute paths do not compose with path.join on Windows).
const testRoot = `.uploads-test-${randomUUID().slice(0, 8)}`
const adapter = new LocalStorageAdapter(testRoot, "http://localhost:3000")

afterAll(async () => {
  await rm(path.join(process.cwd(), "public", testRoot), { recursive: true, force: true }).catch(
    () => undefined,
  )
  await rm(path.join(process.cwd(), testRoot), { recursive: true, force: true }).catch(() => undefined)
})

describe("validateImageUpload", () => {
  it("accepts supported types under the size cap", () => {
    expect(() => validateImageUpload({ contentType: "image/jpeg", size: 1024 })).not.toThrow()
    expect(() => validateImageUpload({ contentType: "image/png", size: MAX_IMAGE_BYTES })).not.toThrow()
    expect(() => validateImageUpload({ contentType: "image/webp", size: 1 })).not.toThrow()
  })

  it("rejects unsupported content types", () => {
    expect(() => validateImageUpload({ contentType: "image/gif", size: 1024 })).toThrowError(ApiError)
    expect(() => validateImageUpload({ contentType: "application/pdf", size: 1024 })).toThrowError(
      ApiError,
    )
  })

  it("rejects files above the size cap", () => {
    expect(() =>
      validateImageUpload({ contentType: "image/png", size: MAX_IMAGE_BYTES + 1 }),
    ).toThrowError(ApiError)
  })
})

describe("buildImageKey", () => {
  it("places a unique file under the given prefix with the right extension", () => {
    const key = buildImageKey("businesses/abc/campaigns/xyz", "image/png")
    expect(key.startsWith("businesses/abc/campaigns/xyz/")).toBe(true)
    expect(key.endsWith(".png")).toBe(true)
  })

  it("rejects unsupported content types", () => {
    expect(() => buildImageKey("prefix", "image/gif")).toThrowError(ApiError)
  })

  it("trims trailing slashes from the prefix", () => {
    const key = buildImageKey("prefix//", "image/jpeg")
    expect(key.startsWith("prefix/")).toBe(true)
    expect(key).not.toContain("//")
  })
})

describe("LocalStorageAdapter", () => {
  it("uploads a file and returns a public URL", async () => {
    const key = `businesses/${randomUUID().slice(0, 8)}/logo.png`
    const stored = await adapter.upload({
      data: Buffer.from("fake-png-bytes"),
      contentType: "image/png",
      key,
    })

    expect(stored.url).toBe(`http://localhost:3000/${testRoot}/${key}`)
    expect(stored.key).toBe(key)
    expect(stored.contentType).toBe("image/png")
    expect(stored.size).toBe(14)

    const onDisk = path.join(process.cwd(), testRoot, key)
    await expect(stat(onDisk)).resolves.toBeTruthy()
    await expect(readFile(onDisk, "utf8")).resolves.toBe("fake-png-bytes")
  })

  it("rejects path traversal keys", async () => {
    await expect(
      adapter.upload({ data: Buffer.from("x"), contentType: "image/png", key: "../outside.png" }),
    ).rejects.toThrowError(ApiError)

    await expect(
      adapter.upload({ data: Buffer.from("x"), contentType: "image/png", key: "/absolute.png" }),
    ).rejects.toThrowError(ApiError)
  })

  it("removes files without throwing when they are already gone", async () => {
    const key = `businesses/${randomUUID().slice(0, 8)}/gone.png`
    await adapter.upload({ data: Buffer.from("x"), contentType: "image/png", key })
    await adapter.remove(key)
    await expect(stat(path.join(process.cwd(), testRoot, key))).rejects.toThrow()
    await expect(adapter.remove(key)).resolves.toBeUndefined()
  })
})
