import Link from "next/link";

const tabs = [
  { href: "/dashboard/marketing", label: "Tout le marketing" },
  { href: "/dashboard/marketing/campagnes", label: "Campagnes" },
  { href: "/dashboard/marketing/banniere", label: "Bannière" },
  { href: "/dashboard/marketing/popups", label: "Popups" },
] as const;

/** Onglets du menu Marketing. */
export function MarketingTabs({ current }: { current: (typeof tabs)[number]["href"] }) {
  return (
    <nav aria-label="Marketing" className="pill-tabs store-section-nav">
      {tabs.map((tab) => (
        <Link aria-current={current === tab.href ? "page" : undefined} href={tab.href} key={tab.href}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
