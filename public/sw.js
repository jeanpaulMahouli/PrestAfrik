// Service worker de l'application PrestAfrik (PWA). Volontairement minimal : il rend l'application
// installable mais ne met rien en cache et n'intercepte aucune requête (pas de gestionnaire « fetch ») :
// le cache HTTP et celui de Next.js restent les seuls à servir les pages.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
