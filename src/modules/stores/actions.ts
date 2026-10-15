"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/modules/auth/server";

export async function selectStore(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");

  const storeId = formData.get("storeId");
  if (typeof storeId !== "string" || storeId.length === 0) redirect("/dashboard");

  const membership = await prisma.storeMembership.findUnique({
    where: { storeId_userId: { storeId, userId: session.user.id } },
    select: { storeId: true },
  });
  if (!membership) throw new Error("Cette boutique ne fait pas partie de ton espace.");

  (await cookies()).set("prestafrik-store", membership.storeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/dashboard");
}
