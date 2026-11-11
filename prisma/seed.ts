/**
 * CampaignHub seed script (idempotent — safe to run repeatedly).
 *
 *   npm run db:seed
 *
 * Seeds: industry catalog, subscription plans, a platform admin, and a demo
 * business ("Sri Green Realty") with an owner, a team member, two campaigns,
 * leads across the pipeline, activities, analytics events and a trial
 * subscription. Passwords come from env vars; anything missing is generated
 * randomly and logged once.
 *
 * NOTE: demo data is fictional development data, not real customers.
 */
import "dotenv/config"
import { randomBytes, randomUUID } from "node:crypto"
import { PrismaClient, Prisma } from "@prisma/client"
import { hashPassword } from "../src/modules/auth/password"

const prisma = new PrismaClient()

const daysAgo = (n: number): Date => new Date(Date.now() - n * 24 * 60 * 60 * 1000)
const daysAhead = (n: number): Date => new Date(Date.now() + n * 24 * 60 * 60 * 1000)

const CONSENT_TEXT =
  "I agree to be contacted by this business about my enquiry. My details are shared only with them."

function generatePassword(): string {
  // Meets the password policy (8+ chars, letter + number).
  return `Ch-${randomBytes(9).toString("base64url")}9`
}

async function upsertUser(input: {
  email: string
  name: string
  password: string
  isPlatformAdmin?: boolean
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      isPlatformAdmin: input.isPlatformAdmin ?? false,
      isActive: true,
    },
    create: {
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      isPlatformAdmin: input.isPlatformAdmin ?? false,
    },
  })
}

async function seedIndustries() {
  const industries = [
    {
      slug: "real-estate",
      name: "Real estate",
      description: "Property projects, site visits and buyer enquiries.",
      iconKey: "real-estate",
      sortOrder: 1,
    },
    {
      slug: "finance-loans",
      name: "Finance & loans",
      description: "Loan products, eligibility and callback requests.",
      iconKey: "finance-loans",
      sortOrder: 2,
    },
    {
      slug: "insurance",
      name: "Insurance",
      description: "Policies, renewals and advisory enquiries.",
      iconKey: "insurance",
      sortOrder: 3,
    },
    {
      slug: "education-coaching",
      name: "Education & coaching",
      description: "Courses, batches and admission enquiries.",
      iconKey: "education-coaching",
      sortOrder: 4,
    },
    {
      slug: "healthcare",
      name: "Healthcare",
      description: "Clinics, services and appointment requests.",
      iconKey: "healthcare",
      sortOrder: 5,
    },
    {
      slug: "retail-ecommerce",
      name: "Retail & e-commerce",
      description: "Products, offers and purchase enquiries.",
      iconKey: "retail-ecommerce",
      sortOrder: 6,
    },
    {
      slug: "travel-tourism",
      name: "Travel & tourism",
      description: "Packages, itineraries and booking enquiries.",
      iconKey: "travel-tourism",
      sortOrder: 7,
    },
    {
      slug: "other",
      name: "Other",
      description: "Any other business with promotions to run.",
      iconKey: "other",
      sortOrder: 8,
    },
  ]

  for (const industry of industries) {
    await prisma.industry.upsert({
      where: { slug: industry.slug },
      update: { name: industry.name, description: industry.description, iconKey: industry.iconKey, sortOrder: industry.sortOrder },
      create: industry,
    })
  }
  console.log(`Seeded ${industries.length} industries`)
}

async function seedPlans() {
  const plans: Array<{
    slug: string
    name: string
    description: string
    amount: number
    campaignLimit: number | null
    memberLimit: number | null
    features: string[]
    isFeatured: boolean
    sortOrder: number
  }> = [
    {
      slug: "starter",
      name: "Starter",
      description: "For small businesses running their first promotion.",
      amount: 99900,
      campaignLimit: 1,
      memberLimit: 3,
      features: ["1 active campaign", "Up to 3 team members", "Lead inbox & pipeline", "Email support"],
      isFeatured: false,
      sortOrder: 1,
    },
    {
      slug: "growth",
      name: "Growth",
      description: "For growing teams running regular campaigns.",
      amount: 249900,
      campaignLimit: 5,
      memberLimit: 10,
      features: [
        "5 active campaigns",
        "Up to 10 team members",
        "Analytics & CSV export",
        "Priority support",
      ],
      isFeatured: true,
      sortOrder: 2,
    },
    {
      slug: "scale",
      name: "Scale",
      description: "For high-volume businesses that need headroom.",
      amount: 599900,
      campaignLimit: null,
      memberLimit: null,
      features: [
        "Unlimited active campaigns",
        "Unlimited team members",
        "Advanced analytics",
        "Dedicated support",
      ],
      isFeatured: false,
      sortOrder: 3,
    },
  ]

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        amount: plan.amount,
        campaignLimit: plan.campaignLimit,
        memberLimit: plan.memberLimit,
        features: plan.features,
        isFeatured: plan.isFeatured,
        sortOrder: plan.sortOrder,
      },
      create: plan,
    })
  }
  console.log(`Seeded ${plans.length} subscription plans`)
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@campaignhub.test"
  const provided = process.env.ADMIN_PASSWORD
  const password = provided && provided.length >= 8 ? provided : generatePassword()

  await upsertUser({ email, name: "Platform Admin", password, isPlatformAdmin: true })

  if (!provided) {
    console.log(`Platform admin created — email: ${email} password: ${password} (generated; set ADMIN_PASSWORD in .env to pin it)`)
  } else {
    console.log(`Platform admin ready — email: ${email}`)
  }
}

async function seedDemoBusiness() {
  const ownerEmail = process.env.DEMO_OWNER_EMAIL ?? "owner@srigeenrealty.test"
  const ownerProvided = process.env.DEMO_OWNER_PASSWORD
  const ownerPassword = ownerProvided && ownerProvided.length >= 8 ? ownerProvided : generatePassword()

  const memberEmail = process.env.DEMO_MEMBER_EMAIL ?? "member@srigeenrealty.test"
  const memberProvided = process.env.DEMO_MEMBER_PASSWORD
  const memberPassword = memberProvided && memberProvided.length >= 8 ? memberProvided : generatePassword()

  const [owner, member] = await Promise.all([
    upsertUser({ email: ownerEmail, name: "Sunitha Rao", password: ownerPassword }),
    upsertUser({ email: memberEmail, name: "Kiran Kumar", password: memberPassword }),
  ])

  const industry = await prisma.industry.findUniqueOrThrow({ where: { slug: "real-estate" } })

  const business = await prisma.business.upsert({
    where: { slug: "sri-green-realty" },
    update: { name: "Sri Green Realty", ownerId: owner.id, industryId: industry.id },
    create: {
      name: "Sri Green Realty",
      slug: "sri-green-realty",
      email: "info@srigeenrealty.test",
      phone: "+919848012345",
      city: "Hyderabad",
      state: "Telangana",
      description:
        "Residential projects across Hyderabad — apartments, villas and plotted developments.",
      ownerId: owner.id,
      industryId: industry.id,
      onboardingCompletedAt: daysAgo(20),
    },
  })

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: business.id, userId: owner.id } },
    update: { role: "OWNER", status: "ACTIVE", userId: owner.id, joinedAt: daysAgo(20) },
    create: { businessId: business.id, userId: owner.id, role: "OWNER", status: "ACTIVE", joinedAt: daysAgo(20) },
  })

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: business.id, userId: member.id } },
    update: { role: "MEMBER", status: "ACTIVE", userId: member.id, joinedAt: daysAgo(12) },
    create: { businessId: business.id, userId: member.id, role: "MEMBER", status: "ACTIVE", joinedAt: daysAgo(12) },
  })

  // Campaigns
  const activeCampaign = await prisma.campaign.upsert({
    where: { slug: "luxury-apartments-hyderabad" },
    update: { businessId: business.id },
    create: {
      businessId: business.id,
      industryId: industry.id,
      createdById: owner.id,
      name: "Luxury apartments in Hyderabad",
      slug: "luxury-apartments-hyderabad",
      description: "Premium 2 & 3 BHK apartments at Kondapur, Hyderabad.",
      objective: "LEAD_GENERATION",
      status: "ACTIVE",
      startDate: daysAgo(14),
      endDate: daysAhead(30),
      headline: "Signature 2 & 3 BHK luxury apartments in the heart of Hyderabad",
      promoDescription:
        "Vaastralux Homes — limited inventory in tower 2 with clubhouse, rooftop infinity pool and 80% open space.",
      productDetails:
        "2 BHK (1,235 sq.ft), 2.5 BHK (1,480 sq.ft) and 3 BHK (1,815 sq.ft) homes with premium fittings, clubhouse, gym, kids' play area and 2-level basement parking.",
      offerDetails: "Early-bird pricing — ₹85 lakhs onwards. Limited inventory in tower 2.",
      priceDisplay: "₹85 Lakhs onwards",
      ctaType: "SCHEDULE_VISIT",
      contactName: "Sri Green Realty sales desk",
      contactPhone: "+919848012345",
      contactEmail: "sales@srigeenrealty.test",
      targetLocation: "Hyderabad, Telangana",
      targetAudience: "Families and working professionals upgrading to premium homes",
      interests: ["luxury homes", "investment property", "gated community"],
      publishedAt: daysAgo(10),
    },
  })

  await prisma.campaign.upsert({
    where: { slug: "weekend-site-visit-drive" },
    update: { businessId: business.id },
    create: {
      businessId: business.id,
      industryId: industry.id,
      createdById: owner.id,
      name: "Weekend site visit drive",
      slug: "weekend-site-visit-drive",
      description: "Guided site visits every Saturday with travel assistance.",
      objective: "APPOINTMENT_BOOKING",
      status: "DRAFT",
      headline: "Book a guided site visit this weekend",
      promoDescription: "Pickup and drop from Hitec City. Snacks, walkthrough and on-spot pricing.",
      ctaType: "BOOK_APPOINTMENT",
      contactName: "Sri Green Realty sales desk",
      contactPhone: "+919848012345",
      targetLocation: "Hyderabad, Telangana",
    },
  })

  // Leads (only when empty — keeps re-runs non-destructive)
  const leadCount = await prisma.lead.count({ where: { businessId: business.id } })
  if (leadCount === 0) {
    const leadInputs: Array<{
      name: string
      phone: string
      email?: string
      city: string
      interestedIn: string
      message: string
      status: "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST"
      assignedToId?: string
      lastContactedAt?: Date
      nextFollowUpAt?: Date
      convertedAt?: Date
      lostAt?: Date
      createdAt: Date
    }> = [
      {
        name: "Priya Sharma",
        phone: "+919845123456",
        email: "priya.sharma@example.com",
        city: "Hyderabad",
        interestedIn: "3 BHK",
        message: "Interested in tower 2. Can we visit this Sunday morning?",
        status: "NEW",
        createdAt: daysAgo(1),
      },
      {
        name: "Rahul Mehta",
        phone: "+919845234567",
        city: "Hyderabad",
        interestedIn: "2 BHK",
        message: "What is the booking amount?",
        status: "CONTACTED",
        assignedToId: member.id,
        lastContactedAt: daysAgo(2),
        createdAt: daysAgo(3),
      },
      {
        name: "Anjali Reddy",
        phone: "+919845345678",
        email: "anjali.reddy@example.com",
        city: "Secunderabad",
        interestedIn: "2.5 BHK",
        message: "Please share the brochure and payment plan.",
        status: "INTERESTED",
        assignedToId: member.id,
        nextFollowUpAt: daysAhead(1),
        createdAt: daysAgo(5),
      },
      {
        name: "Venkat Rao",
        phone: "+919845456789",
        city: "Hyderabad",
        interestedIn: "3 BHK",
        message: "Ready to book if floor rise charges are waived.",
        status: "QUALIFIED",
        assignedToId: member.id,
        nextFollowUpAt: daysAhead(2),
        createdAt: daysAgo(7),
      },
      {
        name: "Deepak Nair",
        phone: "+919845567890",
        city: "Bengaluru",
        interestedIn: "3 BHK",
        message: "Investment purchase — need rental yield details.",
        status: "CONVERTED",
        convertedAt: daysAgo(2),
        createdAt: daysAgo(9),
      },
      {
        name: "Sneha Iyer",
        phone: "+919845678901",
        city: "Hyderabad",
        interestedIn: "2 BHK",
        message: "Postponing purchase by 6 months.",
        status: "LOST",
        lostAt: daysAgo(4),
        createdAt: daysAgo(12),
      },
    ]

    const leads = []
    for (const input of leadInputs) {
      const lead = await prisma.lead.create({
        data: {
          businessId: business.id,
          campaignId: activeCampaign.id,
          name: input.name,
          phone: input.phone,
          email: input.email ?? null,
          city: input.city,
          interestedIn: input.interestedIn,
          message: input.message,
          source: "CAMPAIGN_PAGE",
          status: input.status,
          assignedToId: input.assignedToId ?? null,
          consentGiven: true,
          consentText: CONSENT_TEXT,
          utmSource: "whatsapp",
          utmMedium: "social",
          lastContactedAt: input.lastContactedAt ?? null,
          nextFollowUpAt: input.nextFollowUpAt ?? null,
          convertedAt: input.convertedAt ?? null,
          lostAt: input.lostAt ?? null,
          createdAt: input.createdAt,
        },
      })
      leads.push(lead)
    }

    // Activities for progressed leads
    for (const lead of leads) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          actorId: lead.status === "NEW" ? null : member.id,
          type: "CREATED",
          toStatus: "NEW",
          createdAt: lead.createdAt,
        },
      })
      if (lead.status !== "NEW") {
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            actorId: member.id,
            type: "STATUS_CHANGED",
            fromStatus: "NEW",
            toStatus: "CONTACTED",
            note: "Called the customer.",
            createdAt: new Date(lead.createdAt.getTime() + 2 * 60 * 60 * 1000),
          },
        })
      }
    }
    console.log(`Seeded ${leads.length} demo leads with activities`)
  } else {
    console.log(`Demo leads already present (${leadCount}) — skipping`)
  }

  // Analytics events (only when empty)
  const eventCount = await prisma.campaignEvent.count({ where: { campaignId: activeCampaign.id } })
  if (eventCount === 0) {
    const visitors = Array.from({ length: 12 }, () => randomUUID())
    const events: Prisma.CampaignEventCreateManyInput[] = []
    for (let day = 13; day >= 0; day -= 1) {
      const viewsToday = 4 + ((day * 7) % 6) // deterministic 4–9 views/day
      for (let v = 0; v < viewsToday; v += 1) {
        events.push({
          campaignId: activeCampaign.id,
          type: "PAGE_VIEW",
          visitorId: visitors[(day + v) % visitors.length],
          referrer: "https://wa.me/",
          utmSource: "whatsapp",
          utmMedium: "social",
          occurredAt: daysAgo(day),
        })
      }
    }
    // A few form submits spread over the window
    for (let f = 0; f < 6; f += 1) {
      events.push({
        campaignId: activeCampaign.id,
        type: "FORM_SUBMIT",
        visitorId: visitors[f],
        utmSource: "whatsapp",
        utmMedium: "social",
        occurredAt: daysAgo(12 - f * 2),
      })
    }
    await prisma.campaignEvent.createMany({ data: events })
    console.log(`Seeded ${events.length} campaign events`)
  } else {
    console.log(`Campaign events already present (${eventCount}) — skipping`)
  }

  // Trial subscription
  const starterPlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug: "starter" } })
  await prisma.subscription.upsert({
    where: { businessId: business.id },
    update: { planId: starterPlan.id, status: "TRIALING", currentPeriodEnd: daysAhead(7) },
    create: {
      businessId: business.id,
      planId: starterPlan.id,
      status: "TRIALING",
      currentPeriodStart: daysAgo(7),
      currentPeriodEnd: daysAhead(7),
    },
  })

  // Notifications for the owner
  const notificationCount = await prisma.notification.count({ where: { userId: owner.id } })
  if (notificationCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: owner.id,
          businessId: business.id,
          type: "CAMPAIGN_PUBLISHED",
          title: "Campaign published",
          body: "“Luxury apartments in Hyderabad” is now live at /c/luxury-apartments-hyderabad.",
          createdAt: daysAgo(10),
        },
        {
          userId: owner.id,
          businessId: business.id,
          type: "LEAD_CREATED",
          title: "New enquiry received",
          body: "Priya Sharma enquired about 3 BHK.",
          createdAt: daysAgo(1),
        },
      ],
    })
  }

  if (!ownerProvided) {
    console.log(`Demo owner — email: ${ownerEmail} password: ${ownerPassword} (generated; set DEMO_OWNER_PASSWORD in .env to pin it)`)
  }
  if (!memberProvided) {
    console.log(`Demo member — email: ${memberEmail} password: ${memberPassword} (generated; set DEMO_MEMBER_PASSWORD in .env to pin it)`)
  }
  console.log("Demo business seeded: Sri Green Realty (slug: sri-green-realty)")
}

async function main() {
  await seedIndustries()
  await seedPlans()
  await seedAdmin()
  await seedDemoBusiness()
  console.log("Seed complete.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
