// Donne le rôle de super administrateur PrestAfrik (accès à /admin et gestion des administrateurs)
// à un compte existant. Sert à créer le premier compte ; les suivants se gèrent dans /admin/administrateurs.
//
//   npm run admin:promote -- vous@exemple.com            promeut le compte (super administrateur)
//   npm run admin:promote -- vous@exemple.com --retirer  retire le rôle
//
// Utilise DATABASE_URL (fichier .env). Le compte doit déjà exister : inscrivez-vous d'abord sur /inscription.
import { PrismaClient } from "@prisma/client";

const [email, flag] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error("Indiquez l’adresse e-mail du compte : npm run admin:promote -- vous@exemple.com");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, name: true } });
  if (!user) {
    console.error(`Aucun compte avec l’adresse ${email}. Inscrivez-vous d’abord sur /inscription.`);
    process.exitCode = 1;
  } else {
    const platformRole = flag === "--retirer" ? "USER" : "SUPER_ADMIN";
    await prisma.user.update({ where: { id: user.id }, data: { platformRole } });
    await prisma.auditLog.create({ data: { actorId: null, action: platformRole === "USER" ? "user.demote-admin" : "user.promote-admin", targetType: "user", targetId: user.id, details: { via: "script", role: platformRole } } });
    console.log(platformRole === "USER" ? `${user.name} n’est plus administrateur.` : `${user.name} est maintenant super administrateur PrestAfrik : ouvrez /admin.`);
  }
} finally {
  await prisma.$disconnect();
}
