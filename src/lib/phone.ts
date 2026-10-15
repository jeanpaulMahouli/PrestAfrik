import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

// Téléphones (brief §6.3) : indicatif et numéro national saisis séparément, validés par
// libphonenumber-js ; l'E.164 est la valeur de référence. Un numéro valide ne prouve ni qu'il
// appartient à la personne, ni qu'il a WhatsApp.

export type PhoneCountry = { iso: CountryCode; name: string; dialCode: string };

const priority: CountryCode[] = ["CM", "CI", "SN", "GA", "CG", "CD", "TD", "CF", "GQ", "NG", "BJ", "TG", "BF", "ML", "GN", "FR", "BE", "CA", "US"];

let cache: PhoneCountry[] | null = null;

/** Pays et indicatifs, Cameroun en premier, puis l'Afrique francophone, puis l'ordre alphabétique. */
export function phoneCountries(): PhoneCountry[] {
  if (cache) return cache;
  const names = new Intl.DisplayNames(["fr"], { type: "region" });
  const all = getCountries().map((iso) => ({ iso, name: names.of(iso) ?? iso, dialCode: `+${getCountryCallingCode(iso)}` }));
  const rank = (iso: CountryCode) => {
    const index = priority.indexOf(iso);
    return index === -1 ? priority.length : index;
  };
  cache = all.sort((a, b) => rank(a.iso) - rank(b.iso) || a.name.localeCompare(b.name, "fr"));
  return cache;
}

export type DialOption = { iso: CountryCode; dialCode: string };

let dialCache: DialOption[] | null = null;

/**
 * Indicatifs sans doublon (un seul « +1 », « +7 »…) : pays prioritaires d'abord, puis ordre numérique.
 * Aucune dépendance aux noms localisés, pour un rendu identique sur le serveur et dans le navigateur.
 */
export function phoneDialOptions(): DialOption[] {
  if (dialCache) return dialCache;
  const byCode = new Map<string, DialOption>();
  const ordered = [...priority, ...getCountries().filter((iso) => !priority.includes(iso))];
  for (const iso of ordered) {
    const dialCode = `+${getCountryCallingCode(iso)}`;
    if (!byCode.has(dialCode)) byCode.set(dialCode, { iso, dialCode });
  }
  const priorityCodes = new Set(priority.map((iso) => `+${getCountryCallingCode(iso)}`));
  const options = [...byCode.values()];
  dialCache = [
    ...options.filter((option) => priorityCodes.has(option.dialCode)),
    ...options.filter((option) => !priorityCodes.has(option.dialCode)).sort((x, y) => Number(x.dialCode.slice(1)) - Number(y.dialCode.slice(1))),
  ];
  return dialCache;
}

/** Option d'indicatif qui représente un pays (ex. le Canada partage « +1 » avec les États-Unis). */
export function dialOptionFor(iso: string): DialOption {
  const options = phoneDialOptions();
  const dialCode = isCountryCode(iso) ? `+${getCountryCallingCode(iso)}` : "+237";
  return options.find((option) => option.dialCode === dialCode) ?? options[0];
}

export function isCountryCode(value: string): value is CountryCode {
  return (getCountries() as string[]).includes(value);
}

export type PhoneResult =
  | { ok: true; country: CountryCode; national: string; e164: string }
  | { ok: false; message: string };

/** Valide un numéro national pour un pays (zéro initial et espaces tolérés). */
export function parsePhone(countryIso: string, national: string): PhoneResult {
  if (!isCountryCode(countryIso)) return { ok: false, message: "Choisissez un indicatif de pays." };
  const digits = national.replace(/[\s().-]/g, "");
  const country = phoneCountries().find((item) => item.iso === countryIso);
  if (!digits) return { ok: false, message: "Indiquez votre numéro WhatsApp, sans l’indicatif." };
  if (!/^\+?\d{4,17}$/.test(digits)) return { ok: false, message: "Le numéro ne doit contenir que des chiffres." };
  // Le numéro est relu au format international : pour un indicatif partagé (+1, +7…), le pays exact
  // est déduit du numéro lui-même.
  const international = digits.startsWith("+") ? digits : `+${getCountryCallingCode(countryIso)}${digits.replace(/^0+(?=\d{6})/, "")}`;
  const phone = parsePhoneNumberFromString(international);
  if (!phone || !phone.isValid() || phone.countryCallingCode !== getCountryCallingCode(countryIso)) {
    return { ok: false, message: `Ce numéro ne semble pas valide pour l’indicatif ${country?.dialCode ?? ""}.` };
  }
  return { ok: true, country: phone.country ?? countryIso, national: phone.nationalNumber, e164: phone.number };
}

/** Lecture d'un E.164 existant (pour préremplir les deux champs). */
export function splitE164(e164: string | null | undefined): { country: CountryCode; national: string } {
  const phone = e164 ? parsePhoneNumberFromString(e164) : undefined;
  return phone?.country ? { country: phone.country, national: phone.nationalNumber } : { country: "CM", national: "" };
}
