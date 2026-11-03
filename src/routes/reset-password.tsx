import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/layout/brand-logo";
import { updatePassword } from "@/features/auth/auth-service";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Peixoto Tax Intelligence" },
      { name: "description", content: "Defina uma nova senha de acesso." },
      { property: "og:title", content: "Redefinir senha — Peixoto Tax Intelligence" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const invalid = password.length > 0 && password.length < 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return;
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success("Senha atualizada.");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link inválido ou expirado.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={submit} className="grid w-full max-w-md gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <BrandLogo />
        <h1 className="font-display text-xl font-semibold">Nova senha</h1>
        <div className="grid gap-1.5">
          <Label htmlFor="rp-pass">Senha</Label>
          <Input id="rp-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={invalid} />
          {invalid && <p className="text-xs text-destructive">Mínimo de 8 caracteres.</p>}
        </div>
        <Button type="submit" disabled={busy || password.length < 8}>{busy ? "Salvando…" : "Salvar senha"}</Button>
      </form>
    </main>
  );
}
