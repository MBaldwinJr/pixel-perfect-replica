import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/state-views";
import type { Database } from "@/integrations/supabase/types";
import { useIntegrations } from "./use-company";

type IntegrationType = Database["public"]["Enums"]["integration_type"];
type IntegrationStatus = Database["public"]["Enums"]["integration_status"];

const TYPE_LABELS: Readonly<Record<IntegrationType, string>> = {
  erp: "ERP",
  adquirente: "Adquirente",
  documento_fiscal: "Documento fiscal",
  conciliacao: "Conciliação",
};

const STATUS_LABELS: Readonly<Record<IntegrationStatus, string>> = {
  nao_configurada: "Não configurada",
  em_configuracao: "Em configuração",
  ativa: "Ativa",
  inativa: "Inativa",
  erro: "Erro",
};

const STATUS_VARIANT: Readonly<Record<IntegrationStatus, "muted" | "warning" | "success" | "danger">> = {
  nao_configurada: "muted",
  em_configuracao: "warning",
  ativa: "success",
  inativa: "muted",
  erro: "danger",
};

export function IntegrationsPanel({ companyId, canView }: { readonly companyId: string; readonly canView: boolean }) {
  const q = useIntegrations(companyId, canView);

  return (
    <section className="grid gap-4" aria-labelledby="integrations-title">
      <div>
        <h2 id="integrations-title" className="font-display text-lg font-semibold">Integrações planejadas</h2>
        <p className="text-sm text-muted-foreground">
          Estrutura preparada para conexões futuras. Nenhuma integração está ativa e nenhuma credencial é armazenada aqui.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {!canView ? (
          <EmptyState title="Sem permissão" description="Seu perfil não acessa as configurações de integração." />
        ) : q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />
        ) : (
          <ul className="divide-y divide-border">
            {q.data.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{i.provider}</p>
                  <p className="text-xs text-muted-foreground">{TYPE_LABELS[i.integration_type]}</p>
                </div>
                <Badge variant={STATUS_VARIANT[i.status]}>{STATUS_LABELS[i.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
