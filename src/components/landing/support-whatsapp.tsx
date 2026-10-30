import { site } from "@/config/site";

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
      <svg aria-hidden="true" fill="currentColor" height="28" viewBox="0 0 24 24" width="28">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" />
      </svg>
    </a>
  );
}
