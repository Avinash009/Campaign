import { describe, expect, it } from "vitest"
import {
  DUPLICATE_WINDOW_MS,
  LEAD_EXPORT_LIMIT,
  buildCsv,
  endOfDayIst,
  escapeCsvCell,
  leadReference,
  normalisePhone,
  parseFollowUpDate,
  startOfDayIst,
  startOfTodayIst,
  statusUpdateFields,
} from "./helpers"

describe("normalisePhone", () => {
  it("strips spaces, hyphens and the plus prefix", () => {
    expect(normalisePhone("+91 98451 23456")).toBe("919845123456")
    expect(normalisePhone("98451-23456")).toBe("919845123456")
  })

  it("prefixes 10-digit numbers with the country code", () => {
    expect(normalisePhone("09845123456")).toBe("919845123456")
    expect(normalisePhone("919845123456")).toBe("919845123456")
  })

  it("keeps unknown-length numbers as digits so validation can reject them", () => {
    expect(normalisePhone("12345")).toBe("12345")
    expect(normalisePhone("abc")).toBe("")
  })
})

describe("leadReference", () => {
  it("derives a short, stable reference from the lead id", () => {
    expect(leadReference("8f14e45f-ceea-4e7a-9c2a-1b2c3d4e5f60")).toBe("ENQ-8F14E45F")
    expect(leadReference("8f14e45f-ceea-4e7a-9c2a-1b2c3d4e5f60")).toBe("ENQ-8F14E45F")
  })
})

describe("statusUpdateFields", () => {
  const now = new Date("2026-11-13T10:00:00Z")

  it("stamps lastContactedAt when a lead is contacted", () => {
    expect(statusUpdateFields("CONTACTED", now)).toEqual({
      status: "CONTACTED",
      lastContactedAt: now,
      convertedAt: null,
      lostAt: null,
    })
  })

  it("sets exactly one outcome timestamp", () => {
    expect(statusUpdateFields("CONVERTED", now)).toMatchObject({
      convertedAt: now,
      lostAt: null,
    })
    expect(statusUpdateFields("LOST", now)).toMatchObject({
      convertedAt: null,
      lostAt: now,
    })
  })

  it("clears both outcomes when the status is reversed", () => {
    expect(statusUpdateFields("QUALIFIED", now)).toEqual({
      status: "QUALIFIED",
      convertedAt: null,
      lostAt: null,
    })
  })
})

describe("parseFollowUpDate", () => {
  it("schedules date-only input for 09:00 IST", () => {
    expect(parseFollowUpDate("2026-12-01")?.toISOString()).toBe("2026-12-01T03:30:00.000Z")
  })

  it("accepts a full ISO timestamp", () => {
    expect(parseFollowUpDate("2026-12-01T12:00:00.000Z")?.toISOString()).toBe(
      "2026-12-01T12:00:00.000Z",
    )
  })

  it("returns null for junk", () => {
    expect(parseFollowUpDate("tomorrow")).toBeNull()
  })
})

describe("IST day boundaries", () => {
  it("computes the start of the current IST day", () => {
    // 2026-11-13T20:00:00Z is 01:30 IST on 14 Nov 2026.
    expect(startOfTodayIst(new Date("2026-11-13T20:00:00Z")).toISOString()).toBe(
      "2026-11-13T18:30:00.000Z",
    )
  })

  it("returns inclusive day boundaries in IST", () => {
    expect(startOfDayIst("2026-11-13")?.toISOString()).toBe("2026-11-12T18:30:00.000Z")
    expect(endOfDayIst("2026-11-13")?.toISOString()).toBe("2026-11-13T18:29:59.999Z")
  })

  it("rejects malformed dates", () => {
    expect(startOfDayIst("13-11-2026")).toBeNull()
    expect(endOfDayIst("")).toBeNull()
  })
})

describe("escapeCsvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(escapeCsvCell('Priya, "PS"')).toBe('"Priya, ""PS"""')
    expect(escapeCsvCell("line 1\nline 2")).toBe('"line 1\nline 2"')
  })

  it("neutralises spreadsheet formulas", () => {
    expect(escapeCsvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)")
    expect(escapeCsvCell("+91")).toBe("'+91")
  })

  it("writes empty cells for null and undefined", () => {
    expect(escapeCsvCell(null)).toBe("")
    expect(escapeCsvCell(undefined)).toBe("")
    expect(escapeCsvCell(0)).toBe("0")
  })
})

describe("buildCsv", () => {
  it("adds a UTF-8 BOM and CRLF line endings", () => {
    const csv = buildCsv(["Name", "City"], [["Priya", "Hyderabad"]])
    expect(csv).toBe("\uFEFFName,City\r\nPriya,Hyderabad")
  })
})

describe("export constants", () => {
  it("keeps the documented limits", () => {
    expect(DUPLICATE_WINDOW_MS).toBe(24 * 60 * 60 * 1000)
    expect(LEAD_EXPORT_LIMIT).toBe(5000)
  })
})
