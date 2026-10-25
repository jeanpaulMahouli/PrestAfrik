import type { Instrumentation } from "next";

// Erreurs serveur (pages, routes, Server Actions, proxy) remontées dans la cloche de l'administration.
// Les redirections et pages introuvables volontaires (redirect(), notFound()) ne sont pas des erreurs.

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
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
};
