import { Images, Megaphone, MessageSquareText, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { VendorShell } from "@/components/layout/vendor-shell";
import { hasPermission, type Permission } from "@/modules/auth/permissions";
import { getStoreContext } from "@/modules/stores/context";
import { redirect } from "next/navigation";

export const metadata = { title: "Marketing" };

const sections: { href: string; icon: LucideIcon; title: string; text: string; permission: Permission }[] = [
  {
    href: "/dashboard/marketing/campagnes",
    icon: Megaphone,
    title: "Campagnes",
    text: "Envoyez une offre sur WhatsApp aux clients qui ont accepté de la recevoir.",
    permission: "marketing.manage",
  },
  {
    href: "/dashboard/marketing/banniere",
    icon: Images,
    title: "Bannière",
    text: "Jusqu’à 4 images qui défilent en haut de votre boutique : nouveautés, promotions.",
    permission: "store.manage",
  },
  {
    href: "/dashboard/marketing/popups",
    icon: MessageSquareText,
    title: "Popups",
    text: "Une fenêtre qui s’ouvre à l’arrivée sur votre boutique, pour une offre du moment.",
    permission: "marketing.manage",
  },
];

/** Marketing : une carte par outil (campagnes, bannière, popups) ; un clic ouvre l'outil. */
export default async function MarketingPage() {
  const { membership } = await getStoreContext();
  const visible = sections.filter((section) => hasPermission(membership.role, section.permission));
  if (!visible.length) redirect("/dashboard/acces-refuse");

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Marketing</h1>
          <p className="v-page-subtitle">Faites revenir vos clients et mettez vos offres en avant. Choisissez un outil.</p>
        </div>
      </div>
      <ul className="hub-cards glass-zone">
        {visible.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link className="hub-card" href={href}>
              <span aria-hidden="true" className="hub-card-icon">
                <Icon size={30} strokeWidth={1.8} />
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
