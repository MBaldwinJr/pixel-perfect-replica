import { History } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/state-views";
import { useRecentAudit } from "@/features/company/use-company";
import type { AuditLog } from "@/features/company/company-service";

const ENTITY_LABELS: Readonly<Record<string, string>> = {
  companies: "Empresa",
  branches: "Filial",
  user_roles: "Perfil de usuário",
  integration_configs: "Integração",
  profiles: "Usuário",
};

const ACTION_LABELS: Readonly<Record<string, string>> = {
  insert: "Criação",
  update: "Alteração",
  delete: "Remoção",
  activate_user: "Reativação",
  deactivate_user: "Desativação",
};

function describe(log: AuditLog): string {
  return `${ACTION_LABELS[log.action] ?? log.action} · ${ENTITY_LABELS[log.entity] ?? log.entity}`;
}

export function ActivityFeed({ companyId, canView }: { readonly companyId: string; readonly canView: boolean }) {
  const q = useRecentAudit(companyId, canView);
  if (!canView) return <EmptyState title="Sem permissão" description="A auditoria é visível para Administrador, Diretoria e Auditor." />;
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  if (q.data.length === 0) return <EmptyState icon={<History className="size-6" />} title="Nenhuma atividade registrada" />;
  return (
    <ul className="divide-y divide-border">
      {q.data.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span>{describe(l)}</span>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={l.created_at}>
            {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </time>
        </li>
      ))}
    </ul>
  );
}
