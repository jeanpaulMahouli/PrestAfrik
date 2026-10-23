const youtubePlayerParams = "autoplay=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&fs=0&playsinline=1";

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
    // Lecteur épuré : sans barre de commandes (volume, sous-titres, réglages, plein écran) ni annotations ;
    // un clic sur la vidéo la met en pause ou la relance. Le logo YouTube ne peut pas être retiré entièrement.
    return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${youtubeId}?${youtubePlayerParams}` };
  }
  const vimeoId = host === "vimeo.com" || host === "player.vimeo.com" ? parsed.pathname.match(/(\d{6,})/)?.[1] : null;
  // Vimeo : titre, auteur et portrait masqués (la barre de commandes ne se masque qu'avec un compte payant).
  if (vimeoId) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&dnt=1&title=0&byline=0&portrait=0&controls=0` };
  if (/\.(mp4|webm)$/i.test(parsed.pathname)) return { kind: "file", src: value };
  return null;
}

/** Miniature YouTube d'une vidéo (image affichée avant la lecture quand aucune image n'est fournie). */
export function youtubeThumbnail(url: string) {
  const source = demoVideoSource(url);
  const id = source?.kind === "iframe" ? /youtube-nocookie\.com\/embed\/([\w-]+)/.exec(source.src)?.[1] : null;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
