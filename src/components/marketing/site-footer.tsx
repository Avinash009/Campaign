import Link from "next/link"
import { Logo } from "@/components/marketing/logo"
import { Separator } from "@/components/ui/separator"

const FOOTER_SECTIONS = [
  {
    heading: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/industries", label: "Industries" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
] as const

/** Marketing site footer. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-sm text-sm text-muted-foreground">
              Create promotional campaigns, publish landing pages, collect
              customer enquiries and manage leads to closure — all in one
              place.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.heading} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{section.heading}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} CampaignHub. All rights reserved.</p>
          <p>Made for businesses across India.</p>
        </div>
      </div>
    </footer>
  )
}
