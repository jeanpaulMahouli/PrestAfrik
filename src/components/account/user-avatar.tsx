/** Photo de profil ronde, ou initiale du nom à défaut. */
export function UserAvatar({ name, image, size = 32, className = "" }: { name: string; image?: string | null; size?: number; className?: string }) {
  const initial = name.trim()[0]?.toLocaleUpperCase("fr-FR") ?? "?";
  return (
    <span aria-hidden="true" className={`avatar-circle ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>
      {image ? <img alt="" height={size} src={image} width={size} /> : initial}
    </span>
  );
}
