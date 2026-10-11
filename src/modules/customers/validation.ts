export function normalizeCustomerWhatsapp(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  const normalized = digits.startsWith("237") ? digits : `237${digits}`;
  if (!/^237[2-9]\d{8}$/.test(normalized)) {
    throw new Error("Indique un numéro WhatsApp camerounais valide avec son indicatif +237.");
  }
  return `+${normalized}`;
}

export function parseCustomerTags(value: string) {
  const tags = value
    .split(",")
    .map((tag) => tag.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  const uniqueTags = new Map<string, string>();
  for (const tag of tags) {
    const key = tag.toLocaleLowerCase("fr");
    if (!uniqueTags.has(key)) uniqueTags.set(key, tag);
  }
  if (uniqueTags.size > 10) {
    throw new Error("Ajoute au maximum 10 tags à la fois.");
  }
  for (const tag of uniqueTags.values()) {
    if (tag.length < 2 || tag.length > 40) {
      throw new Error("Chaque tag doit contenir entre 2 et 40 caractères.");
    }
  }
  return [...uniqueTags.values()];
}

export function customerNameIsMateriallyDifferent(current: string, incoming: string) {
  const normalize = (name: string) =>
    name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("fr")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 1);
  const currentTokens = new Set(normalize(current));
  const incomingTokens = normalize(incoming);
  if (currentTokens.size === 0 || incomingTokens.length === 0) return false;
  return !incomingTokens.some((token) => currentTokens.has(token));
}
