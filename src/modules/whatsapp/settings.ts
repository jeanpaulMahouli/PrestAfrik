import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storefrontTag } from "@/modules/catalog/service";
import { normalizeWhatsappNumber } from "@/modules/whatsapp/wa-me";
import { currentTemplate, defaultCustomerTemplate, defaultStoreTemplate } from "@/modules/whatsapp/templates";

/** Réglages WhatsApp d'une boutique, avec les valeurs par défaut si rien n'est enregistré. */
export async function getWhatsappSettings(storeId: string) {
  const [settings, store] = await Promise.all([
    prisma.whatsappSettings.findUnique({ where: { storeId } }),
    prisma.store.findUnique({ where: { id: storeId }, select: { contactPhone: true, phoneE164: true } }),
  ]);
  const storePhone = store?.phoneE164 ?? store?.contactPhone;
  const fallbackNumber = storePhone ? normalizeWhatsappNumber(storePhone) : null;

  return {
    saved: settings !== null,
    mode: settings?.mode ?? "WA_ME",
    businessNumber: settings ? settings.businessNumber : fallbackNumber,
    productOrderButtonEnabled: settings?.productOrderButtonEnabled ?? true,
    customerTemplate: currentTemplate(settings?.customerTemplate, defaultCustomerTemplate),
    storeTemplate: currentTemplate(settings?.storeTemplate, defaultStoreTemplate),
    showConfirmAfterOrder: settings?.showConfirmAfterOrder ?? true,
    offerWriteToCustomer: settings?.offerWriteToCustomer ?? true,
    apiPhoneNumberId: settings?.apiPhoneNumberId ?? "",
    apiBusinessAccountId: settings?.apiBusinessAccountId ?? "",
    apiTemplateName: settings?.apiTemplateName ?? "",
    apiTemplateLanguage: settings?.apiTemplateLanguage ?? "fr",
    hasAccessToken: Boolean(settings?.apiAccessTokenEncrypted),
    hasWebhookSecret: Boolean(settings?.apiWebhookSecretEncrypted),
    apiStatus: settings?.apiStatus ?? "NOT_CONFIGURED",
    apiDisplayPhoneNumber: settings?.apiDisplayPhoneNumber ?? null,
    apiVerifiedName: settings?.apiVerifiedName ?? null,
    apiLastCheckedAt: settings?.apiLastCheckedAt ?? null,
    apiLastError: settings?.apiLastError ?? null,
  } as const;
}

/** Numéro public utilisé par les liens wa.me de la vitrine (null si indisponible). */
export async function getStorefrontWhatsapp(storeId: string) {
  return unstable_cache(
    async () => {
      const settings = await getWhatsappSettings(storeId);
      return {
        number: settings.businessNumber,
        productOrderButtonEnabled: settings.productOrderButtonEnabled,
        customerTemplate: settings.customerTemplate,
        showConfirmAfterOrder: settings.showConfirmAfterOrder,
      };
    },
    ["storefront-whatsapp", storeId],
    { revalidate: 60, tags: [storefrontTag(storeId)] },
  )();
}
