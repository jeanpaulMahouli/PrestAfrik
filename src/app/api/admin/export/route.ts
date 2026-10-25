import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { formatDate } from "@/lib/format";
import { isPlatformAdmin, logAdminAction } from "@/modules/admin/context";
import { storeStateDisplay } from "@/modules/admin/display";
import { listProspects, parseProspectionFilters, prospectStatus } from "@/modules/admin/prospection";
import { listAdminStores, listAdminSubscriptions, listAdminUsers, subscriptionFilters, type SubscriptionFilter } from "@/modules/admin/queries";
import { auth } from "@/modules/auth/server";
import { safeCsvCell } from "@/modules/catalog/validation";

const roleLabels = { OWNER: "Propriétaire", MANAGER: "Gestionnaire", ORDER_PREPARER: "Préparateur" } as const;

/** Exports CSV de l'administration (boutiques, abonnements, utilisateurs), sans aucune donnée client. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !(await isPlatformAdmin(session.user.id))) return new NextResponse("Introuvable.", { status: 404 });

  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().slice(0, 100) ?? "";
  const type = params.get("type");
  let rows: (string | number | null)[][];

  if (type === "boutiques") {
    const { stores } = await listAdminStores({ query, take: 10_000 });
    rows = [
      ["boutique", "adresse", "proprietaire", "email_proprietaire", "offre", "abonnement", "etat", "commandes_30j", "creee_le"],
      ...stores.map((store) => [store.name, store.slug, store.owner?.name ?? "", store.owner?.email ?? "", store.subscriptionState.offer, store.subscriptionState.label, storeStateDisplay(store, store.paused).label, store.orders30d, formatDate(store.createdAt)]),
    ];
  } else if (type === "abonnements") {
    const requested = params.get("statut") as SubscriptionFilter;
    const subscriptions = await listAdminSubscriptions(subscriptionFilters.includes(requested) ? requested : "all", query);
    rows = [
      ["boutique", "offre", "periode", "statut", "echeance"],
      ...subscriptions.map((subscription) => [subscription.store.name, subscription.state.offer, subscription.billingPeriod ?? "", subscription.state.label, subscription.state.dueAt ? formatDate(subscription.state.dueAt) : ""]),
    ];
  } else if (type === "utilisateurs") {
    const { users } = await listAdminUsers({ query, take: 10_000 });
    rows = [
      ["nom", "email", "email_confirme", "boutiques_et_roles", "derniere_connexion", "statut", "inscrit_le"],
      ...users.map((user) => [user.name, user.email, user.emailVerified ? "oui" : "non", user.memberships.map((m) => `${m.store.name} (${roleLabels[m.role]})`).join("; "), user.lastSeenAt ? formatDate(user.lastSeenAt) : "", user.suspendedAt ? "Suspendu" : "Actif", formatDate(user.createdAt)]),
    ];
  } else if (type === "prospection") {
    const filters = parseProspectionFilters(params.getAll("filtre"));
    const { rows: prospects } = await listProspects({ filters, query });
    rows = [
      ["nom", "email", "telephone", "ville", "pays", "boutiques", "statut", "inscrit_le", "derniere_activite", "a_aider"],
      ...prospects.map((row) => [
        row.name,
        row.email,
        row.phoneDigits ? `+${row.phoneDigits}` : "",
        row.city ?? "",
        row.country ?? "",
        row.storeCount,
        prospectStatus(row).label,
        formatDate(row.createdAt),
        row.lastActivity ? formatDate(row.lastActivity) : "",
        row.missing.join(" ; "),
      ]),
    ];
  } else {
    return new NextResponse("Export inconnu.", { status: 400 });
  }

  await logAdminAction(session.user.id, { action: `export.${type}`, targetType: "store", targetId: "platform", details: { rows: rows.length - 1 } });
  const csv = `\uFEFF${rows.map((row) => row.map((cell) => safeCsvCell(cell)).join(",")).join("\r\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prestafrik-${type}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
