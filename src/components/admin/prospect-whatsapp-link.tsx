"use client";

import { useRouter } from "next/navigation";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

/**
 * Bouton WhatsApp de la Prospection : il passe par /admin/prospection/contacter, qui enregistre la prise de
 * contact puis ouvre WhatsApp (nouvel onglet). La colonne « Contacté » se met à jour juste après.
 */
export function ProspectWhatsappLink({ href, name }: { href: string; name: string }) {
  const router = useRouter();
  return (
    <a
      aria-label={`Écrire à ${name} sur WhatsApp`}
      className="icon-button icon-button-sm icon-button-whatsapp"
      href={href}
      onClick={() => window.setTimeout(() => router.refresh(), 1500)}
      rel="noreferrer"
      target="_blank"
      title="Écrire sur WhatsApp (contact enregistré)"
    >
      <WhatsAppIcon size={16} />
    </a>
  );
}
