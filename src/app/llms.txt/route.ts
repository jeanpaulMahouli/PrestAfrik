import { markdownResponse, siteMarkdown } from "@/modules/agents/site-markdown";

// /llms.txt : résumé de PrestAfrik pour les assistants IA (format llmstxt.org), relu toutes les 10 minutes.
export const revalidate = 600;

export async function GET() {
  return markdownResponse(await siteMarkdown(), "text/plain; charset=utf-8");
}
