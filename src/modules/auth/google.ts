import "server-only";

/** Connexion avec Google disponible : identifiants OAuth renseignés sur le serveur (docs/google-oauth.md). */
export function googleSignInEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
