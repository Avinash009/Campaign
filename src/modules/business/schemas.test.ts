import { describe, expect, it } from "vitest"
import {
  acceptInviteSchema,
  inviteMemberSchema,
  onboardingSchema,
  profileUpdateSchema,
} from "./schemas"

const validOnboarding = {
  businessName: "Sri Geetha Realty",
  businessEmail: "hello@srigeetha.test",
  phone: "+91 98765 43210",
  industrySlug: "real-estate",
}

describe("onboardingSchema", () => {
  it("accepts the minimum required fields", () => {
    const parsed = onboardingSchema.parse(validOnboarding)
    expect(parsed.businessName).toBe("Sri Geetha Realty")
    expect(parsed.website).toBeUndefined()
    expect(parsed.city).toBeUndefined()
  })

  it("trims text and converts blank optional fields to undefined", () => {
    const parsed = onboardingSchema.parse({
      ...validOnboarding,
      businessName: "  Sri Geetha Realty  ",
      website: "",
      city: "   ",
      description: "  Homes in Hyderabad.  ",
    })
    expect(parsed.businessName).toBe("Sri Geetha Realty")
    expect(parsed.website).toBeUndefined()
    expect(parsed.city).toBeUndefined()
    expect(parsed.description).toBe("Homes in Hyderabad.")
  })

  it("requires a business name, valid email, phone and industry", () => {
    expect(onboardingSchema.safeParse({ ...validOnboarding, businessName: "A" }).success).toBe(false)
    expect(onboardingSchema.safeParse({ ...validOnboarding, businessEmail: "nope" }).success).toBe(false)
    expect(onboardingSchema.safeParse({ ...validOnboarding, phone: "12" }).success).toBe(false)
    expect(onboardingSchema.safeParse({ ...validOnboarding, industrySlug: "" }).success).toBe(false)
  })

  it("rejects a website without a scheme", () => {
    expect(onboardingSchema.safeParse({ ...validOnboarding, website: "example.com" }).success).toBe(
      false,
    )
  })
})

describe("profileUpdateSchema", () => {
  it("accepts a single changed field", () => {
    const parsed = profileUpdateSchema.parse({ city: "Bengaluru" })
    expect(parsed.city).toBe("Bengaluru")
    expect(parsed.businessName).toBeUndefined()
  })

  it("treats empty strings as no change and rejects an empty update", () => {
    expect(profileUpdateSchema.safeParse({ city: "" }).success).toBe(false)
    expect(profileUpdateSchema.safeParse({}).success).toBe(false)
  })

  it("validates a changed phone number", () => {
    expect(profileUpdateSchema.safeParse({ phone: "abc" }).success).toBe(false)
    expect(profileUpdateSchema.safeParse({ phone: "+91 98765 43210" }).success).toBe(true)
  })
})

describe("inviteMemberSchema", () => {
  it("allows ADMIN and MEMBER invitations only", () => {
    expect(
      inviteMemberSchema.safeParse({ email: "person@business.test", role: "ADMIN" }).success,
    ).toBe(true)
    expect(
      inviteMemberSchema.safeParse({ email: "person@business.test", role: "MEMBER" }).success,
    ).toBe(true)
    expect(
      inviteMemberSchema.safeParse({ email: "person@business.test", role: "OWNER" }).success,
    ).toBe(false)
  })

  it("rejects invalid emails", () => {
    expect(inviteMemberSchema.safeParse({ email: "nope", role: "MEMBER" }).success).toBe(false)
  })
})

describe("acceptInviteSchema", () => {
  it("rejects short or empty tokens", () => {
    expect(acceptInviteSchema.safeParse({ token: "" }).success).toBe(false)
    expect(acceptInviteSchema.safeParse({ token: "too-short" }).success).toBe(false)
  })

  it("accepts a base64url token", () => {
    expect(acceptInviteSchema.safeParse({ token: "a".repeat(43) }).success).toBe(true)
  })
})
