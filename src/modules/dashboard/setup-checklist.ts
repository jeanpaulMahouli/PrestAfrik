// « Pour bien démarrer » : ce qu'il reste à régler après la création de la boutique. Même liste dans la
// carte de l'accueil et dans la fenêtre « Boutique créée ». Chaque ligne est cochée d'après les données
// réelles de la boutique, jamais d'avance, et mène à la section du tableau de bord concernée.

export type SetupStep = { key: string; label: string; hint: string; done: boolean; href: string };

type SetupInput = {
  store: { description: string | null; logoUrl: string | null; phoneE164: string | null; contactPhone: string | null; pickupEnabled: boolean; pickupAddress: string | null; isPublished: boolean };
  activeProducts: number;
  activeZones: number;
  whatsappNumber: boolean;
};

export function setupChecklist({ store, activeProducts, activeZones, whatsappNumber }: SetupInput): SetupStep[] {
  const hasPhone = Boolean(store.phoneE164 || store.contactPhone);
  return [
    {
      key: "infos",
      label: "Compléter les informations de la boutique",
      hint: "Une courte description et votre logo rassurent vos clients.",
      done: Boolean(store.description?.trim() && store.logoUrl),
      href: store.logoUrl ? "/dashboard/boutique#informations" : "/dashboard/boutique#logo",
    },
    {
      key: "product",
      label: "Ajouter mes premiers produits",
      hint: "Une photo, un nom et un prix suffisent.",
      done: activeProducts > 0,
      href: "/dashboard/produits/nouveau",
    },
    {
      key: "delivery",
      label: "Configurer la livraison",
      hint: "Vos zones et leurs frais, ou le retrait en boutique.",
      done: activeZones > 0 || Boolean(store.pickupEnabled && store.pickupAddress?.trim()),
      href: "/dashboard/livraisons",
    },
    {
      key: "contact",
      label: "Vérifier les informations de contact",
      hint: "Le téléphone de la boutique et le numéro WhatsApp qui reçoit les commandes.",
      done: hasPhone && whatsappNumber,
      href: whatsappNumber ? "/dashboard/boutique#informations" : "/dashboard/boutique/whatsapp",
    },
    {
      key: "publish",
      label: "Publier ma boutique",
      hint: "Elle devient visible par vos clients.",
      done: store.isPublished,
      href: "/dashboard/boutique",
    },
  ];
}
