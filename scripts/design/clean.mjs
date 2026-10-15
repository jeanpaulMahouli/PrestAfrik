// Produit structure.html : le corps de chaque écran sans scripts, en-tête ni images base64.
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
const root = "docs/design/reference";
for (const page of await readdir(root)) {
  if (!(await stat(join(root, page))).isDirectory()) continue;
  for (const screen of await readdir(join(root, page))) {
    const file = join(root, page, screen, "ecran.html");
    let html = await readFile(file, "utf8").catch(() => null);
    if (!html) continue;
    const body = (html.match(/<body[\s\S]*<\/body>/) ?? [html])[0]
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/g, "data:…")
      .replace(/<svg[\s\S]*?<\/svg>/g, "<svg…/>")
      .replace(/\s(class|data-[a-z-]+)="[^"]*"/g, "")
      .replace(/></g, ">\n<");
    await writeFile(join(root, page, screen, "structure.html"), body);
  }
}
