// Tourne les démos « boutique publique » et « marketplace » sur les sites en ligne.
//
//   node scripts/demo-sites/run.mjs [pc|telephone] [nom-du-film …]
//
// Sortie : « extrait demo/boutique publique et marketplace/{pc,telephone}/*.gif » (+ .webp).
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { clips } from "./clips.mjs";
import { Clip, DEVICES, launch } from "./recorder.mjs";

const args = process.argv.slice(2);
const devices = args.filter((arg) => arg in DEVICES);
const names = args.filter((arg) => !(arg in DEVICES));
const output = resolve("extrait demo", "boutique publique et marketplace");
let failed = 0;
await mkdir(output, { recursive: true });

for (const deviceName of devices.length ? devices : Object.keys(DEVICES)) {
  for (const [name, { options, run }] of Object.entries(clips)) {
    if (names.length && !names.includes(name)) continue;
    const { browser, page, device } = await launch(deviceName, options);
    try {
      const clip = new Clip(page, device, name);
      await run(clip, page);
      await clip.save(resolve(output, deviceName));
    } catch (error) {
      failed++;
      console.error(`✗ ${deviceName}/${name} : ${error.message.split("\n").slice(0, 3).join(" / ")}`);
      await page.screenshot({ path: resolve(output, `echec-${deviceName}-${name}.png`) }).catch(() => {});
    } finally {
      await browser.close();
    }
  }
}
process.exit(failed ? 1 : 0);
