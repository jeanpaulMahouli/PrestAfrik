import Link from "next/link";

const sections = [
  { href: "/dashboard/boutique", label: "Apparence et informations" },
  { href: "/dashboard/boutique/pages", label: "Pages" },
  { href: "/dashboard/boutique/whatsapp", label: "Messages WhatsApp" },
  { href: "/dashboard/boutique/assistant", label: "Assistant WhatsApp" },
] as const;

/** Sous-navigation de « Ma boutique ». */
export function StoreSectionNav({ current }: { current: (typeof sections)[number]["href"] }) {
  return (
    <nav aria-label="Réglages de la boutique" className="pill-tabs store-section-nav">
      {sections.map((section) => (
        <Link aria-current={current === section.href ? "page" : undefined} href={section.href} key={section.href}>
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
