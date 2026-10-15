// Politique de mot de passe (brief §6.1, NIST SP 800-63B) : 8 à 128 caractères, aucune
// composition imposée, refus des mots de passe courants et de ceux qui reprennent l'e-mail ou le nom.
// Module partagé entre le navigateur (retour immédiat) et le serveur (règle qui fait foi).

export const passwordMinLength = 8;
export const passwordMaxLength = 128;

// Extrait des mots de passe les plus utilisés (listes publiques type « top 10 000 »).
// La liste complète pourra remplacer celle-ci sans changer l'interface du module.
const commonPasswords = new Set([
  "12345678", "123456789", "1234567890", "12345678910", "123123123", "11111111", "00000000",
  "88888888", "87654321", "11223344", "12341234", "123456123", "147258369", "1q2w3e4r",
  "1q2w3e4r5t", "qwertyuiop", "qwerty123", "qwertyui", "azertyuiop", "azerty123", "azertyui",
  "password", "password1", "password12", "password123", "passw0rd", "motdepasse", "motdepasse1",
  "iloveyou", "iloveyou1", "sunshine", "princess", "football", "baseball", "superman",
  "starwars", "whatever", "trustno1", "letmein1", "welcome1", "welcome123", "abcd1234",
  "abc12345", "abcdefgh", "aaaaaaaa", "zaq12wsx", "1qaz2wsx", "qazwsxedc", "michelle",
  "jennifer", "computer", "internet", "samsung1", "cameroun", "cameroon", "cameroun237",
  "douala237", "yaounde237", "bonjour1", "bonjour123", "soleil123", "chocolat", "doudou123",
  "loulou123", "marseille", "liverpool", "manchester", "barcelona", "realmadrid", "chelsea1",
  "arsenal1", "prestafrik", "prestafrik1", "boutique1", "boutique123", "admin123", "administrator",
  "changeme", "secret123", "test1234", "testtest", "qwerty12", "asdfghjk", "asdfasdf",
  "zxcvbnm1", "monkey12", "dragon12", "master12", "shadow12", "jesus123", "jesuschrist",
  "dieu1234", "nicolas1", "football1", "pokemon1", "naruto123", "11111111a", "a1234567",
]);

export type PasswordIssue = "tooShort" | "tooLong" | "tooCommon";

export function checkPassword(password: string, context: { email?: string; name?: string } = {}): PasswordIssue | null {
  const length = [...password].length;
  if (length < passwordMinLength) return "tooShort";
  if (length > passwordMaxLength) return "tooLong";

  const normalized = password.normalize("NFKC").toLowerCase();
  if (commonPasswords.has(normalized) || /^(.)\1+$/.test(normalized)) return "tooCommon";

  const personal = [
    context.email?.split("@")[0],
    ...(context.name?.split(/\s+/) ?? []),
  ]
    .map((part) => part?.normalize("NFKC").toLowerCase().trim() ?? "")
    .filter((part) => part.length >= 4);
  if (personal.some((part) => normalized.includes(part) && normalized.length - part.length < 4)) {
    return "tooCommon";
  }
  return null;
}

/** Score consultatif de 0 à 4 : n'empêche jamais l'inscription au-delà des règles ci-dessus. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  const length = [...password].length;
  if (length < passwordMinLength) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^\da-zA-Z]/].filter((pattern) => pattern.test(password)).length;
  const uniqueRatio = new Set(password).size / length;
  let score = 1;
  if (length >= 10 || variety >= 3) score += 1;
  if (length >= 12 && variety >= 2) score += 1;
  if (length >= 14 || (length >= 10 && variety === 4)) score += 1;
  if (uniqueRatio < 0.5) score -= 1;
  if (checkPassword(password) === "tooCommon") return 1;
  return Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
}
