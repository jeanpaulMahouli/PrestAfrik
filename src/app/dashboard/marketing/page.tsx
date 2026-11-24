import { Megaphone, MessageSquareText, type AppIcon } from "@/components/ui/icons";
import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { hasPermission, type Permission } from "@/modules/auth/permissions";
import { getStoreContext } from "@/modules/stores/context";
import { redirect } from "next/navigation";

export const metadata = { title: "Marketing" };

const sections: { href: string; icon: AppIcon; title: string; text: string; permission: Permission }[] = [
  {
    href: "/dashboard/marketing/campagnes",
    icon: Megaphone,
    title: "Campagnes",
    text: "Une offre WhatsApp à vos clients.",
    permission: "marketing.manage",
  },
  {
    href: "/dashboard/marketing/popups",
    icon: MessageSquareText,
    title: "Popups",
    text: "Une offre à l’ouverture de la boutique.",
    permission: "marketing.manage",
  },
];

/** Marketing : une carte par outil (campagnes, popups) ; un clic ouvre l'outil. */
export default async function MarketingPage() {
  const { membership } = await getStoreContext();
  const visible = sections.filter((section) => hasPermission(membership.role, section.permission));
  if (!visible.length) redirect("/dashboard/acces-refuse");

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Marketing</h1>
        </div>
      </div>
      <ul className="hub-cards glass-zone">
        {visible.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link className="hub-card" href={href}>
              <span aria-hidden="true" className="hub-card-icon">
                <Icon size={30} />
              </span>
              <span className="hub-card-text">
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </VendorShell>
  );
}
