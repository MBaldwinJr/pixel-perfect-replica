import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCnpj } from "@/domain/cnpj";
import {
  BR_STATES,
  TAX_REGIMES,
  TAX_REGIME_LABELS,
  companyFormSchema,
  type CompanyFormInput,
  type CompanyFormOutput,
} from "@/domain/company-schema";
import type { Company } from "./company-service";
import { useConfirmCompany, useUpdateCompany } from "./use-company";

function toForm(c: Company): CompanyFormInput {
  return {
    legal_name: c.legal_name,
    trade_name: c.trade_name ?? "",
    cnpj: formatCnpj(c.cnpj),
    tax_regime: c.tax_regime,
    state_registration: c.state_registration ?? "",
    municipal_registration: c.municipal_registration ?? "",
    state: c.state as CompanyFormInput["state"],
    city: c.city ?? "",
  };
}

export function CompanyForm({ company, canEdit }: { readonly company: Company; readonly canEdit: boolean }) {
  const update = useUpdateCompany(company.id);
  const confirm = useConfirmCompany(company.id);
  const form = useForm<CompanyFormInput, unknown, CompanyFormOutput>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toForm(company),
  });

  useEffect(() => form.reset(toForm(company)), [company, form]);

  const err = form.formState.errors;
  const field = (name: keyof CompanyFormInput, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`co-${name}`}>{label}</Label>
      <Input id={`co-${name}`} disabled={!canEdit} aria-invalid={Boolean(err[name])} {...form.register(name)} {...props} />
      {err[name] && <p className="text-xs text-destructive">{err[name]?.message}</p>}
    </div>
  );

  return (
    <section className="grid gap-4" aria-labelledby="company-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="company-title" className="font-display text-lg font-semibold">Cadastro da empresa</h2>
          <p className="text-sm text-muted-foreground">Dados sujeitos à confirmação administrativa antes de uso fiscal oficial.</p>
        </div>
        {company.data_confirmed_at ? (
          <Badge variant="success"><BadgeCheck className="mr-1 size-3.5" />Confirmado em {new Date(company.data_confirmed_at).toLocaleDateString("pt-BR")}</Badge>
        ) : (
          <Badge variant="warning"><ShieldAlert className="mr-1 size-3.5" />Pendente de confirmação</Badge>
        )}
      </div>

      <form
        onSubmit={form.handleSubmit((v) => update.mutate(v))}
        className="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        noValidate
      >
        <div className="grid gap-4 md:grid-cols-2">
          {field("legal_name", "Razão social")}
          {field("trade_name", "Nome fantasia")}
          {field("cnpj", "CNPJ", { inputMode: "numeric", onChange: (e) => form.setValue("cnpj", formatCnpj(e.target.value), { shouldValidate: form.formState.isSubmitted }) })}
          <div className="grid gap-1.5">
            <Label htmlFor="co-tax_regime">Regime tributário</Label>
            <Controller
              control={form.control}
              name="tax_regime"
              render={({ field: f }) => (
                <Select value={f.value} onValueChange={f.onChange} disabled={!canEdit}>
                  <SelectTrigger id="co-tax_regime"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TAX_REGIMES.map((r) => <SelectItem key={r} value={r}>{TAX_REGIME_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {field("state_registration", "Inscrição estadual")}
          {field("municipal_registration", "Inscrição municipal")}
          <div className="grid gap-1.5">
            <Label htmlFor="co-state">UF</Label>
            <Controller
              control={form.control}
              name="state"
              render={({ field: f }) => (
                <Select value={f.value} onValueChange={f.onChange} disabled={!canEdit}>
                  <SelectTrigger id="co-state"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {field("city", "Cidade")}
        </div>

        {canEdit && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            {!company.data_confirmed_at && (
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isDirty || confirm.isPending}
                title={form.formState.isDirty ? "Salve as alterações antes de confirmar" : undefined}
                onClick={() => confirm.mutate()}
              >
                Confirmar dados
              </Button>
            )}
            <Button type="submit" disabled={!form.formState.isDirty || update.isPending}>
              {update.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}
