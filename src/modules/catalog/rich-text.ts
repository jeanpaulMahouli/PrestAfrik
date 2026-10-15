// Mise en forme des descriptions produit sans HTML (brief §6.4) : un sous-ensemble de Markdown
// est stocké en texte simple, puis analysé ici en blocs que React affiche (aucun innerHTML).
//
//   **gras**   *italique*   ## Sous-titre   - liste à puces   1. liste numérotée

export type InlineSegment = { text: string; bold?: boolean; italic?: boolean };
export type RichBlock =
  | { type: "paragraph"; lines: InlineSegment[][] }
  | { type: "heading"; segments: InlineSegment[] }
  | { type: "bullets"; items: InlineSegment[][] }
  | { type: "numbers"; items: InlineSegment[][] };

/** Découpe une ligne en segments gras / italique. Les marqueurs non fermés restent du texte. */
export function parseInline(line: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: line.slice(last, index) });
    if (match[2] !== undefined) segments.push({ text: match[2], bold: true });
    else if (match[3] !== undefined) segments.push({ text: match[3], italic: true });
    last = index + match[0].length;
  }
  if (last < line.length) segments.push({ text: line.slice(last) });
  return segments.filter((segment) => segment.text.length > 0);
}

export function parseRichText(source: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: InlineSegment[][] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", lines: paragraph });
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
    const number = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^##\s+(.*)$/.exec(line);
    const previous = blocks.at(-1);
    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ type: "heading", segments: parseInline(heading[1]) });
    } else if (bullet) {
      flush();
      if (previous?.type === "bullets" && paragraph.length === 0) previous.items.push(parseInline(bullet[1]));
      else blocks.push({ type: "bullets", items: [parseInline(bullet[1])] });
    } else if (number) {
      flush();
      if (previous?.type === "numbers" && paragraph.length === 0) previous.items.push(parseInline(number[1]));
      else blocks.push({ type: "numbers", items: [parseInline(number[1])] });
    } else {
      paragraph.push(parseInline(line));
    }
  }
  flush();
  return blocks;
}

/** Texte sans marqueurs (aperçus, balises meta, messages WhatsApp). */
export function richTextToPlain(source: string) {
  return source
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^##\s+/gm, "")
    .replace(/^\s*[-•]\s+/gm, "• ")
    .replace(/\s+/g, " ")
    .trim();
}
