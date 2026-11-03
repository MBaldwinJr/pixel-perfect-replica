import { Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import type { Company } from "@/features/company/company-service";

export function AlertsPanel({ company }: { readonly company: Company }) {
  if (company.data_confirmed_at) {
    return (
      <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
        <CheckCircle2 className="size-5 text-success" aria-hidden /> Nenhum alerta ativo.
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <div className="text-sm">
        <p className="font-medium">Cadastro da empresa pendente de confirmação</p>
        <p className="mt-1 text-muted-foreground">
          Os dados iniciais precisam ser revisados por um administrador antes de qualquer uso fiscal oficial.{" "}
          <Link to="/configuracoes" className="text-primary underline-offset-4 hover:underline">Revisar cadastro</Link>
        </p>
      </div>
    </div>
  );
}
