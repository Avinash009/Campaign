import { describe, expect, it } from "vitest"
import { isValidVisitorId, readCookieValue } from "./visitor"

describe("isValidVisitorId", () => {
  it("accepts UUIDs and other opaque ids of 8–64 safe characters", () => {
    expect(isValidVisitorId("8f14e45f-ceea-4e7a-9c2a-1b2c3d4e5f60")).toBe(true)
    expect(isValidVisitorId("abcdefgh")).toBe(true)
    expect(isValidVisitorId("A1_b-2-c3")).toBe(true)
    expect(isValidVisitorId("a".repeat(64))).toBe(true)
  })

  it("rejects short, long or unsafe ids", () => {
    expect(isValidVisitorId("")).toBe(false)
    expect(isValidVisitorId("abcdefg")).toBe(false)
    expect(isValidVisitorId("a".repeat(65))).toBe(false)
    expect(isValidVisitorId("bad id with spaces")).toBe(false)
    expect(isValidVisitorId("semi;colon")).toBe(false)
  })
})

describe("readCookieValue", () => {
  it("reads one named cookie from a raw Cookie header", () => {
    expect(readCookieValue("ch_visitor=abc12345; theme=dark", "ch_visitor")).toBe("abc12345")
    expect(readCookieValue("theme=dark; ch_visitor=abc12345", "ch_visitor")).toBe("abc12345")
  })

  it("returns null when the header is missing, the cookie is absent or the value is empty", () => {
    expect(readCookieValue(null, "ch_visitor")).toBeNull()
    expect(readCookieValue("theme=dark", "ch_visitor")).toBeNull()
    expect(readCookieValue("ch_visitor=; theme=dark", "ch_visitor")).toBeNull()
  })

  it("keeps any equals signs inside the value", () => {
    expect(readCookieValue("ch_visitor=abc=12345", "ch_visitor")).toBe("abc=12345")
  })
})
