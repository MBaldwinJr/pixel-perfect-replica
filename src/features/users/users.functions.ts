import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { APP_ROLES } from "@/domain/roles";

const companyIdSchema = z.string().uuid();

async function assertCompanyAdmin(supabase: SupabaseClient<Database>, companyId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_company_role", { _company_id: companyId, _roles: ["admin"] });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado: somente administradores podem gerenciar usuários.");
}

const createUserSchema = z.object({
  companyId: companyIdSchema,
  email: z.string().trim().toLowerCase().email().max(255),
  fullName: z.string().trim().min(2).max(150),
  password: z.string().min(8).max(72),
  roles: z.array(z.enum(APP_ROLES)).min(1).max(APP_ROLES.length),
});

export const createCompanyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertCompanyAdmin(context.supabase, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) {
      throw new Error(error?.message.includes("already") ? "Este e-mail já possui conta." : error?.message ?? "Falha ao criar usuário.");
    }

    const { error: roleError } = await context.supabase
      .from("user_roles")
      .insert(data.roles.map((role) => ({ company_id: data.companyId, user_id: created.user.id, role })));
    if (roleError) {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      if (cleanupError) {
        throw new Error(`Usuário criado, mas a atribuição de perfil falhou e a conta não pôde ser removida: ${roleError.message}. Limpeza: ${cleanupError.message}`);
      }
      throw new Error(roleError.message);
    }
    return { userId: created.user.id };
  });

const setActiveSchema = z.object({
  companyId: companyIdSchema,
  userId: z.string().uuid(),
  active: z.boolean(),
});

export const setCompanyUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setActiveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertCompanyAdmin(context.supabase, data.companyId);
    if (data.userId === context.userId) throw new Error("Você não pode desativar a própria conta.");

    const { data: membership, error: membershipError } = await context.supabase
      .from("user_roles")
      .select("id, active")
      .eq("company_id", data.companyId)
      .eq("user_id", data.userId)
      .limit(1);
    if (membershipError) throw new Error(membershipError.message);
    if (!membership?.length) throw new Error("Usuário não pertence a esta empresa.");

    // The active flag is scoped to this company. Database trigger protects the last
    // active administrator and serializes concurrent attempts. Audit is trigger-based.
    const { data: updated, error: updateError } = await context.supabase
      .from("user_roles")
      .update({ active: data.active })
      .eq("company_id", data.companyId)
      .eq("user_id", data.userId)
      .select("id");
    if (updateError) throw new Error(updateError.message);
    if (!updated?.length) throw new Error("Nenhum vínculo foi atualizado. Verifique as permissões e tente novamente.");

    return { ok: true, updatedMemberships: updated.length };
  });
