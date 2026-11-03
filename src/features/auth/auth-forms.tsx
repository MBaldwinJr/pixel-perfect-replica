import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, signIn, signUp } from "./auth-service";

const emailField = z.string().trim().email("E-mail inválido").max(255);
const passwordField = z.string().min(8, "Mínimo de 8 caracteres").max(72);

const signInSchema = z.object({ email: emailField, password: z.string().min(1, "Informe a senha") });
const signUpSchema = z.object({ fullName: z.string().trim().min(2, "Informe o nome").max(150), email: emailField, password: passwordField });

function FieldError({ message }: { readonly message?: string | undefined }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function SignInForm({ onSuccess }: { readonly onSuccess: () => void }) {
  const form = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const [resetting, setResetting] = useState(false);
  const submit = form.handleSubmit(async (v) => {
    try {
      await signIn(v.email, v.password);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao entrar.");
    }
  });
  const forgot = async () => {
    const email = form.getValues("email");
    if (!emailField.safeParse(email).success) {
      form.setError("email", { message: "Informe o e-mail para redefinir a senha" });
      return;
    }
    setResetting(true);
    try {
      await requestPasswordReset(email);
      toast.success("Se o e-mail existir, você receberá um link de redefinição.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setResetting(false);
    }
  };
  const err = form.formState.errors;
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="si-email">E-mail</Label>
        <Input id="si-email" type="email" autoComplete="email" {...form.register("email")} />
        <FieldError message={err.email?.message} />
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="si-pass">Senha</Label>
          <button type="button" onClick={forgot} disabled={resetting} className="text-xs text-primary hover:underline">
            Esqueci a senha
          </button>
        </div>
        <Input id="si-pass" type="password" autoComplete="current-password" {...form.register("password")} />
        <FieldError message={err.password?.message} />
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Entrando…" : "Entrar"}</Button>
    </form>
  );
}

export function SignUpForm() {
  const form = useForm<z.infer<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema), defaultValues: { fullName: "", email: "", password: "" } });
  const [sent, setSent] = useState(false);
  const submit = form.handleSubmit(async (v) => {
    try {
      await signUp(v.email, v.password, v.fullName);
      setSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no cadastro.");
    }
  });
  if (sent) {
    return <p role="status" className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm">Verifique seu e-mail para confirmar o cadastro. O acesso aos módulos depende da liberação de um administrador.</p>;
  }
  const err = form.formState.errors;
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="su-name">Nome completo</Label>
        <Input id="su-name" autoComplete="name" {...form.register("fullName")} />
        <FieldError message={err.fullName?.message} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="su-email">E-mail</Label>
        <Input id="su-email" type="email" autoComplete="email" {...form.register("email")} />
        <FieldError message={err.email?.message} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="su-pass">Senha</Label>
        <Input id="su-pass" type="password" autoComplete="new-password" {...form.register("password")} />
        <FieldError message={err.password?.message} />
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Enviando…" : "Criar conta"}</Button>
    </form>
  );
}
