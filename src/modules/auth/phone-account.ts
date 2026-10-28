import { parsePhoneNumberFromString } from "libphonenumber-js";

// Comptes créés avec un numéro WhatsApp. Better Auth exige une adresse e-mail unique : ces comptes
// reçoivent une adresse technique dans le domaine réservé « .invalid » (RFC 2606), qui ne peut recevoir
// aucun e-mail. Elle n'est jamais affichée : on montre le numéro à la place.

const placeholderDomain = "whatsapp.prestafrik.invalid";

export function placeholderEmailFor(phoneE164: string) {
  return `${phoneE164.replace(/\D/g, "")}@${placeholderDomain}`;
}

export function isPlaceholderEmail(email: string | null | undefined) {
  return Boolean(email && email.trim().toLowerCase().endsWith(`@${placeholderDomain}`));
}

type AccountUser = { email: string; emailVerified: boolean; phoneNumber?: string | null; phoneNumberVerified?: boolean | null };

/** Compte confirmé : adresse e-mail confirmée, ou numéro WhatsApp vérifié par code. */
export function isAccountVerified(user: AccountUser) {
  return Boolean(user.emailVerified || user.phoneNumberVerified);
}

/** Identifiant à afficher pour le compte : l'e-mail réel, sinon le numéro WhatsApp. */
export function accountContact(user: AccountUser) {
  if (!isPlaceholderEmail(user.email)) return user.email;
  return user.phoneNumber ? formatPhoneForDisplay(user.phoneNumber) : "Compte WhatsApp";
}

/** +237699000042 → +237 699 00 00 42 ; les autres pays suivent leur présentation internationale. */
export function formatPhoneForDisplay(e164: string) {
  const cameroon = /^\+237(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  if (cameroon) return `+237 ${cameroon.slice(1).join(" ")}`;
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
