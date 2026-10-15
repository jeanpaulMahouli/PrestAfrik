import type { StatusDisplay, Tone } from "@/config/statuses";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: StatusDisplay }) {
  return <Badge tone={status.tone}>{status.label}</Badge>;
}
