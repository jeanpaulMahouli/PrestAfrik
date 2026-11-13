import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// Client Claude partagé (modération des images, assistant produit). Clé lue dans ANTHROPIC_API_KEY.

let client: Anthropic | null = null;

export function anthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropic() {
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 2 });
  return client;
}

export { Anthropic };
