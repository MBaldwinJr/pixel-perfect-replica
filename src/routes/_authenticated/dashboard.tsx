import { createFileRoute } from "@tanstack/react-router";
import {
  AlertOctagon,
  BadgeDollarSign,
  Boxes,
  ClipboardCheck,
  FileText,
  Landmark,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import { KpiCard } from "@/features/dashboard/kpi-card";
import { AlertsPanel } from "@/features/dashboard/alerts-panel";
import { ActivityFeed } from "@/features/dashboard/activity-feed";
import { useCurrentMembership } from "@/features/company/membership-context";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Executivo — Peixoto Tax Intelligence" },
      { name: "description", content: "Indicadores estruturais tributários e financeiros." },
      { property: "og:title", content: "Dashboard Executivo — Peixoto Tax Intelligence" },
      { property: "og:description", content: "Indicadores estruturais tributários e financeiros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const NO_DATA = "Sem dados importados";

// Values stay null until the source modules exist; no fictitious numbers are shown.
const KPIS = [
  { label: "Compras analisadas", icon: ShoppingCart },
  { label: "Fornecedores cadastrados", icon: Truck },
  { label: "Produtos cadastrados", icon: Boxes },
  { label: "Documentos fiscais importados", icon: FileText },
  { label: "Créditos tributários identificados", icon: BadgeDollarSign },
  { label: "IBS/CBS projetados", icon: Landmark },
  { label: "Recebimentos conciliados", icon: Wallet },
  { label: "Divergências identificadas", icon: AlertOctagon },
  { label: "Recomendações pendentes", icon: ClipboardCheck },
] as const;

function DashboardPage() {
  const { company, roles } = useCurrentMembership();
  const canAudit = roles.some((r) => r === "admin" || r === "diretoria" || r === "auditor");

  return (
    <div className="mx-auto grid max-w-7xl gap-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Dashboard Executivo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nenhum dado foi importado ainda. Os indicadores serão preenchidos à medida que os módulos
          forem ativados.
        </p>
      </header>

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} icon={k.icon} value={null} hint={NO_DATA} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="alerts-title"
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <h2 id="alerts-title" className="mb-3 font-display text-base font-semibold">
            Central de Alertas
          </h2>
          <AlertsPanel company={company} />
        </section>
        <section
          aria-labelledby="activity-title"
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <h2 id="activity-title" className="mb-3 font-display text-base font-semibold">
            Últimas Atividades
          </h2>
          <ActivityFeed companyId={company.id} canView={canAudit} />
        </section>
      </div>
    </div>
  );
}
