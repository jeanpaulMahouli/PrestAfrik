export type DemoVideoSource = { kind: "iframe"; src: string } | { kind: "file"; src: string } | null;

/** Transforme un lien YouTube, Vimeo ou fichier vidéo en source lisible dans la fenêtre de démonstration. */
export function demoVideoSource(url: string): DemoVideoSource {
  const value = url.trim();
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value, "https://prestafrik.com");
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\.|^m\./, "");
  const youtubeId =
    host === "youtu.be"
      ? parsed.pathname.slice(1)
      : host === "youtube.com" || host === "youtube-nocookie.com"
        ? parsed.searchParams.get("v") ?? parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1]
        : null;
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) {
    // youtube-nocookie : pas de cookie publicitaire tant que la vidéo n'est pas lue.
    return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1` };
  }
  const vimeoId = host === "vimeo.com" || host === "player.vimeo.com" ? parsed.pathname.match(/(\d{6,})/)?.[1] : null;
  if (vimeoId) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&dnt=1` };
  if (/\.(mp4|webm)$/i.test(parsed.pathname)) return { kind: "file", src: value };
  return null;
}
