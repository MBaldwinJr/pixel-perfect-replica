import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppRole } from "@/domain/roles";
import { RolePicker } from "./role-picker";
import { useCreateMember } from "./use-users";

const schema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome").max(150),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
});
type FormValues = z.infer<typeof schema>;

export function CreateUserDialog({ companyId }: { readonly companyId: string }) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const create = useCreateMember(companyId);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { fullName: "", email: "", password: "" } });

  const submit = form.handleSubmit(async (values) => {
    if (roles.length === 0) return;
    await create.mutateAsync({ ...values, roles });
    form.reset();
    setRoles([]);
    setOpen(false);
  });

  const err = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><UserPlus className="size-4" /> Novo usuário</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>Defina uma senha provisória e compartilhe-a com o usuário por um canal seguro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nu-name">Nome completo</Label>
              <Input id="nu-name" {...form.register("fullName")} aria-invalid={Boolean(err.fullName)} />
              {err.fullName && <p className="text-xs text-destructive">{err.fullName.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nu-email">E-mail</Label>
              <Input id="nu-email" type="email" {...form.register("email")} aria-invalid={Boolean(err.email)} />
              {err.email && <p className="text-xs text-destructive">{err.email.message}</p>}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nu-pass">Senha provisória</Label>
            <Input id="nu-pass" type="password" autoComplete="new-password" {...form.register("password")} aria-invalid={Boolean(err.password)} />
            {err.password && <p className="text-xs text-destructive">{err.password.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Perfis</Label>
            <RolePicker value={roles} onChange={setRoles} idPrefix="nu" />
            {form.formState.isSubmitted && roles.length === 0 && (
              <p className="text-xs text-destructive">Selecione ao menos um perfil.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Criando…" : "Criar usuário"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
