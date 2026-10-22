const starPath = "M12 2.5l2.94 6.06 6.56.92-4.78 4.6 1.17 6.52L12 17.5l-5.89 3.1 1.17-6.52-4.78-4.6 6.56-.92L12 2.5z";

function Stars() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg aria-hidden="true" key={i} viewBox="0 0 24 24">
          <path d={starPath} />
        </svg>
      ))}
    </>
  );
}

/** Note sur 5 étoiles, remplissage partiel (ex. 4,3 → quatre étoiles et un tiers). */
export function StarRating({ value, size = 16, className = "" }: { value: number; size?: number; className?: string }) {
  const rounded = Math.round(value * 10) / 10;
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      aria-label={value > 0 ? `Note : ${rounded.toLocaleString("fr-FR")} sur 5` : "Pas encore noté"}
      className={`sf-stars ${className}`.trim()}
      role="img"
      style={{ "--sf-star-size": `${size}px` } as React.CSSProperties}
    >
      <span className="sf-stars-empty">
        <Stars />
      </span>
      <span className="sf-stars-full" style={{ width: `${percent}%` }}>
        <Stars />
      </span>
    </span>
  );
}

export function reviewCountLabel(count: number) {
  return count === 0 ? "Aucun avis" : `${count} avis`;
}
