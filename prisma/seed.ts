import { PrismaClient, StoreRole, StoreTheme } from "@prisma/client";

const prisma = new PrismaClient();

const demoStores = [
  { slug: "mboa-style", name: "Mboa Style", city: "Douala", category: "Vêtements" },
  { slug: "douala-maison", name: "Douala Maison", city: "Douala", category: "Maison" },
  { slug: "yaounde-beaute", name: "Yaoundé Beauté", city: "Yaoundé", category: "Beauté" },
  { slug: "bafoussam-creations", name: "Bafoussam Créations", city: "Bafoussam", category: "Artisanat" },
  { slug: "kribi-accessoires", name: "Kribi Accessoires", city: "Kribi", category: "Accessoires" },
] as const;

const people = [
  ["Awa Ngono", "Samuel Nkoulo"],
  ["Brice Tamo", "Nadine Essomba"],
  ["Sandra Mvondo", "Junior Kamga"],
  ["Flore Ngassa", "Idriss Abega"],
  ["Mireille Foko", "Kevin Muna"],
] as const;

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error(
      "Le seed contient uniquement des données fictives. Définis ALLOW_DEMO_SEED=true hors production pour le lancer.",
    );
  }

  for (const [index, demo] of demoStores.entries()) {
    const store = await prisma.store.upsert({
      where: { slug: demo.slug },
      update: {
        name: demo.name,
        city: demo.city,
        businessCategory: demo.category,
      },
      create: {
        slug: demo.slug,
        name: demo.name,
        city: demo.city,
        businessCategory: demo.category,
        theme: index === 1 ? StoreTheme.BOUTIQUE_MARQUE : StoreTheme.CATALOGUE_EXPRESS,
        isPublished: false,
      },
    });

    const ownerEmail = `vendeur${index + 1}@example.com`;
    const managerEmail = `equipe${index + 1}@example.com`;
    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: { name: people[index][0] },
      create: { email: ownerEmail, name: people[index][0] },
    });
    const manager = await prisma.user.upsert({
      where: { email: managerEmail },
      update: { name: people[index][1] },
      create: { email: managerEmail, name: people[index][1] },
    });

    await prisma.storeMembership.upsert({
      where: { storeId_userId: { storeId: store.id, userId: owner.id } },
      update: { role: StoreRole.OWNER },
      create: { storeId: store.id, userId: owner.id, role: StoreRole.OWNER },
    });
    await prisma.storeMembership.upsert({
      where: { storeId_userId: { storeId: store.id, userId: manager.id } },
      update: { role: StoreRole.MANAGER },
      create: { storeId: store.id, userId: manager.id, role: StoreRole.MANAGER },
    });
  }

  console.info("Données fictives prêtes : 5 boutiques et 10 membres.");
}

main()
  .catch((error: unknown) => {
    console.error("Le seed des boutiques de démonstration a échoué.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
