"use server";

import { WhatsappApiStatus, WhatsappMode } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parsePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/secret-box";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { requireStorePermission } from "@/modules/stores/context";
import { verifyCloudApiCredentials } from "@/modules/whatsapp/cloud-api";
import { unknownVariables } from "@/modules/whatsapp/templates";

const linkPath = "/dashboard/boutique/whatsapp";
const apiPath = "/dashboard/boutique/whatsapp/api";

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

function fail(path: string, message: string): never {
  redirect(`${path}?erreur=${encodeURIComponent(message)}`);
}

function readStoredToken(encrypted: string | null | undefined) {
  if (!encrypted) return null;
  try {
    return decryptSecret(encrypted);
  } catch {
    return null;
  }
}

const templateSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(10, `${label} : écrivez au moins quelques mots.`)
    .max(600, `${label} : 600 caractères au maximum.`)
    .refine((value) => unknownVariables(value).length === 0, `${label} : seules les variables {prenom}, {reference}, {articles}, {montant}, {livraison} et {boutique} sont acceptées.`);

/** Configuration du mode lien wa.me (mode par défaut, sans compte technique). */
export async function saveWhatsappLinkAction(formData: FormData) {
  const { store } = await requireStorePermission("store.manage");
  const phone = parsePhone(text(formData, "businessCountry"), text(formData, "businessNational"));
  if (!phone.ok) fail(linkPath, phone.message);
  const parsed = z
    .object({ customerTemplate: templateSchema("Message du client"), storeTemplate: templateSchema("Message de la boutique") })
    .safeParse({ customerTemplate: text(formData, "customerTemplate"), storeTemplate: text(formData, "storeTemplate") });
  if (!parsed.success) fail(linkPath, parsed.error.issues[0]?.message ?? "Vérifiez vos messages.");

  const data = {
    businessNumber: phone.e164,
    businessCountry: phone.country,
    customerTemplate: parsed.data.customerTemplate,
    storeTemplate: parsed.data.storeTemplate,
    showConfirmAfterOrder: false,
    offerWriteToCustomer: true,
    productOrderButtonEnabled: formData.get("productOrderButtonEnabled") === "on",
  };
  await prisma.whatsappSettings.upsert({ where: { storeId: store.id }, create: { storeId: store.id, ...data }, update: data });
  revalidatePath(linkPath);
  revalidatePath("/dashboard");
  invalidateStorefrontCache(store.id, store.slug);
  redirect(`${linkPath}?succes=enregistre`);
}

/** Revenir au lien wa.me à tout moment ; les commandes en cours gardent leur statut. */
export async function switchToWhatsappLinkAction() {
  const { store } = await requireStorePermission("store.manage");
  await prisma.whatsappSettings.updateMany({ where: { storeId: store.id }, data: { mode: WhatsappMode.WA_ME } });
  revalidatePath(linkPath);
  invalidateStorefrontCache(store.id, store.slug);
  redirect(`${linkPath}?succes=lien`);
}

const apiSchema = z.object({
  apiPhoneNumberId: z.string().trim().regex(/^\d{5,40}$/, "L’identifiant du numéro ne contient que des chiffres."),
  apiBusinessAccountId: z.string().trim().refine((value) => !value || /^\d{5,40}$/.test(value), "L’identifiant du compte WhatsApp Business ne contient que des chiffres."),
  apiAccessToken: z.string().trim().max(1000, "Le jeton d’accès est trop long."),
  apiTemplateName: z.string().trim().regex(/^[a-z0-9_]{1,512}$/, "Le nom du modèle approuvé n’utilise que des minuscules, chiffres et _."),
  apiTemplateLanguage: z.string().trim().regex(/^[a-z]{2,3}(_[A-Z]{2})?$/, "La langue du modèle doit ressembler à fr ou fr_FR."),
  apiWebhookSecret: z.string().trim().max(500, "Le secret du webhook est trop long."),
});

/**
 * Configuration de l'API WhatsApp Business. La bascule vers l'API n'est possible que si le lien wa.me
 * est configuré et que la connexion à Meta est vérifiée (brief §6.8).
 */
export async function saveWhatsappApiAction(formData: FormData) {
  const { store } = await requireStorePermission("store.manage");
  const parsed = apiSchema.safeParse({
    apiPhoneNumberId: text(formData, "apiPhoneNumberId"),
    apiBusinessAccountId: text(formData, "apiBusinessAccountId"),
    apiAccessToken: text(formData, "apiAccessToken"),
    apiTemplateName: text(formData, "apiTemplateName"),
    apiTemplateLanguage: text(formData, "apiTemplateLanguage") || "fr",
    apiWebhookSecret: text(formData, "apiWebhookSecret"),
  });
  if (!parsed.success) fail(apiPath, parsed.error.issues[0]?.message ?? "Vérifiez les informations saisies.");
  const input = parsed.data;
  const existing = await prisma.whatsappSettings.findUnique({ where: { storeId: store.id } });
  if (!existing?.businessNumber) fail(apiPath, "Enregistrez d’abord la configuration du lien wa.me (numéro de la boutique).");
  const accessToken = input.apiAccessToken || readStoredToken(existing.apiAccessTokenEncrypted);
  if (!accessToken) fail(apiPath, "Indiquez le jeton d’accès de l’API.");

  const credentialsChanged = input.apiPhoneNumberId !== existing.apiPhoneNumberId || Boolean(input.apiAccessToken);
  const activate = formData.get("activate") === "on";
  let status: WhatsappApiStatus = credentialsChanged ? WhatsappApiStatus.PENDING_TEST : existing.apiStatus;
  let check: { displayPhoneNumber: string | null; verifiedName: string | null; error: string | null } | null = null;
  if (activate && status !== WhatsappApiStatus.CONNECTED) {
    const result = await verifyCloudApiCredentials({ phoneNumberId: input.apiPhoneNumberId, accessToken });
    check = result.ok ? { displayPhoneNumber: result.displayPhoneNumber, verifiedName: result.verifiedName, error: null } : { displayPhoneNumber: null, verifiedName: null, error: result.error };
    status = result.ok ? WhatsappApiStatus.CONNECTED : WhatsappApiStatus.FAILED;
  }

  await prisma.whatsappSettings.update({
    where: { storeId: store.id },
    data: {
      apiPhoneNumberId: input.apiPhoneNumberId,
      apiBusinessAccountId: input.apiBusinessAccountId || null,
      apiTemplateName: input.apiTemplateName,
      apiTemplateLanguage: input.apiTemplateLanguage,
      apiStatus: status,
      mode: activate && status === WhatsappApiStatus.CONNECTED ? WhatsappMode.CLOUD_API : existing.mode === WhatsappMode.CLOUD_API && status === WhatsappApiStatus.CONNECTED ? WhatsappMode.CLOUD_API : WhatsappMode.WA_ME,
      ...(input.apiAccessToken ? { apiAccessTokenEncrypted: encryptSecret(input.apiAccessToken) } : {}),
      ...(input.apiWebhookSecret ? { apiWebhookSecretEncrypted: encryptSecret(input.apiWebhookSecret) } : {}),
      ...(check
        ? { apiDisplayPhoneNumber: check.displayPhoneNumber, apiVerifiedName: check.verifiedName, apiLastCheckedAt: new Date(), apiLastError: check.error }
        : credentialsChanged
          ? { apiDisplayPhoneNumber: null, apiVerifiedName: null, apiLastCheckedAt: null, apiLastError: null }
          : {}),
    },
  });
  revalidatePath(apiPath);
  revalidatePath(linkPath);
  invalidateStorefrontCache(store.id, store.slug);
  if (check?.error) fail(apiPath, `Connexion API impossible : ${check.error} Vos réglages sont enregistrés et le lien wa.me reste actif.`);
  redirect(`${apiPath}?succes=${activate ? "api" : "enregistre"}`);
}

export async function testWhatsappConnectionAction() {
  const { store } = await requireStorePermission("store.manage");
  const settings = await prisma.whatsappSettings.findUnique({ where: { storeId: store.id } });
  const accessToken = readStoredToken(settings?.apiAccessTokenEncrypted);
  if (!settings?.apiPhoneNumberId || !accessToken) fail(apiPath, "Enregistrez d’abord l’identifiant du numéro et le jeton d’accès.");

  const result = await verifyCloudApiCredentials({ phoneNumberId: settings.apiPhoneNumberId, accessToken });
  await prisma.whatsappSettings.update({
    where: { storeId: store.id },
    data: {
      apiStatus: result.ok ? WhatsappApiStatus.CONNECTED : WhatsappApiStatus.FAILED,
      apiDisplayPhoneNumber: result.ok ? result.displayPhoneNumber : settings.apiDisplayPhoneNumber,
      apiVerifiedName: result.ok ? result.verifiedName : settings.apiVerifiedName,
      apiLastCheckedAt: new Date(),
      apiLastError: result.ok ? null : result.error,
      ...(result.ok ? {} : { mode: WhatsappMode.WA_ME }),
    },
  });
  revalidatePath(apiPath);
  if (!result.ok) fail(apiPath, `Connexion API impossible : ${result.error} Le lien wa.me reste actif.`);
  redirect(`${apiPath}?succes=test`);
}

export async function removeWhatsappApiAction() {
  const { store } = await requireStorePermission("store.manage");
  await prisma.whatsappSettings.updateMany({
    where: { storeId: store.id },
    data: {
      mode: WhatsappMode.WA_ME,
      apiPhoneNumberId: null,
      apiBusinessAccountId: null,
      apiAccessTokenEncrypted: null,
      apiTemplateName: null,
      apiWebhookSecretEncrypted: null,
      apiStatus: WhatsappApiStatus.NOT_CONFIGURED,
      apiDisplayPhoneNumber: null,
      apiVerifiedName: null,
      apiLastCheckedAt: null,
      apiLastError: null,
    },
  });
  revalidatePath(apiPath);
  invalidateStorefrontCache(store.id, store.slug);
  redirect(`${linkPath}?succes=api-retiree`);
}
