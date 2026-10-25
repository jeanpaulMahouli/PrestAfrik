import type { Instrumentation } from "next";

/**
 * Au démarrage du serveur : après une Server Action qui redirige (redirect()), Next.js récupère la page
 * suivante en interrogeant le serveur lui-même. Derrière le proxy d'Hostinger, la requête arrive marquée
 * « https » (x-forwarded-proto) et Next appelle alors https://localhost:<port>, alors que Node écoute en
 * HTTP simple : « failed to get redirect response TypeError: fetch failed » à chaque formulaire.
 * On lui donne l'adresse interne réelle (HTTP, boucle locale). Variable lue par Next à chaque action.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.__NEXT_PRIVATE_ORIGIN && process.env.PORT && /^\d+$/.test(process.env.PORT)) {
    process.env.__NEXT_PRIVATE_ORIGIN = `http://127.0.0.1:${process.env.PORT}`;
  }
}

// Erreurs serveur (pages, routes, Server Actions, proxy) remontées dans la cloche de l'administration.
// Les redirections et pages introuvables volontaires (redirect(), notFound()) ne sont pas des erreurs.
// L'import reste dans la condition NEXT_RUNTIME : le module (node:crypto, Prisma) est ainsi exclu du bundle edge.

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : "";
    if (/^NEXT_(REDIRECT|HTTP_ERROR_FALLBACK|NOT_FOUND)/.test(digest)) return;
    const message = error instanceof Error ? `${error.name} : ${error.message}` : String(error);
    const { recordSystemNotification } = await import("@/modules/system/notifications");
    await recordSystemNotification({
      type: "server-error",
      severity: "CRITICAL",
      message,
      // Chemin sans paramètres (ils peuvent contenir des données personnelles).
      context: { route: context.routePath ?? request.path.split("?")[0], method: request.method, kind: context.routeType, digest: digest || null },
    });
  }
};
