// PostgreSQL 16 local, sans Docker, pour les tests et la revue visuelle (brief §11.6).
// Les données vivent dans storage/postgres (ignoré par git). Ne touche jamais la base de .env.
//
//   node scripts/local-db.mjs        démarre la base (port 54329) et reste au premier plan
//   LOCAL_DB_RESET=1 node scripts/local-db.mjs   repart d'une base vide
//
// URL : postgresql://prestafrik:prestafrik@localhost:54329/prestafrik
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const databaseDir = resolve("storage/postgres");
const port = Number(process.env.LOCAL_DB_PORT ?? 54329);

if (process.env.LOCAL_DB_RESET === "1") await rm(databaseDir, { recursive: true, force: true });
const firstRun = !existsSync(databaseDir);

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "prestafrik",
  password: "prestafrik",
  port,
  persistent: true,
  onLog: () => {},
});

if (firstRun) await pg.initialise();
await pg.start();
if (firstRun) {
  await pg.createDatabase("prestafrik");
  await pg.createDatabase("prestafrik_test");
}
console.log(`PostgreSQL local prêt : postgresql://prestafrik:prestafrik@localhost:${port}/prestafrik`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
