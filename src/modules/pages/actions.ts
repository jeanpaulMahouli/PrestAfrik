"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PhotoError, attachTemporaryPagePhotos, deleteProductPhoto } from "@/lib/product-photos";
import { hasPermission } from "@/modules/auth/permissions";
import { invalidateStorefrontCache } from "@/modules/catalog/cache";
import { blocksSchema, pageKinds, starterBlocks, type PageBlock } from "@/modules/pages/blocks";
import { getStoreContext } from "@/modules/stores/context";

export type PageSaveState = null | { ok: true; status: "DRAFT" | "PUBLISHED" } | { ok: false; message: string };

const kindSchema = z.enum(["ABOUT", "CONTACT", "FAQ", "PROMO"]);

async function context() {
  const ctx = await getStoreContext();
  if (!hasPermission(ctx.membership.role, "store.manage")) return null;
  return ctx;
}

function refresh(store: { id: string; slug: string }) {
  revalidatePath("/dashboard/boutique/pages");
  revalidatePath(`/${store.slug}`);
  invalidateStorefrontCache(store.id, store.slug);
}

export async function createStorePage(formData: FormData) {
  const ctx = await context();
  if (!ctx) redirect("/dashboard/boutique/pages?erreur=non-autorise");
  const kind = kindSchema.safeParse(formData.get("kind"));
  if (!kind.success) redirect("/dashboard/boutique/pages");
  const meta = pageKinds[kind.data];
  await prisma.storePage.upsert({
    where: { storeId_kind: { storeId: ctx.store.id, kind: kind.data } },
    update: {},
    create: {
      storeId: ctx.store.id,
      kind: kind.data,
      title: meta.title,
      slug: meta.slug,
      blocks: starterBlocks(kind.data, ctx.store.name) as Prisma.InputJsonValue,
      position: await prisma.storePage.count({ where: { storeId: ctx.store.id } }),
    },
  });
  refresh(ctx.store);
  redirect(`/dashboard/boutique/pages?page=${kind.data}`);
}

export async function saveStorePage(_previous: PageSaveState, formData: FormData): Promise<PageSaveState> {
  const ctx = await context();
  if (!ctx) return { ok: false, message: "Vous n’avez pas l’autorisation de modifier la boutique." };
  const kind = kindSchema.safeParse(formData.get("kind"));
  const status = z.enum(["DRAFT", "PUBLISHED"]).safeParse(formData.get("status"));
  const title = z.string().trim().min(2, "Donnez un titre à la page.").max(80, "Le titre ne peut pas dépasser 80 caractères.").safeParse(formData.get("title"));
  if (!kind.success || !status.success) return { ok: false, message: "Page invalide. Rechargez la page." };
  if (!title.success) return { ok: false, message: title.error.issues[0]?.message ?? "Titre invalide." };

  let rawBlocks: unknown;
  try {
    rawBlocks = JSON.parse(String(formData.get("blocks") ?? "[]"));
  } catch {
    return { ok: false, message: "Les blocs envoyés sont illisibles. Rechargez la page." };
  }
  const parsed = blocksSchema.safeParse(rawBlocks);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const index = typeof issue?.path[0] === "number" ? issue.path[0] + 1 : null;
    return { ok: false, message: `${index ? `Bloc ${index} : ` : ""}${issue?.message ?? "Vérifiez les blocs."}` };
  }
  if (status.data === "PUBLISHED" && parsed.data.length === 0) return { ok: false, message: "Ajoutez au moins un bloc avant de publier la page." };

  const existing = await prisma.storePage.findUnique({ where: { storeId_kind: { storeId: ctx.store.id, kind: kind.data } } });
  if (!existing) return { ok: false, message: "Cette page n’existe plus. Rechargez la page." };

  // Les images envoyées sont rattachées à la boutique ; les anciennes images retirées sont supprimées.
  const blocks: PageBlock[] = [];
  try {
    // Toutes les nouvelles images sont rattachées en une fois, en parallèle (stockage distant : quelques secondes).
    const newKeys = parsed.data.flatMap((block) => (block.type === "image" && block.key ? [block.key] : []));
    const attached = new Map((await attachTemporaryPagePhotos(ctx.store.id, newKeys)).map((url, index) => [newKeys[index], url]));
    for (const block of parsed.data) {
      if (block.type === "image") {
        if (block.key) {
          blocks.push({ type: "image", url: attached.get(block.key)!, alt: block.alt });
        } else if (block.url && block.url.includes(`/stores/${ctx.store.id}/`)) {
          blocks.push({ type: "image", url: block.url, alt: block.alt });
        } else if (status.data === "PUBLISHED") {
          return { ok: false, message: "Un bloc image n’a pas de photo : ajoutez-en une ou retirez le bloc." };
        }
      } else {
        blocks.push(block);
      }
    }
  } catch (error) {
    if (error instanceof PhotoError) return { ok: false, message: error.message };
    throw error;
  }

  const previousUrls = blocksSchema.safeParse(existing.blocks).data?.flatMap((block) => (block.type === "image" && block.url ? [block.url] : [])) ?? [];
  const keptUrls = new Set(blocks.flatMap((block) => (block.type === "image" && block.url ? [block.url] : [])));
  await prisma.storePage.update({
    where: { id: existing.id },
    data: { title: title.data, status: status.data, blocks: blocks as Prisma.InputJsonValue },
  });
  await Promise.all(previousUrls.filter((url) => !keptUrls.has(url)).map((url) => deleteProductPhoto(url)));
  refresh(ctx.store);
  return { ok: true, status: status.data };
}

export async function deleteStorePage(formData: FormData) {
  const ctx = await context();
  if (!ctx) redirect("/dashboard/boutique/pages?erreur=non-autorise");
  const kind = kindSchema.safeParse(formData.get("kind"));
  if (!kind.success) redirect("/dashboard/boutique/pages");
  const page = await prisma.storePage.findUnique({ where: { storeId_kind: { storeId: ctx.store.id, kind: kind.data } } });
  if (page) {
    await prisma.storePage.delete({ where: { id: page.id } });
    const urls = blocksSchema.safeParse(page.blocks).data?.flatMap((block) => (block.type === "image" && block.url ? [block.url] : [])) ?? [];
    await Promise.all(urls.map((url) => deleteProductPhoto(url)));
  }
  refresh(ctx.store);
  redirect("/dashboard/boutique/pages?succes=supprimee");
}


/** Rend une page visible dans le menu de la boutique (publiée) ou la masque (brouillon). */
export async function setStorePageVisibility(formData: FormData) {
  const ctx = await context();
  if (!ctx) redirect("/dashboard/boutique/pages?erreur=non-autorise");
  const kind = kindSchema.safeParse(formData.get("kind"));
  const visible = formData.get("visible") === "1";
  if (!kind.success) redirect("/dashboard/boutique/pages");
  await prisma.storePage.updateMany({ where: { storeId: ctx.store.id, kind: kind.data }, data: { status: visible ? "PUBLISHED" : "DRAFT" } });
  refresh(ctx.store);
  redirect(`/dashboard/boutique/pages?page=${kind.data}&succes=${visible ? "affichee" : "masquee"}`);
}

/** Monte ou descend une page dans le menu de la boutique (« Boutique » reste toujours en premier). */
export async function moveStorePage(formData: FormData) {
  const ctx = await context();
  if (!ctx) redirect("/dashboard/boutique/pages?erreur=non-autorise");
  const kind = kindSchema.safeParse(formData.get("kind"));
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!kind.success) redirect("/dashboard/boutique/pages");
  const pages = await prisma.storePage.findMany({ where: { storeId: ctx.store.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, kind: true } });
  const from = pages.findIndex((page) => page.kind === kind.data);
  const to = from + direction;
  if (from >= 0 && to >= 0 && to < pages.length) {
    const [moved] = pages.splice(from, 1);
    pages.splice(to, 0, moved);
    await prisma.$transaction(pages.map((page, position) => prisma.storePage.update({ where: { id: page.id }, data: { position } })));
    refresh(ctx.store);
  }
  redirect(`/dashboard/boutique/pages?page=${kind.data}`);
}
