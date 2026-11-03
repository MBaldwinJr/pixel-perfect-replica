import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole } from "@/domain/roles";
import type { CompanyFormOutput } from "@/domain/company-schema";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type IntegrationConfig = Database["public"]["Tables"]["integration_configs"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export interface Membership {
  readonly company: Company;
  readonly roles: readonly AppRole[];
}

export async function fetchMyMembership(userId: string): Promise<Membership | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, company_id, companies(*)")
    .eq("user_id", userId)
    .eq("active", true);
  if (error) throw new Error(error.message);
  const first = data?.find((r) => r.companies);
  if (!first?.companies) return null;
  const roles = data.filter((r) => r.company_id === first.company_id).map((r) => r.role);
  return { company: first.companies, roles };
}

export async function updateCompany(id: string, input: CompanyFormOutput): Promise<void> {
  const { error } = await supabase.from("companies").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function confirmCompanyData(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("companies")
    .update({ data_confirmed_at: new Date().toISOString(), data_confirmed_by: userId })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchIntegrations(companyId: string): Promise<IntegrationConfig[]> {
  const { data, error } = await supabase
    .from("integration_configs")
    .select("*")
    .eq("company_id", companyId)
    .order("integration_type")
    .order("provider");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchRecentAudit(companyId: string, limit = 8): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}
