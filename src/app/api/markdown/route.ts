import { markdownResponse, siteMarkdown } from "@/modules/agents/site-markdown";

// Version Markdown de l'accueil, servie par le proxy quand un agent envoie « Accept: text/markdown ».
export const revalidate = 600;

export async function GET() {
  return markdownResponse(await siteMarkdown());
}
