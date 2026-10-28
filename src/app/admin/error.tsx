"use client";

import { RecoverableError } from "@/components/ui/recoverable-error";

/** Erreur imprévue ou coupure réseau dans cette section : message clair et bouton « Réessayer ». */
export default function SectionError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RecoverableError error={error} homeHref="/admin" retry={retry} />;
}
