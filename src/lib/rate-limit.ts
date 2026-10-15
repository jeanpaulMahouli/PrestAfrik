import "server-only";

// Limitation de débit en mémoire (une instance). Interface simple pour pouvoir la remplacer par une
// implémentation Redis ou base de données si l'application tourne sur plusieurs instances.

export type RateLimiter = { consume(key: string): { allowed: boolean; retryAfterSeconds: number } };

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    consume(key) {
      const now = Date.now();
      if (hits.size > 10_000) {
        for (const [entryKey, entry] of hits) if (entry.resetAt <= now) hits.delete(entryKey);
      }
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      entry.count += 1;
      return { allowed: entry.count <= limit, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    },
  };
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
