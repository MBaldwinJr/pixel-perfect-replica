import { memo } from "react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  readonly label: string;
  readonly value: number | null;
  readonly icon: LucideIcon;
  readonly hint: string;
}

/** value null = módulo de origem ainda não existe; nunca exibir número fictício. */
export const KpiCard = memo(function KpiCard({ label, value, icon: Icon, hint }: KpiCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{value ?? 0}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </article>
  );
});
