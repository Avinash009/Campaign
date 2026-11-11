import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "./password"

describe("password hashing (scrypt)", () => {
  it("stores hashes in the scrypt$salt$hash format", async () => {
    const stored = await hashPassword("CorrectHorse9")
    expect(stored.startsWith("scrypt$")).toBe(true)
    const parts = stored.split("$")
    expect(parts).toHaveLength(3)
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/) // 16-byte salt as hex
    expect(parts[2]).toMatch(/^[0-9a-f]{128}$/) // 64-byte hash as hex
  })

  it("verifies the correct password", async () => {
    const stored = await hashPassword("CorrectHorse9")
    await expect(verifyPassword("CorrectHorse9", stored)).resolves.toBe(true)
  })

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("CorrectHorse9")
    await expect(verifyPassword("WrongHorse1", stored)).resolves.toBe(false)
  })

  it("salts hashes — same password produces different hashes", async () => {
    const a = await hashPassword("SamePassword1")
    const b = await hashPassword("SamePassword1")
    expect(a).not.toEqual(b)
  })

  it("rejects malformed stored hashes without throwing", async () => {
    await expect(verifyPassword("whatever1", "not-a-hash")).resolves.toBe(false)
    await expect(verifyPassword("whatever1", "bcrypt$abc$def")).resolves.toBe(false)
    await expect(verifyPassword("whatever1", "scrypt$only-two")).resolves.toBe(false)
    // hash of the wrong length must not pass timingSafeEqual
    await expect(verifyPassword("whatever1", `scrypt$${"a".repeat(32)}$${"b".repeat(10)}`)).resolves.toBe(false)
  })
})
