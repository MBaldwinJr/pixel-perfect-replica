import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/domain/roles";

export interface CompanyMember {
  readonly userId: string;
  readonly fullName: string | null;
  readonly email: string;
  readonly active: boolean;
  readonly roles: readonly AppRole[];
}

export async function fetchCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("company_id", companyId);
  if (error) throw new Error(error.message);

  const ids = [...new Set(roles.map((r) => r.user_id))];
  if (ids.length === 0) return [];
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, email, active")
    .in("id", ids);
  if (pErr) throw new Error(pErr.message);

  return profiles
    .map((p) => ({
      userId: p.id,
      fullName: p.full_name,
      email: p.email,
      active: p.active,
      roles: roles.filter((r) => r.user_id === p.id).map((r) => r.role),
    }))
    .sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email));
}

export async function replaceMemberRoles(
  companyId: string,
  userId: string,
  current: readonly AppRole[],
  next: readonly AppRole[],
): Promise<void> {
  const toAdd = next.filter((r) => !current.includes(r));
  const toRemove = current.filter((r) => !next.includes(r));
  if (toAdd.length) {
    const { error } = await supabase
      .from("user_roles")
      .insert(toAdd.map((role) => ({ company_id: companyId, user_id: userId, role })));
    if (error) throw new Error(error.message);
  }
  if (toRemove.length) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .in("role", toRemove);
    if (error) throw new Error(error.message);
  }
}
