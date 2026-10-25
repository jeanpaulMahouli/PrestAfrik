import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

function createClient() {
  const client = new PrismaClient({
    log: [
      ...(process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const)),
      // Durée de chaque requête : les plus lentes remontent dans la cloche de l'administration.
      { emit: "event", level: "query" } as const,
    ],
  });
  const threshold = Number(process.env.SLOW_QUERY_MS) || 2000;
  client.$on("query", (event) => {
    if (event.duration < threshold || event.query.includes("SystemNotification")) return;
    // Seul le début de la requête est gardé (jamais ses paramètres).
    const statement = event.query.replace(/\s+/g, " ").slice(0, 160);
    void import("@/modules/system/notifications").then(({ recordSystemNotification }) =>
      recordSystemNotification({ type: "slow-query", severity: "WARNING", message: `Requête de plus de ${threshold} ms : ${statement}`, context: { durationMs: event.duration } }),
    );
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
