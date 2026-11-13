import { describe, expect, it } from "vitest"
import {
  leadAssignSchema,
  leadEnquirySchema,
  leadFiltersToSearchParams,
  leadFollowUpScheduleSchema,
  leadListQuerySchema,
  leadNoteSchema,
  leadStatusUpdateSchema,
  parseLeadListQuery,
} from "./schemas"

const validEnquiry = {
  name: "Priya Sharma",
  phone: "+91 98451 23456",
  email: "",
  city: "Hyderabad",
  interestedIn: "3 BHK",
  message: "",
  consent: true,
  website: "",
} as const

describe("leadEnquirySchema", () => {
  it("accepts a minimal enquiry and drops blank optional fields", () => {
    const parsed = leadEnquirySchema.parse(validEnquiry)
    expect(parsed.name).toBe("Priya Sharma")
    expect(parsed.email).toBeUndefined()
    expect(parsed.message).toBeUndefined()
    expect(parsed.consent).toBe(true)
  })

  it("requires consent", () => {
    const result = leadEnquirySchema.safeParse({ ...validEnquiry, consent: false })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("consent"))).toBe(true)
    }
  })

  it("validates the phone and email", () => {
    expect(leadEnquirySchema.safeParse({ ...validEnquiry, phone: "abc" }).success).toBe(false)
    expect(leadEnquirySchema.safeParse({ ...validEnquiry, email: "not-an-email" }).success).toBe(
      false,
    )
    expect(
      leadEnquirySchema.safeParse({ ...validEnquiry, email: "priya@example.com" }).success,
    ).toBe(true)
  })

  it("accepts a filled honeypot so the service can reject it quietly", () => {
    expect(leadEnquirySchema.safeParse({ ...validEnquiry, website: "spam" }).success).toBe(true)
  })

  it("rejects a name shorter than two characters", () => {
    expect(leadEnquirySchema.safeParse({ ...validEnquiry, name: " P " }).success).toBe(false)
  })
})

describe("leadStatusUpdateSchema", () => {
  it("accepts a valid status with an optional note", () => {
    expect(leadStatusUpdateSchema.parse({ status: "CONTACTED" })).toEqual({
      status: "CONTACTED",
      note: undefined,
    })
  })

  it("rejects unknown statuses", () => {
    expect(leadStatusUpdateSchema.safeParse({ status: "HOT" }).success).toBe(false)
  })
})

describe("leadAssignSchema", () => {
  it("turns an empty value into null (unassign)", () => {
    expect(leadAssignSchema.parse({ userId: "" })).toEqual({ userId: null })
    expect(leadAssignSchema.parse({ userId: null })).toEqual({ userId: null })
  })

  it("keeps a teammate id", () => {
    expect(leadAssignSchema.parse({ userId: "user_123" })).toEqual({ userId: "user_123" })
    expect(leadAssignSchema.safeParse({ userId: "   " }).success).toBe(false)
  })
})

describe("leadNoteSchema", () => {
  it("requires a non-empty note", () => {
    expect(leadNoteSchema.safeParse({ note: "   " }).success).toBe(false)
    expect(leadNoteSchema.parse({ note: "  Called twice  " })).toEqual({ note: "Called twice" })
  })
})

describe("leadFollowUpScheduleSchema", () => {
  it("converts a date-only value to 09:00 IST", () => {
    const parsed = leadFollowUpScheduleSchema.parse({ scheduledFor: "2099-01-15" })
    expect(parsed.scheduledFor.toISOString()).toBe("2099-01-15T03:30:00.000Z")
  })

  it("rejects dates in the past", () => {
    const result = leadFollowUpScheduleSchema.safeParse({ scheduledFor: "2020-01-01" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid input", () => {
    expect(leadFollowUpScheduleSchema.safeParse({ scheduledFor: "next week" }).success).toBe(false)
  })
})

describe("leadListQuerySchema", () => {
  it("coerces paging values and keeps valid filters", () => {
    const parsed = leadListQuerySchema.parse({
      page: "2",
      pageSize: "50",
      status: "NEW",
      assignedTo: "me",
      search: "priya",
    })
    expect(parsed.page).toBe(2)
    expect(parsed.pageSize).toBe(50)
    expect(parsed.status).toBe("NEW")
    expect(parsed.assignedTo).toBe("me")
    expect(parsed.search).toBe("priya")
  })

  it("rejects out-of-range pages and malformed dates", () => {
    expect(leadListQuerySchema.safeParse({ page: "0" }).success).toBe(false)
    expect(leadListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false)
    expect(leadListQuerySchema.safeParse({ from: "13-11-2026" }).success).toBe(false)
  })
})

describe("parseLeadListQuery", () => {
  it("fills in defaults for empty params", () => {
    expect(parseLeadListQuery({})).toEqual({
      page: 1,
      pageSize: 20,
      status: undefined,
      campaignId: undefined,
      assignedTo: undefined,
      search: undefined,
      from: undefined,
      to: undefined,
    })
  })

  it("reads URLSearchParams and takes the first repeated value", () => {
    const parsed = parseLeadListQuery(
      new URLSearchParams("page=3&status=LOST&search=priya&search=rahul"),
    )
    expect(parsed.page).toBe(3)
    expect(parsed.status).toBe("LOST")
    expect(parsed.search).toBe("priya")
  })

  it("falls back to defaults when any value is invalid", () => {
    expect(parseLeadListQuery({ page: "abc", status: "HOT" })).toEqual({
      page: 1,
      pageSize: 20,
      status: undefined,
      campaignId: undefined,
      assignedTo: undefined,
      search: undefined,
      from: undefined,
      to: undefined,
    })
  })
})

describe("leadFiltersToSearchParams", () => {
  it("omits defaults and keeps active filters", () => {
    const params = leadFiltersToSearchParams({
      page: 1,
      pageSize: 20,
      status: "NEW",
      campaignId: "campaign_1",
      assignedTo: undefined,
      search: "priya",
      from: undefined,
      to: undefined,
    })
    expect(params.get("status")).toBe("NEW")
    expect(params.get("campaignId")).toBe("campaign_1")
    expect(params.get("search")).toBe("priya")
    expect(params.has("page")).toBe(false)
    expect(params.has("pageSize")).toBe(false)
  })

  it("includes non-default paging when asked", () => {
    const params = leadFiltersToSearchParams(
      {
        page: 3,
        pageSize: 50,
        status: "LOST",
        campaignId: undefined,
        assignedTo: undefined,
        search: undefined,
        from: undefined,
        to: undefined,
      },
      { includePage: true },
    )
    expect(params.get("page")).toBe("3")
    expect(params.get("pageSize")).toBe("50")
  })
})
