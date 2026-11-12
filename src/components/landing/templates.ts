import type { LucideIcon } from "lucide-react"
import {
  Banknote,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Home,
  Plane,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react"

/**
 * Industry landing-page variants (docs/PRD.md §5). Shared structure, tailored
 * labels, accent and compliance notes. Data-driven: adding an industry row does
 * not require a new component, and unknown slugs fall back to the default.
 */

export interface LandingTemplate {
  label: string
  eyebrow: string
  icon: LucideIcon
  /** Full literal Tailwind gradient classes (JIT must see them). */
  heroClass: string
  chipClass: string
  highlightsTitle: string
  offerTitle: string
  detailsTitle: string
  /** Honest qualification shown near the offer/details. */
  disclaimer?: string
}

const DEFAULT_TEMPLATE: LandingTemplate = {
  label: "Campaign",
  eyebrow: "Campaign details",
  icon: Briefcase,
  heroClass: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700",
  chipClass: "bg-white/15 text-white ring-white/20",
  highlightsTitle: "What's included",
  offerTitle: "Offer details",
  detailsTitle: "Campaign details",
}

const TEMPLATES: Record<string, LandingTemplate> = {
  "real-estate": {
    label: "Real estate",
    eyebrow: "Property showcase",
    icon: Home,
    heroClass: "bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700",
    chipClass: "bg-emerald-50/15 text-emerald-50 ring-emerald-100/20",
    highlightsTitle: "Project highlights",
    offerTitle: "Pricing & offer",
    detailsTitle: "Project details",
    disclaimer:
      "Property details, pricing and availability are supplied by the business. Verify the project approvals and final price before booking.",
  },
  "finance-loans": {
    label: "Finance & loans",
    eyebrow: "Loan & finance",
    icon: Banknote,
    heroClass: "bg-gradient-to-br from-blue-950 via-blue-800 to-indigo-700",
    chipClass: "bg-blue-50/15 text-blue-50 ring-blue-100/20",
    highlightsTitle: "Loan features",
    offerTitle: "Rates & fee notes",
    detailsTitle: "Loan details",
    disclaimer:
      "Interest rates, fees and eligibility are indicative and supplied by the business. Confirm final terms directly with them before applying.",
  },
  insurance: {
    label: "Insurance",
    eyebrow: "Insurance plans",
    icon: ShieldCheck,
    heroClass: "bg-gradient-to-br from-cyan-950 via-cyan-800 to-sky-700",
    chipClass: "bg-cyan-50/15 text-cyan-50 ring-cyan-100/20",
    highlightsTitle: "Cover highlights",
    offerTitle: "Premium notes",
    detailsTitle: "Policy details",
    disclaimer:
      "Policy benefits and premiums are supplied by the business. Read the policy wording and exclusions before buying.",
  },
  "education-coaching": {
    label: "Education & coaching",
    eyebrow: "Admissions",
    icon: GraduationCap,
    heroClass: "bg-gradient-to-br from-violet-950 via-violet-800 to-purple-700",
    chipClass: "bg-violet-50/15 text-violet-50 ring-violet-100/20",
    highlightsTitle: "Course highlights",
    offerTitle: "Fees & batch details",
    detailsTitle: "Course details",
    disclaimer:
      "Fees, batch dates and seat availability are supplied by the business. Confirm them with the institute at the time of admission.",
  },
  healthcare: {
    label: "Healthcare",
    eyebrow: "Care & appointments",
    icon: HeartPulse,
    heroClass: "bg-gradient-to-br from-rose-950 via-rose-800 to-pink-700",
    chipClass: "bg-rose-50/15 text-rose-50 ring-rose-100/20",
    highlightsTitle: "Services & specialists",
    offerTitle: "Appointment notes",
    detailsTitle: "Clinic details",
    disclaimer:
      "For medical emergencies, contact the clinic directly. Do not share bank passwords, OTPs, PAN, Aadhaar or medical records on this page.",
  },
  "retail-ecommerce": {
    label: "Retail & e-commerce",
    eyebrow: "Shop the offer",
    icon: ShoppingBag,
    heroClass: "bg-gradient-to-br from-orange-950 via-orange-800 to-amber-700",
    chipClass: "bg-amber-50/15 text-amber-50 ring-amber-100/20",
    highlightsTitle: "Product highlights",
    offerTitle: "Offer details",
    detailsTitle: "Product details",
    disclaimer:
      "Stock, prices and offers are supplied by the business. Confirm availability before visiting the store or placing an order.",
  },
  "travel-tourism": {
    label: "Travel & tourism",
    eyebrow: "Plan your trip",
    icon: Plane,
    heroClass: "bg-gradient-to-br from-teal-950 via-teal-800 to-cyan-700",
    chipClass: "bg-teal-50/15 text-teal-50 ring-teal-100/20",
    highlightsTitle: "Trip highlights",
    offerTitle: "Pricing & inclusions",
    detailsTitle: "Trip details",
    disclaimer:
      "Itineraries, inclusions and prices are supplied by the business. Confirm the final itinerary and cancellation terms before paying.",
  },
}

export function getLandingTemplate(industrySlug: string | null | undefined): LandingTemplate {
  if (!industrySlug) return DEFAULT_TEMPLATE
  return TEMPLATES[industrySlug] ?? DEFAULT_TEMPLATE
}
