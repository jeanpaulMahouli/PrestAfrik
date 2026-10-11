import Link from "next/link";
import {
  DeliveryStatus,
  OrderProcessingStatus,
} from "@prisma/client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DeliveryOrderActions } from "@/components/deliveries/delivery-order-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/modules/auth/permissions";
import { createCourier, createDeliveryZone } from "@/modules/orders/delivery-actions";
import { getOrderPaymentSummary } from "@/modules/payments/ledger";
import { requireStorePermission } from "@/modules/stores/context";

const statuses = [
  DeliveryStatus.TO_ORGANIZE,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
  DeliveryStatus.FAILED,
  DeliveryStatus.RETURNED,
] as const;

export default async function DeliveriesPage({
  searchParams,
}: PageProps<"/dashboard/livraisons">) {
  const { session, store, memberships, membership } =
    await requireStorePermission("delivery.manage");
  const params = await searchParams;
  const requestedStatus = firstValue(params.etat);
  const status = statuses.find((candidate) => candidate === requestedStatus);
  const pickupFilter = firstValue(params.retrait) === "1";
  const where = {
    storeId: store.id,
    processingStatus: OrderProcessingStatus.COMPLETED,
    ...(status ? { deliveryStatus: status } : {}),
    ...(pickupFilter ? { deliveryMethod: "PICKUP" } : {}),
  };
  const [orders, counts, couriers, zones, pickupCount] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        reference: true,
        customerName: true,
        customerWhatsapp: true,
        deliveryCity: true,
        neighborhood: true,
        deliveryMethod: true,
        deliveryStatus: true,
        processingStatus: true,
        totalXaf: true,
        createdAt: true,
        delivery: {
          select: {
            failureReason: true,
            courier: { select: { id: true, name: true, phone: true } },
          },
        },
        payments: {
          select: {
            type: true,
            amountXaf: true,
            reverses: { select: { type: true, amountXaf: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    Promise.all([
      prisma.order.count({
        where: {
          storeId: store.id,
          processingStatus: OrderProcessingStatus.COMPLETED,
          deliveryStatus: DeliveryStatus.TO_ORGANIZE,
        },
      }),
      prisma.order.count({
        where: {
          storeId: store.id,
          processingStatus: OrderProcessingStatus.COMPLETED,
          deliveryStatus: DeliveryStatus.IN_TRANSIT,
        },
      }),
      prisma.order.count({
        where: {
          storeId: store.id,
          processingStatus: OrderProcessingStatus.COMPLETED,
          deliveryStatus: DeliveryStatus.DELIVERED,
        },
      }),
      prisma.order.count({
        where: {
          storeId: store.id,
          processingStatus: OrderProcessingStatus.COMPLETED,
          deliveryStatus: DeliveryStatus.FAILED,
        },
      }),
      prisma.order.count({
        where: {
          storeId: store.id,
          processingStatus: OrderProcessingStatus.COMPLETED,
          deliveryStatus: DeliveryStatus.RETURNED,
        },
      }),
    ]),
    prisma.courier.findMany({
      where: { storeId: store.id, isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.deliveryZone.findMany({
      where: { storeId: store.id, isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        feeXaf: true,
        estimatedDelay: true,
        requiresConfirmation: true,
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.order.count({
      where: {
        storeId: store.id,
        processingStatus: OrderProcessingStatus.COMPLETED,
        deliveryMethod: "PICKUP",
        deliveryStatus: { notIn: [DeliveryStatus.DELIVERED, DeliveryStatus.RETURNED] },
      },
    }),
  ]);

  const error = deliveryError(firstValue(params.erreur));
  const success = deliverySuccess(firstValue(params.succes));
  const canManageZones = hasPermission(membership.role, "store.manage");
  return (
    <DashboardShell
      memberships={memberships}
      role={membership.role}
      store={store}
      userEmail={session.user.email}
      userName={session.user.name}
    >
      <div className="page-heading">
        <div>
          <h1 className="dashboard-heading">Livraisons</h1>
          <p className="dashboard-copy">Suis les commandes prêtes et les sommes à remettre.</p>
        </div>
        <a className="secondary-button" href="#zones-livraison">Zones et frais</a>
      </div>

      {error && <p aria-live="polite" className="form-error notice-error" role="alert">{error}</p>}
      {success && <p aria-live="polite" className="notice" role="status">{success}</p>}
      {firstValue(params.succes) === "livree" && firstValue(params.commande) && (
        <p className="delivery-collection-link">
          Livraison terminée.{" "}
          <Link href={`/dashboard/argent?commande=${encodeURIComponent(firstValue(params.commande)!)}`}>
            Enregistrer le montant encaissé
          </Link>
        </p>
      )}

      <nav aria-label="Filtrer les livraisons" className="delivery-tabs">
        <DeliveryTab href="/dashboard/livraisons" label="Toutes" count={counts.reduce((sum, count) => sum + count, 0)} active={!status} />
        {statuses.map((value, index) => (
          <DeliveryTab
            active={status === value}
            count={counts[index]}
            href={`/dashboard/livraisons?etat=${value}`}
            key={value}
            label={deliveryLabel(value)}
          />
        ))}
      </nav>

      {pickupCount > 0 && (
        <section className="surface-card pickup-summary">
          <div>
            <h2>Retraits en boutique</h2>
            <p className="dashboard-copy">{pickupCount} retrait{pickupCount === 1 ? "" : "s"} dans cette sélection.</p>
          </div>
          <a className="secondary-button" href="/dashboard/livraisons?retrait=1">Voir les retraits</a>
        </section>
      )}

      <section aria-label="Commandes à livrer" className="delivery-order-list">
        {orders.length ? orders.map((order) => {
          const summary = getOrderPaymentSummary(order.payments, order.totalXaf);
          const collectDue = summary.remainingXaf;
          return (
            <article className="surface-card delivery-order-card" key={order.id}>
              <div className="delivery-order-top">
                <div>
                  <Link className="order-reference" href={`/dashboard/commandes/${order.id}`}>
                    {order.reference}
                  </Link>
                  <p>{order.customerName} · {order.customerWhatsapp}</p>
                </div>
                <span className={`status-badge order-status order-status-${order.deliveryStatus.toLowerCase()}`}>
                  {deliveryLabel(order.deliveryStatus)}
                </span>
              </div>
              <dl className="delivery-order-info">
                <div><dt>Adresse</dt><dd>{order.deliveryCity}{order.neighborhood ? ` · ${order.neighborhood}` : ""}</dd></div>
                <div><dt>Mode</dt><dd>{order.deliveryMethod === "PICKUP" ? "Retrait boutique" : "Livraison"}</dd></div>
                <div><dt>Livreur</dt><dd>{order.delivery?.courier?.name ?? "Non assigné"}</dd></div>
                <div>
                  <dt>À encaisser</dt>
                  <dd>{collectDue === null ? "À confirmer" : `${formatAmount(collectDue)} FCFA`}</dd>
                </div>
              </dl>
              {order.delivery?.failureReason && (
                <p className="delivery-failure-note">Motif : {order.delivery.failureReason}</p>
              )}
              <DeliveryOrderActions
                couriers={couriers}
                deliveryMethod={order.deliveryMethod}
                deliveryStatus={order.deliveryStatus}
                orderId={order.id}
                processingStatus={order.processingStatus}
              />
              {summary.status !== "PENDING" && (
                <p className="delivery-payment-state">Déjà encaissé : {formatAmount(summary.paidXaf)} FCFA</p>
              )}
            </article>
          );
        }) : (
          <div className="surface-card empty-state order-empty">
            <h2>{status ? "Aucune livraison dans cet état" : "Aucune commande prête à livrer"}</h2>
            <p>Les commandes apparaîtront ici dès que leur préparation sera terminée.</p>
            <Link className="text-link" href="/dashboard/commandes">Voir les commandes</Link>
          </div>
        )}
      </section>

      <section className="delivery-setup-grid" id="zones-livraison">
        <article className="surface-card delivery-setup-card">
          <div className="delivery-setup-heading">
            <div>
              <h2>Zones et frais</h2>
              <p className="dashboard-copy">Les frais inconnus restent à confirmer avant la commande.</p>
            </div>
          </div>
          {zones.length ? (
            <ul className="delivery-zone-list">
              {zones.map((zone) => (
                <li key={zone.id}>
                  <span><strong>{zone.name}</strong><small>{zone.city}{zone.estimatedDelay ? ` · ${zone.estimatedDelay}` : ""}</small></span>
                  <strong>{zone.requiresConfirmation || zone.feeXaf === null ? "À confirmer" : `${formatAmount(zone.feeXaf)} FCFA`}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="dashboard-copy">Aucune zone de livraison active.</p>}
          {canManageZones && (
            <details className="delivery-add-details">
              <summary>Ajouter une zone</summary>
              <form action={createDeliveryZone} className="delivery-settings-form">
                <label className="form-field">Nom de la zone<input maxLength={120} minLength={2} name="name" required /></label>
                <label className="form-field">Ville<input maxLength={100} minLength={2} name="city" required /></label>
                <label className="form-field">Frais en FCFA<input min="0" name="fee" type="number" /></label>
                <label className="form-field">Délai indicatif<input maxLength={100} name="estimatedDelay" placeholder="24 à 48 h" /></label>
                <label className="form-field-checkbox">
                  <input name="requiresConfirmation" type="checkbox" />
                  Frais à confirmer par le vendeur
                </label>
                <SubmitButton className="primary-button" pendingLabel="Enregistrement…">Ajouter la zone</SubmitButton>
              </form>
            </details>
          )}
        </article>

        <article className="surface-card delivery-setup-card">
          <h2>Livreurs</h2>
          {couriers.length ? (
            <ul className="delivery-zone-list">
              {couriers.map((courier) => (
                <li key={courier.id}><span><strong>{courier.name}</strong><small>{courier.phone}</small></span><span className="status-badge order-status order-status-delivered">Actif</span></li>
              ))}
            </ul>
          ) : <p className="dashboard-copy">Ajoute un livreur pour lui confier tes commandes.</p>}
          <details className="delivery-add-details">
            <summary>Ajouter un livreur</summary>
            <form action={createCourier} className="delivery-settings-form">
              <label className="form-field">Nom du livreur<input autoComplete="name" maxLength={120} minLength={2} name="name" required /></label>
              <label className="form-field">Téléphone<input autoComplete="tel" maxLength={20} name="phone" placeholder="+237 6XX XXX XXX" required type="tel" /></label>
              <SubmitButton className="primary-button" pendingLabel="Enregistrement…">Ajouter le livreur</SubmitButton>
            </form>
          </details>
        </article>
      </section>
    </DashboardShell>
  );
}

function DeliveryTab({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link aria-current={active ? "page" : undefined} className={active ? "delivery-tab active" : "delivery-tab"} href={href}>
      <span>{label}</span><strong>{count}</strong>
    </Link>
  );
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function deliveryLabel(status: DeliveryStatus) {
  return {
    TO_ORGANIZE: "À organiser",
    IN_TRANSIT: "En cours",
    DELIVERED: "Livrée",
    FAILED: "Échouée",
    RETURNED: "Retournée",
    PICKUP: "Retrait boutique",
  }[status];
}

function deliveryError(code: string | undefined) {
  const messages: Record<string, string> = {
    "livreur-invalide": "Vérifie les informations du livreur.",
    "telephone-invalide": "Saisis un numéro camerounais valide au format +237.",
    "livreur-existant": "Ce numéro est déjà associé à un livreur de cette boutique.",
    "zone-invalide": "Vérifie le nom, la ville et les frais de la zone.",
    "zone-existante": "Cette zone existe déjà pour cette ville.",
    "affectation-invalide": "Choisis un livreur et une commande valides.",
    "affectation-echouee": "La commande ou le livreur a changé. Actualise la page.",
    "action-invalide": "L’action de livraison est invalide.",
    "motif-requis": "Indique le motif de l’échec de livraison.",
    "transition-echouee": "La livraison a changé ou ne peut plus effectuer cette transition.",
  };
  return code ? messages[code] ?? "Une erreur est survenue. Réessaie." : "";
}

function deliverySuccess(code: string | undefined) {
  return {
    livreur: "Le livreur a été ajouté.",
    zone: "La zone de livraison a été ajoutée.",
    affectation: "Le livreur est affecté et la livraison a commencé.",
    statut: "Le statut de livraison a été mis à jour.",
    livree: "La livraison est marquée comme terminée.",
  }[code ?? ""] ?? "";
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount);
}
