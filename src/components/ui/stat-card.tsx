export function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" }) {
  return (
    <article className={`stat-card ${tone ? `stat-card-${tone}` : ""}`}>
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
      {hint && <p className="stat-card-hint">{hint}</p>}
    </article>
  );
}
