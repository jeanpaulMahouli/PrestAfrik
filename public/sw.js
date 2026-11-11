// Service worker de l'application PrestAfrik (PWA). Volontairement minimal : il rend l'application
// installable mais ne met rien en cache et n'intercepte aucune requête (pas de gestionnaire « fetch ») :
// le cache HTTP et celui de Next.js restent les seuls à servir les pages.
// Il affiche aussi les notifications push des vendeurs (nouvelle commande, message, nouveauté, rappel).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "PrestAfrik";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/brand/pwa/icon-192.png",
      badge: "/brand/pwa/icon-192.png",
      image: typeof data.image === "string" && data.image ? data.image : undefined,
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/dashboard" },
    }),
  );
});

// Clic sur la notification : on réutilise un onglet PrestAfrik déjà ouvert, sinon on en ouvre un.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        return open.focus().then((client) => (client && "navigate" in client ? client.navigate(url) : undefined));
      }
      return self.clients.openWindow(url);
    }),
  );
});
