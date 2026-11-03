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

    // Roles are inserted as the calling admin so RLS and audit triggers apply.
    const { error: roleError } = await context.supabase
      .from("user_roles")
      .insert(data.roles.map((role) => ({ company_id: data.companyId, user_id: created.user.id, role })));
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
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

    const { data: membership, error: mErr } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("user_id", data.userId)
      .limit(1);
    if (mErr) throw new Error(mErr.message);
    if (!membership?.length) throw new Error("Usuário não pertence a esta empresa.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ active: data.active }).eq("id", data.userId);
    if (error) throw new Error(error.message);

    // Revoke live sessions when deactivating.
    if (!data.active) {
      await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "876000h" });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
    }

    await supabaseAdmin.from("audit_logs").insert({
      company_id: data.companyId,
      user_id: context.userId,
      action: data.active ? "activate_user" : "deactivate_user",
      entity: "profiles",
      entity_id: data.userId,
      details: {},
    });
    return { ok: true };
  });
