import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreatedScreen, PublishedScreen, PublishStep } from "@/components/wizard/wizard-publish";
import { DeliveryStep } from "@/components/wizard/wizard-delivery-step";
import { EmailVerificationGate } from "@/components/wizard/wizard-email-gate";
import { WizardShell, type PreviewDraft } from "@/components/wizard/wizard-shell";
import { ActivityStep, BrandingStep, ContactStep, LocationStep, NameStep, ProductStep, ThemeStep } from "@/components/wizard/wizard-steps";
import { formatFcfa } from "@/lib/format";
import { phoneCountries } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { storeAddressFormat, storeAddressLabel, storePublicUrl } from "@/lib/urls";
import { geoDataset, supportedCountries } from "@/modules/geo";
import { draftMissing, findDraft, type DraftData } from "@/modules/stores/draft";
import { getPublicationChecklist } from "@/modules/stores/publication";
import { findOwnedStore, requireWizardSession, wizardStepCount, wizardSteps } from "@/modules/stores/wizard";

export const metadata: Metadata = { title: "Créer ma boutique" };

const themeNames = { CATALOGUE_EXPRESS: "Catalogue express", MODE_BEAUTE: "Mode et beauté", BOUTIQUE_MARQUE: "Galerie", GRAND_MARCHE: "Grand marché" } as const;
const defaultColors = { primaryColor: "#FF9900", secondaryColor: "#000026", accentColor: "#EF765E" };

/**
 * Assistant de création en 8 étapes (brief §6.3). Les réponses sont gardées dans un brouillon :
 * la boutique n'est créée qu'à la dernière étape (voir src/modules/stores/draft.ts).
 *   ?brouillon=…&etape=N   reprise d'un brouillon
 *   ?nouvelle=1            nouveau brouillon (même si un autre est en cours)
 *   ?boutique=…&etape=publiee|creee   écran final, une fois la boutique créée
 */
export default async function NewStorePage({ searchParams }: PageProps<"/boutiques/nouvelle">) {
  const session = await requireWizardSession();
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const requested = value("etape");

  // Écran final : la boutique existe.
  if (value("boutique")) {
    const store = await findOwnedStore(session.user.id, value("boutique")!);
    if (!store) redirect("/dashboard");
    const preview = previewOfStore(store);
    if (requested === "publiee" && store.isPublished) {
      return (
        <WizardShell current={wizardStepCount + 1} draftId={null} initialDraft={preview} reached={wizardStepCount + 1} showThemeLabel steps={wizardSteps}>
          <PublishedScreen storeName={store.name} storeUrl={storePublicUrl(store.slug)} />
        </WizardShell>
      );
    }
    if (requested === "creee" && !store.isPublished) {
      const checklist = await getPublicationChecklist(store.id, session.user.emailVerified);
      const missing = checklist.filter((item) => !item.done && item.key !== "email").map((item) => ({ label: item.label, href: item.href }));
      return (
        <WizardShell current={wizardStepCount + 1} draftId={null} initialDraft={preview} reached={wizardStepCount + 1} showThemeLabel steps={wizardSteps}>
          <CreatedScreen email={session.user.email} emailVerified={session.user.emailVerified} missing={missing} storeName={store.name} storeUrl={storePublicUrl(store.slug)} />
        </WizardShell>
      );
    }
    redirect("/dashboard/boutique");
  }

  // Adresse e-mail à confirmer avant toute création de boutique : on demande de consulter sa boîte de réception.
  if (!session.user.emailVerified) {
    return (
      <WizardShell current={1} draftId={null} initialDraft={previewOfDraft({})} reached={1} showThemeLabel={false} steps={wizardSteps}>
        <EmailVerificationGate email={session.user.email} />
      </WizardShell>
    );
  }

  const draft = value("nouvelle") === "1" ? null : await findDraft(session.user.id, value("brouillon"));
  if (value("brouillon") && !draft) redirect("/boutiques/nouvelle");
  const data: DraftData = draft?.data ?? {};
  const reached = draft ? Math.min(draft.step, wizardStepCount) : 1;
  const asked = Number(requested);
  const step = draft ? (Number.isInteger(asked) && asked >= 1 && asked <= reached ? asked : reached) : 1;
  const draftId = draft?.id ?? null;
  // Sans boutique, le tableau de bord renverrait ici : on quitte l'assistant vers l'accueil.
  const hasStore = (await prisma.storeMembership.count({ where: { userId: session.user.id } })) > 0;

  let content: React.ReactNode = null;
  if (!draft || step === 1) {
    content = <NameStep address={storeAddressFormat()} city={data.city ?? null} draftId={draftId} initialName={data.name ?? ""} initialSlug={data.slug ?? ""} />;
  } else if (step === 2) {
    const activities = await prisma.activity.findMany({ orderBy: { position: "asc" }, select: { id: true, label: true, popular: true } });
    content = <ActivityStep activities={activities} draftId={draft.id} initialId={data.activityId ?? ""} initialOther={data.activityOther ?? ""} />;
  } else if (step === 3) {
    // Seuls les pays dont la liste des régions et des villes existe : rien ne se saisit à la main.
    const countries = phoneCountries().filter(({ iso }) => supportedCountries.includes(iso)).map(({ iso, name }) => ({ iso: iso as string, name }));
    const geo = Object.fromEntries(supportedCountries.map((iso) => [iso, geoDataset(iso)?.regions ?? []]));
    content = <LocationStep countries={countries} draftId={draft.id} geo={geo} initial={{ country: data.country ?? "CM", region: data.region ?? "", city: data.city ?? "", neighborhood: data.neighborhood ?? "" }} />;
  } else if (step === 4) {
    content = (
      <ContactStep
        contactEmail={data.contactEmail ?? ""}
        draftId={draft.id}
        phone={data.phone ? { country: data.phone.country, national: data.phone.national } : { country: data.country ?? "CM", national: "" }}
        whatsapp={data.whatsapp ? { country: data.whatsapp.country, national: data.whatsapp.national } : null}
      />
    );
  } else if (step === 5) {
    content = <ThemeStep draftId={draft.id} initialTheme={data.theme ?? "CATALOGUE_EXPRESS"} />;
  } else if (step === 6) {
    content = (
      <BrandingStep
        draftId={draft.id}
        initial={{
          primaryColor: data.primaryColor ?? defaultColors.primaryColor,
          secondaryColor: data.secondaryColor ?? defaultColors.secondaryColor,
          accentColor: data.accentColor ?? defaultColors.accentColor,
          logoUrl: data.logoUrl ?? null,
          initials: initialsOf(data.name ?? ""),
        }}
      />
    );
  } else if (step === 7) {
    const product = data.product
      ? {
          name: data.product.name,
          priceXaf: data.product.priceXaf,
          photos: data.product.photos.map((photo) => ({
            key: photo.key,
            alt: photo.alt ?? "",
            previewUrl: `/media/stores/${draft.id}/${photo.key}-320.webp`,
          })),
        }
      : null;
    content = <ProductStep draftId={draft.id} product={product} />;
  } else if (step === 8) {
    content = (
      <DeliveryStep
        city={data.city ?? ""}
        draftId={draft.id}
        initial={{
          zones: data.deliveryZones ?? [],
          pickupEnabled: data.pickupEnabled ?? true,
          pickupAddress: data.pickupAddress ?? [data.neighborhood, data.city].filter(Boolean).join(", "),
          pickupHours: data.pickupHours ?? "",
        }}
      />
    );
  } else {
    const phone = data.phone?.e164;
    const recap = [
      { label: "Nom et adresse", value: data.name ? `${data.name} · ${storeAddressLabel(data.slug ?? "")}` : "À préciser", step: 1, done: Boolean(data.name && data.slug) },
      { label: "Activité", value: data.activityLabel ?? data.activityOther ?? "À préciser", step: 2, done: Boolean(data.activityId || data.activityOther) },
      { label: "Localisation", value: [data.city, data.region].filter(Boolean).join(", ") || "À préciser", step: 3, done: Boolean(data.city) },
      { label: "Coordonnées", value: phone ? phone.replace(/(\+\d{3})(\d)\d+(\d{2})$/, "$1 $2 •• •• •• $3") : "À préciser", step: 4, done: Boolean(phone) },
      { label: "Thème", value: themeNames[data.theme ?? "CATALOGUE_EXPRESS"], step: 5, done: true },
      { label: "Logo et couleurs", value: `${data.logoUrl ? "Logo ajouté" : "Initiales affichées"} · ${(data.primaryColor ?? defaultColors.primaryColor) === defaultColors.primaryColor ? "couleurs PrestAfrik" : "couleurs personnalisées"}`, step: 6, done: true },
      {
        label: "Premier produit",
        value: data.product ? `${data.product.name} · ${formatFcfa(data.product.priceXaf)} · ${data.product.photos.length} photo${data.product.photos.length > 1 ? "s" : ""}` : "Aucun produit pour l’instant (vous pourrez en ajouter ensuite)",
        step: 7,
        done: Boolean(data.product),
      },
      {
        label: "Livraison et retrait",
        value:
          [
            data.deliveryZones?.length ? `${data.deliveryZones.length} zone${data.deliveryZones.length > 1 ? "s" : ""} de livraison` : null,
            (data.pickupEnabled ?? true) ? `retrait${data.pickupAddress ? ` : ${data.pickupAddress}` : " en boutique"}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "À régler plus tard dans « Livraisons »",
        step: 8,
        done: Boolean(data.deliveryZones?.length || (data.pickupEnabled && data.pickupAddress)),
      },
    ];
    content = <PublishStep draftId={draft.id} missing={draftMissing(data)} recap={recap} />;
  }

  return (
    <WizardShell current={step} draftId={draftId} exitHref={hasStore ? "/dashboard" : "/"} initialDraft={previewOfDraft(data)} reached={reached} showThemeLabel={step >= 5} steps={wizardSteps}>
      {content}
    </WizardShell>
  );
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "MB";
}

function previewOfDraft(data: DraftData): PreviewDraft {
  return {
    name: data.name ?? "",
    activity: data.activityLabel ?? data.activityOther ?? "",
    location: data.city ? `${data.city}${(data.country ?? "CM") === "CM" ? ", Cameroun" : ""}` : "",
    theme: data.theme ?? "CATALOGUE_EXPRESS",
    primaryColor: data.primaryColor ?? defaultColors.primaryColor,
    secondaryColor: data.secondaryColor ?? defaultColors.secondaryColor,
    accentColor: data.accentColor ?? defaultColors.accentColor,
    logoUrl: data.logoUrl ?? null,
  };
}

function previewOfStore(store: NonNullable<Awaited<ReturnType<typeof findOwnedStore>>>): PreviewDraft {
  return {
    name: store.name,
    activity: "",
    location: store.city ? `${store.city}${store.country === "CM" ? ", Cameroun" : ""}` : "",
    theme: store.theme,
    primaryColor: store.primaryColor,
    secondaryColor: store.secondaryColor,
    accentColor: store.accentColor,
    logoUrl: store.logoUrl,
  };
}
