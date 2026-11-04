// Server-side authentication middleware. Generated Supabase clients are kept server-only.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const supabaseUrl = process.env["SUPABASE_URL"];
    const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!supabaseUrl || !publishableKey) {
      const missing = [
        ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
        ...(!publishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}.`);
    }

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Bearer token required.");
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token || token.split(".").length !== 3) {
      throw new Error("Unauthorized: Invalid token.");
    }

    const supabase = createClient<Database>(supabaseUrl, publishableKey, {
      global: {
        fetch: createSupabaseFetch(publishableKey),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (error || !data || typeof userId !== "string") {
      throw new Error("Unauthorized: Invalid token.");
    }

    // An account-level suspension is distinct from company-scoped membership.
    // RLS intentionally hides inactive profiles, so a missing row is denied too.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active")
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !profile?.active) {
      throw new Error("Unauthorized: Account is inactive or has no provisioned profile.");
    }

    return next({
      context: {
        supabase,
        userId,
        claims: data.claims,
      },
    });
  },
);
