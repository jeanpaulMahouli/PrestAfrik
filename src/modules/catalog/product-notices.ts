// « Infos pratiques » du formulaire produit : contrôles instantanés de la saisie (prix, catégorie,
// photos, promotion…), sans appel à l'IA. Module sans dépendance serveur : utilisé côté navigateur
// et testé unitairement.

export type ProductSnapshot = {
  name: string;
  description: string;
  categoryChosen: boolean;
  priceXaf: string;
  promotionalPriceXaf: string;
  trackInventory: boolean;
  stockQuantity: string;
  availability: string;
  photoCount: number;
  uploading: boolean;
};

export type NoticeLevel = "danger" | "warning" | "tip";
export type ProductNotice = { id: string; level: NoticeLevel; text: string };

const parseAmount = (value: string) => (/^\d{1,9}$/.test(value.trim()) ? Number(value.trim()) : null);

export function buildProductNotices(snapshot: ProductSnapshot): ProductNotice[] {
  const notices: ProductNotice[] = [];
  const price = parseAmount(snapshot.priceXaf);
  const promo = parseAmount(snapshot.promotionalPriceXaf);
  const priceText = snapshot.priceXaf.trim();
  const promoText = snapshot.promotionalPriceXaf.trim();

  // Prix
  if (!priceText) {
    notices.push({ id: "price-missing", level: "danger", text: "Indiquez le prix du produit en FCFA." });
  } else if (price === null) {
    notices.push({ id: "price-format", level: "danger", text: "Le prix doit être un nombre entier en FCFA, sans espace ni virgule (ex. 15000)." });
  } else if (price === 0) {
    notices.push({ id: "price-zero", level: "danger", text: "Un prix de 0 FCFA n’est pas accepté : indiquez le vrai prix de vente." });
  } else if (price < 100) {
    notices.push({ id: "price-low", level: "warning", text: `${price} FCFA, c’est très bas. Vérifiez qu’il ne manque pas de zéros.` });
  }

  if (promoText) {
    if (promo === null) {
      notices.push({ id: "promo-format", level: "danger", text: "Le prix promotionnel doit être un nombre entier en FCFA." });
    } else if (promo === 0) {
      notices.push({ id: "promo-zero", level: "danger", text: "Un prix promotionnel de 0 FCFA n’est pas accepté. Laissez le champ vide s’il n’y a pas de promotion." });
    } else if (price !== null && price > 0 && promo >= price) {
      notices.push({ id: "promo-high", level: "danger", text: "Le prix promotionnel doit être inférieur au prix normal." });
    } else if (price !== null && price > 0 && promo < price * 0.2) {
      notices.push({ id: "promo-deep", level: "warning", text: `Réduction de ${Math.round((1 - promo / price) * 100)} % : vérifiez le prix promotionnel.` });
    }
  } else if (price !== null && price >= 500) {
    notices.push({
      id: "promo-suggest",
      level: "tip",
      text: "Astuce : ajoutez un prix promotionnel pour afficher un badge de réduction (ex. −10 %) qui attire l’œil des clients.",
    });
  }

  // Catégorie
  if (!snapshot.categoryChosen) {
    notices.push({ id: "category", level: "warning", text: "Placez ce produit dans une catégorie : vos clients le trouveront plus facilement dans la boutique." });
  }

  // Photos
  if (snapshot.photoCount === 0 && !snapshot.uploading) {
    notices.push({ id: "photos-none", level: "warning", text: "Ajoutez au moins une photo : un produit sans photo se vend très mal." });
  } else if (snapshot.photoCount === 1 && !snapshot.uploading) {
    notices.push({ id: "photos-one", level: "tip", text: "Ajoutez 2 ou 3 photos (de face, de près, porté ou en situation) pour rassurer vos clients." });
  }

  // Nom et description
  const name = snapshot.name.trim();
  if (name && name.length >= 6 && name === name.toUpperCase() && /[A-Z]/.test(name)) {
    notices.push({ id: "name-caps", level: "tip", text: "Évitez d’écrire le nom tout en majuscules : il est plus lisible en minuscules." });
  }
  if (!snapshot.description.trim()) {
    notices.push({ id: "description", level: "tip", text: "Ajoutez une description (matière, taille, usage) : elle répond aux questions des clients avant qu’ils les posent." });
  }

  // Stock
  if (snapshot.trackInventory && snapshot.availability !== "PREORDER" && parseAmount(snapshot.stockQuantity) === 0) {
    notices.push({ id: "stock-zero", level: "warning", text: "Stock à 0 : le produit sera affiché comme épuisé." });
  }

  const order: Record<NoticeLevel, number> = { danger: 0, warning: 1, tip: 2 };
  return notices.sort((a, b) => order[a.level] - order[b.level]);
}

/** Étapes de la fiche produit, dans l'ordre de saisie ; `target` : id de l'élément à atteindre. */
export type CompletionStep = { id: string; label: string; done: boolean; target: string };

/** Avancement de la fiche : photos, nom, prix, catégorie et description. */
export function productCompletion(snapshot: ProductSnapshot) {
  const price = parseAmount(snapshot.priceXaf);
  const steps: CompletionStep[] = [
    { id: "photos", label: "Photos", done: snapshot.photoCount > 0, target: "product-photos" },
    { id: "name", label: "Nom", done: snapshot.name.trim().length >= 2, target: "product-name" },
    { id: "price", label: "Prix", done: price !== null && price > 0, target: "product-price" },
    { id: "category", label: "Catégorie", done: snapshot.categoryChosen, target: "product-category" },
    { id: "description", label: "Description", done: Boolean(snapshot.description.trim()), target: "product-info" },
  ];
  const done = steps.filter((step) => step.done).length;
  return { steps, done, percent: Math.round((done / steps.length) * 100) };
}

/** Nettoie un montant saisi : « 15 000 FCFA » ou « 15.000 » deviennent « 15000 ». */
export function cleanAmountInput(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
}

/** Réduction affichée aux clients, en % (null si le prix promotionnel n'est pas valable). */
export function discountPercent(priceXaf: string, promotionalPriceXaf: string) {
  const price = parseAmount(priceXaf);
  const promo = parseAmount(promotionalPriceXaf);
  if (!price || !promo || promo >= price) return null;
  return Math.round((1 - promo / price) * 100);
}

/** Montant valable (entier > 0) ou null. */
export function validAmount(value: string) {
  const amount = parseAmount(value);
  return amount && amount > 0 ? amount : null;
}
