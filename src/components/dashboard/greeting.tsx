// Salutation de l'accueil vendeur selon le moment de la journée (heure d'Afrique centrale, WAT), avec une
// petite illustration douce en relief (dégradés et ombre), dessinée en SVG : rien à télécharger.

export type DayMoment = "morning" | "afternoon" | "evening";

/** Moment de la journée à l'heure d'Afrique centrale (Douala, Libreville, Brazzaville… : UTC+1). */
export function dayMoment(now = new Date()): DayMoment {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Douala" }).format(now));
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

const words: Record<DayMoment, string> = { morning: "Bonjour", afternoon: "Bon après-midi", evening: "Bonsoir" };

export function greetingWord(moment: DayMoment) {
  return words[moment];
}

/** Soleil (matin), soleil et nuage (après-midi), lune et étoiles (soir), en volume doux. */
export function DayMomentIcon({ moment, size = 44 }: { moment: DayMoment; size?: number }) {
  return (
    <svg aria-hidden="true" className="greeting-icon" height={size} viewBox="0 0 64 64" width={size}>
      <defs>
        <radialGradient cx="35%" cy="30%" id="g-sun" r="70%">
          <stop offset="0" stopColor="#FFF3B0" />
          <stop offset="0.55" stopColor="#FFC83D" />
          <stop offset="1" stopColor="#FF9900" />
        </radialGradient>
        <linearGradient id="g-cloud" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DCE3F0" />
        </linearGradient>
        <radialGradient cx="35%" cy="30%" id="g-moon" r="75%">
          <stop offset="0" stopColor="#FFFBEA" />
          <stop offset="0.6" stopColor="#F5D98A" />
          <stop offset="1" stopColor="#D9A93F" />
        </radialGradient>
        <filter height="140%" id="g-soft" width="140%" x="-20%" y="-10%">
          <feDropShadow dx="0" dy="3" floodColor="#000026" floodOpacity="0.18" stdDeviation="2.5" />
        </filter>
      </defs>
      {moment === "evening" ? (
        <g filter="url(#g-soft)">
          <path d="M40 10a22 22 0 1 0 14 38A18 18 0 0 1 40 10Z" fill="url(#g-moon)" />
          <circle cx="50" cy="14" fill="#FFE9A8" r="2" />
          <circle cx="56" cy="26" fill="#FFF6D6" r="1.4" />
          <circle cx="12" cy="14" fill="#FFF6D6" r="1.4" />
        </g>
      ) : (
        <g filter="url(#g-soft)">
          <circle cx={moment === "morning" ? 32 : 26} cy={moment === "morning" ? 30 : 24} fill="url(#g-sun)" r={moment === "morning" ? 16 : 13} />
          {moment === "morning" &&
            [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <rect fill="#FFC83D" height="7" key={angle} rx="2" transform={`rotate(${angle} 32 30) translate(30.5 4)`} width="3" />
            ))}
          {moment === "afternoon" && <path d="M22 50h26a9 9 0 0 0 0-18 12 12 0 0 0-23-3 8 8 0 0 0-3 21Z" fill="url(#g-cloud)" />}
        </g>
      )}
    </svg>
  );
}
