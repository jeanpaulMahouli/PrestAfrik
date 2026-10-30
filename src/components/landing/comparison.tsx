import { Compare, SectionHead } from "./blocks";
import { comparison } from "./content";

/** Comparatif « seulement WhatsApp / Facebook » ou « avec PrestAfrik », lisible sur téléphone. */
export function Comparison() {
  return (
    <section aria-labelledby="comparatif-title" className="lp-section lp-comparison">
      <SectionHead id="comparatif-title" lead={comparison.lead} title={comparison.title} />
      <Compare afterTitle={comparison.afterTitle} beforeTitle={comparison.beforeTitle} rows={comparison.rows} />
    </section>
  );
}
