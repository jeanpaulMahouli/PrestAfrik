import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublishedScreen, PublishStep } from "@/components/wizard/wizard-publish";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { ActivityStep, BrandingStep, ContactStep, LocationStep, NameStep, ProductStep, ThemeStep } from "@/components/wizard/wizard-steps";
import { phoneCountries, splitE164 } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { storePublicUrl } from "@/lib/urls";
import { formatFcfa } from "@/lib/format";
import { geoDataset } from "@/modules/geo";
import { getPublicationChecklist } from "@/modules/stores/publication";
import { requireWizardSession, resolveWizardStore, wizardStepCount, wizardSteps } from "@/modules/stores/wizard";

export const metadata: Metadata = { title: "Créer ma boutique" };

const themeNames = { CATALOGUE_EXPRESS: "Catalogue express", MODE_BEAUTE: "Mode et beauté", BOUTIQUE_MARQUE: "Boutique de marque" } as const;

/** Assistant de création en 8 étapes (brief §6.3) : chaque étape est enregistrée, reprise possible. */
export default async function NewStorePage({ searchParams }: PageProps<"/boutiques/nouvelle">) {
  const session = await requireWizardSession();
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const store = await resolveWizardStore(session.user.id, { boutique: value("boutique"), nouvelle: value("nouvelle") });
  if (value("boutique") && !store) redirect("/boutiques/nouvelle");

  const reached = store ? (store.onboardingStep ?? wizardStepCount + 1) : 1;
  const published = store?.isPublished ?? false;
  const requested = value("etape");
  if (requested === "publiee" && store && published) {
    return (
      <WizardShell current={wizardStepCount + 1} initialDraft={draftOf(store)} reached={wizardStepCount + 1} showThemeLabel steps={wizardSteps} storeId={store.id}>
        <PublishedScreen storeName={store.name} storeUrl={storePublicUrl(store.slug)} />
      </WizardShell>
    );
  }
  // Une boutique déjà publiée se règle depuis « Ma boutique ».
  if (store && store.onboardingStep === null && !requested) redirect("/dashboard/boutique");

  const asked = Number(requested);
  const step = store ? (Number.isInteger(asked) && asked >= 1 && asked <= Math.min(reached, wizardStepCount) ? asked : Math.min(reached, wizardStepCount)) : 1;
  const draft = store ? draftOf(store) : { name: "", activity: "", location: "", theme: "CATALOGUE_EXPRESS" as const, primaryColor: "#FF9900", secondaryColor: "#000026", accentColor: "#EF765E", logoUrl: null };

  let content: React.ReactNode = null;
  if (!store || step === 1) {
    content = <NameStep city={store?.city ?? null} initialName={store?.name ?? ""} initialSlug={store?.slug ?? ""} storeId={store?.id ?? null} />;
  } else if (step === 2) {
    const activities = await prisma.activity.findMany({ orderBy: { position: "asc" }, select: { id: true, label: true, popular: true } });
    content = <ActivityStep activities={activities} initialId={store.activityId ?? ""} initialOther={store.activityOther ?? ""} storeId={store.id} />;
  } else if (step === 3) {
    const countries = phoneCountries().map(({ iso, name }) => ({ iso: iso as string, name }));
    const geo = Object.fromEntries(["CM"].map((iso) => [iso, geoDataset(iso)?.regions ?? []]));
    content = <LocationStep countries={countries} geo={geo} initial={{ country: store.country, region: store.region ?? "", city: store.city ?? "", neighborhood: store.neighborhood ?? "" }} storeId={store.id} />;
  } else if (step === 4) {
    const phone = splitE164(store.phoneE164 ?? store.contactPhone);
    const whatsapp = store.whatsappSettings?.businessNumber ? splitE164(store.whatsappSettings.businessNumber) : null;
    content = <ContactStep contactEmail={store.contactEmail ?? ""} phone={phone} storeId={store.id} whatsapp={whatsapp} />;
  } else if (step === 5) {
    content = <ThemeStep initialTheme={store.theme} storeId={store.id} />;
  } else if (step === 6) {
    content = (
      <BrandingStep
        initial={{ primaryColor: store.primaryColor, secondaryColor: store.secondaryColor, accentColor: store.accentColor, logoUrl: store.logoUrl, initials: initialsOf(store.name) }}
        storeId={store.id}
      />
    );
  } else if (step === 7) {
    const product = await prisma.product.findFirst({ where: { storeId: store.id }, orderBy: { createdAt: "asc" }, select: { name: true } });
    content = <ProductStep existingProduct={product?.name ?? null} storeId={store.id} />;
  } else {
    const [product, checklist] = await Promise.all([
      prisma.product.findFirst({ where: { storeId: store.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { name: true, priceXaf: true, _count: { select: { images: true } } } }),
      getPublicationChecklist(store.id, session.user.emailVerified),
    ]);
    const phone = store.phoneE164 ?? store.contactPhone;
    const recap = [
      { label: "Nom et adresse", value: `${store.name} · prestafrik.com/boutique/${store.slug}`, step: 1, done: true },
      { label: "Activité", value: store.activity?.label ?? store.activityOther ?? "À préciser", step: 2, done: Boolean(store.activityId || store.activityOther) },
      { label: "Localisation", value: [store.city, store.region].filter(Boolean).join(", ") || "À préciser", step: 3, done: Boolean(store.city) },
      { label: "Coordonnées", value: phone ? phone.replace(/(\+\d{3})(\d)\d+(\d{2})$/, "$1 $2 •• •• •• $3") : "À préciser", step: 4, done: Boolean(phone) },
      { label: "Thème", value: themeNames[store.theme], step: 5, done: true },
      { label: "Logo et couleurs", value: `${store.logoUrl ? "Logo ajouté" : "Initiales affichées"} · ${store.primaryColor === "#FF9900" ? "couleurs PrestAfrik" : "couleurs personnalisées"}`, step: 6, done: true },
      { label: "Premier produit", value: product ? `${product.name} · ${formatFcfa(product.priceXaf)} · ${product._count.images} photo${product._count.images > 1 ? "s" : ""}` : "Aucun produit pour l’instant", step: 7, done: Boolean(product) },
    ];
    const askDeliveryFee = checklist.some((item) => item.key === "delivery" && !item.done);
    const missing = checklist.filter((item) => !item.done && item.key !== "delivery").map((item) => ({ label: item.label, href: item.href }));
    content = <PublishStep askDeliveryFee={askDeliveryFee} city={store.city ?? "votre ville"} missing={missing} recap={recap} storeId={store.id} />;
  }

  return (
    <WizardShell current={step} initialDraft={draft} reached={reached} showThemeLabel={step >= 5} steps={wizardSteps} storeId={store?.id ?? null}>
      {content}
    </WizardShell>
  );
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("fr-FR")).join("") || "MB";
}

function draftOf(store: NonNullable<Awaited<ReturnType<typeof resolveWizardStore>>>) {
  return {
    name: store.name,
    activity: store.activity?.label ?? store.activityOther ?? "",
    location: store.city ? `${store.city}${store.country === "CM" ? ", Cameroun" : ""}` : "",
    theme: store.theme,
    primaryColor: store.primaryColor,
    secondaryColor: store.secondaryColor,
    accentColor: store.accentColor,
    logoUrl: store.logoUrl,
  };
}
