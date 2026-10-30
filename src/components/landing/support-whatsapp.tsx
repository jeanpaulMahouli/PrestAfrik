import { site } from "@/config/site";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

const supportMessage = "Bonjour PrestAfrik, j’ai une question avant de créer ma boutique.";

/**
 * Bouton WhatsApp flottant du site public : écrire à l'équipe PrestAfrik. Affiché seulement si le numéro
 * de l'équipe est configuré (NEXT_PUBLIC_PRESTAFRIK_WHATSAPP, format international).
 */
export function SupportWhatsapp() {
  const digits = site.whatsapp?.replace(/\D/g, "");
  if (!digits) return null;
  return (
    <a
      aria-label="Une question avant de vous lancer ? Écrire à l’équipe PrestAfrik sur WhatsApp (nouvel onglet)"
      className="lp-support"
      href={`https://wa.me/${digits}?text=${encodeURIComponent(supportMessage)}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span aria-hidden="true" className="lp-support__tip">
        Une question avant de vous lancer ?
      </span>
      <WhatsAppIcon size={28} />
    </a>
  );
}
