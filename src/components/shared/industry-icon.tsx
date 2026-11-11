import {
  Building2,
  GraduationCap,
  HeartPulse,
  Landmark,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

/**
 * Maps an industry's `iconKey` (database value) to a Lucide icon.
 * Unknown keys fall back to a generic icon, so adding a new industry row
 * needs no code change — see docs/PRD.md §3.
 */

const ICONS: Record<string, LucideIcon> = {
  "real-estate": Building2,
  "finance-loans": Landmark,
  insurance: ShieldCheck,
  "education-coaching": GraduationCap,
  healthcare: HeartPulse,
  "retail-ecommerce": ShoppingBag,
  "travel-tourism": Plane,
  other: Sparkles,
}

const FALLBACK_ICON = Sparkles

export function IndustryIcon({ iconKey, className }: { iconKey?: string | null; className?: string }) {
  const Icon = (iconKey && ICONS[iconKey]) || FALLBACK_ICON
  return <Icon className={className} aria-hidden />
}
