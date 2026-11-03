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
  const { data: memberships, error } = await supabase
    .from("user_roles")
    .select("user_id, role, active")
    .eq("company_id", companyId);
  if (error) throw new Error(error.message);

  const ids = [...new Set(memberships.map((membership) => membership.user_id))];
  if (ids.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, active")
    .in("id", ids);
  if (profileError) throw new Error(profileError.message);

  return profiles
    .map((profile) => {
      const memberRoles = memberships.filter((membership) => membership.user_id === profile.id);
      return {
        userId: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        active: profile.active && memberRoles.some((membership) => membership.active),
        roles: memberRoles.map((membership) => membership.role),
      };
    })
    .sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email));
}

export async function replaceMemberRoles(
  companyId: string,
  userId: string,
  current: readonly AppRole[],
  next: readonly AppRole[],
): Promise<void> {
  const toAdd = next.filter((role) => !current.includes(role));
  const toRemove = current.filter((role) => !next.includes(role));
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
