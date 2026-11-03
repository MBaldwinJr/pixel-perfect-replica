import { useState } from "react";
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
import type { AppRole } from "@/domain/roles";
import { RolePicker } from "./role-picker";
import { useUpdateMemberRoles } from "./use-users";
import type { CompanyMember } from "./users-service";

export function EditRolesDialog({ companyId, member }: { readonly companyId: string; readonly member: CompanyMember }) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([...member.roles]);
  const update = useUpdateMemberRoles(companyId);

  const save = async () => {
    await update.mutateAsync({ userId: member.userId, current: member.roles, next: roles });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setRoles([...member.roles]); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Perfis</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Perfis de {member.fullName ?? member.email}</DialogTitle>
          <DialogDescription>As permissões são aplicadas no banco de dados, não apenas no menu.</DialogDescription>
        </DialogHeader>
        <RolePicker value={roles} onChange={setRoles} idPrefix={`er-${member.userId}`} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={roles.length === 0 || update.isPending}>
            {update.isPending ? "Salvando…" : "Salvar perfis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
