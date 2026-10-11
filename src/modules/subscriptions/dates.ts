export type BillingPeriod = "MONTHLY" | "YEARLY";

export function addCalendarPeriod(date: Date, period: BillingPeriod): Date {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + (period === "MONTHLY" ? 1 : 12));
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

export function daysSince(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

export function isStoreSubscriptionPaused(
  subscription: {
    status: string;
    trialEndsAt: Date;
    currentPeriodEnd: Date | null;
  } | null,
  now = new Date(),
) {
  if (!subscription) {
    throw new Error("La boutique publiée n’a pas d’abonnement configuré.");
  }
  const active =
    (subscription.status === "TRIAL" && subscription.trialEndsAt > now) ||
    ((subscription.status === "ACTIVE" || subscription.status === "CANCELED") &&
      subscription.currentPeriodEnd !== null &&
      subscription.currentPeriodEnd > now);
  const expiresAt = subscription.currentPeriodEnd ?? subscription.trialEndsAt;
  return !active && daysSince(expiresAt, now) >= 14;
}
