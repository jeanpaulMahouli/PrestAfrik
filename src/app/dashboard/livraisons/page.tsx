import { VendorShell } from "@/components/layout/vendor-shell";
import { ActionDialog } from "@/components/ui/action-dialog";
import { formatFcfa } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { countryCities } from "@/modules/geo";
import { createDeliveryZone, updateDeliveryZone } from "@/modules/orders/delivery-actions";
import { requireStorePermission } from "@/modules/stores/context";

export const metadata = { title: "Livraisons" };

const successMessages: Record<string, string> = {
  zone: "Zone ajoutée. Vos clients la voient dès maintenant.",
  "zone-modifiee": "Zone mise à jour. Les commandes déjà passées gardent leurs frais.",
};

/** Zones de livraison avec frais fixes : le client connaît le prix avant de commander (ADR-013). */
export default async function DeliveriesPage({ searchParams }: PageProps<"/dashboard/livraisons">) {
  const { store } = await requireStorePermission("delivery.manage");
  const cities = countryCities(store.country);
  const params = await searchParams;
  const zones = await prisma.deliveryZone.findMany({ where: { storeId: store.id }, orderBy: [{ isActive: "desc" }, { city: "asc" }, { name: "asc" }] });
  const error = typeof params.erreur === "string" ? params.erreur : null;
  const success = typeof params.succes === "string" ? successMessages[params.succes] : null;

  return (
    <VendorShell>
      <div className="v-page-header">
        <div>
          <h1 className="v-page-title">Livraisons</h1>
          <p className="v-page-subtitle">Indiquez où vous livrez et à quel prix. Vos clients voient les frais avant de commander.</p>
        </div>
        <div className="v-page-actions">
          <ActionDialog action={createDeliveryZone} submitLabel="Ajouter la zone" title="Ajouter une zone de livraison" triggerClassName="btn btn-primary" triggerLabel="+ Ajouter une zone">
            <ZoneFields cities={cities} city={store.city ?? ""} />
          </ActionDialog>
        </div>
      </div>

      {error && <p className="v-banner v-banner-danger" role="alert">{error}</p>}
      {success && <p className="v-banner v-banner-success" role="status">{success}</p>}

      <section aria-labelledby="zones-title" className="v-card" id="zones-livraison">
        <h2 className="v-card-title" id="zones-title">Zones et frais de livraison</h2>
        {zones.length ? (
          <ul className="zone-list">
            {zones.map((zone) => (
              <li className={zone.isActive ? "" : "is-inactive"} key={zone.id}>
                <div>
                  <span>{zone.name}{zone.city && !zone.name.includes(zone.city) ? ` · ${zone.city}` : ""}</span>
                  <small>{zone.estimatedDelay ?? "Délai non précisé"}{zone.isActive ? "" : " · désactivée"}</small>
                </div>
                <strong>{zone.feeXaf === null ? "Frais à indiquer" : zone.feeXaf === 0 ? "Gratuit" : formatFcfa(zone.feeXaf)}</strong>
                <ActionDialog
                  action={updateDeliveryZone}
                  hiddenFields={{ zoneId: zone.id }}
                  submitLabel="Enregistrer"
                  title={`Modifier la zone « ${zone.name} »`}
                  triggerClassName="v-link-button zone-edit"
                  triggerLabel="Modifier"
                >
                  <ZoneFields cities={cities} city={zone.city} delay={zone.estimatedDelay} fee={zone.feeXaf} isActive={zone.isActive} name={zone.name} />
                </ActionDialog>
              </li>
            ))}
          </ul>
        ) : (
          <p className="v-small">Aucune zone pour l’instant. Ajoutez au moins une zone (ou activez le retrait en boutique) pour recevoir des commandes.</p>
        )}
      </section>
    </VendorShell>
  );
}

function ZoneFields({ name = "", city, cities, fee = null, delay = null, isActive }: { name?: string; city: string; cities: string[]; fee?: number | null; delay?: string | null; isActive?: boolean }) {
  return (
    <>
      <label className="v-field">
        Quartier ou zone
        <input defaultValue={name} maxLength={120} name="name" placeholder="Ex. Akwa, ou Toute la ville" required />
      </label>
      <label className="v-field">
        Ville
        <select defaultValue={cities.includes(city) ? city : ""} name="city" required>
          <option disabled value="">Choisir une ville</option>
          {cities.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <div className="v-grid-2 dialog-grid">
        <label className="v-field">
          Frais de livraison (FCFA)
          <input defaultValue={fee ?? ""} inputMode="numeric" name="fee" placeholder="Ex. 1500 (0 = gratuit)" required />
        </label>
        <label className="v-field">
          Délai (facultatif)
          <input defaultValue={delay ?? ""} maxLength={100} name="estimatedDelay" placeholder="Ex. 24 h" />
        </label>
      </div>
      {isActive !== undefined && (
        <label className="v-check zone-active-check">
          <input defaultChecked={isActive} name="isActive" type="checkbox" />
          Zone active (proposée aux clients)
        </label>
      )}
    </>
  );
}
