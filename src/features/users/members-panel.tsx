import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/layout/state-views";
import { ROLE_LABELS } from "@/domain/roles";
import { useAuth } from "@/features/auth/auth-provider";
import { CreateUserDialog } from "./create-user-dialog";
import { EditRolesDialog } from "./edit-roles-dialog";
import { useCompanyMembers, useSetMemberActive } from "./use-users";
import type { CompanyMember } from "./users-service";

interface MembersPanelProps {
  readonly companyId: string;
  readonly canManage: boolean;
}

export function MembersPanel({ companyId, canManage }: MembersPanelProps) {
  const members = useCompanyMembers(companyId);

  return (
    <section className="grid gap-4" aria-labelledby="members-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="members-title" className="font-display text-lg font-semibold">Usuários e perfis</h2>
          <p className="text-sm text-muted-foreground">
            {canManage ? "Crie usuários, atribua perfis e controle o acesso." : "Somente administradores podem alterar usuários."}
          </p>
        </div>
        {canManage && <CreateUserDialog companyId={companyId} />}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        {members.isPending ? (
          <LoadingState />
        ) : members.isError ? (
          <ErrorState message={members.error.message} onRetry={() => void members.refetch()} />
        ) : members.data.length === 0 ? (
          <EmptyState title="Nenhum usuário visível" description="Seu perfil não permite listar os demais usuários." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfis</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.data.map((m) => (
                <MemberRow key={m.userId} member={m} companyId={companyId} canManage={canManage} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

function MemberRow({ member, companyId, canManage }: { readonly member: CompanyMember } & MembersPanelProps) {
  const { user } = useAuth();
  const setActive = useSetMemberActive(companyId);
  const isSelf = user?.id === member.userId;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{member.fullName ?? "—"}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}</div>
        <div className="text-xs text-muted-foreground">{member.email}</div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {member.roles.map((r) => <Badge key={r} variant="muted">{ROLE_LABELS[r]}</Badge>)}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={member.active ? "success" : "danger"}>{member.active ? "Ativo" : "Inativo"}</Badge>
      </TableCell>
      {canManage && (
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <EditRolesDialog companyId={companyId} member={member} />
            {!isSelf && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant={member.active ? "destructive" : "outline"} size="sm" disabled={setActive.isPending}>
                    {member.active ? "Desativar" : "Reativar"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{member.active ? "Desativar usuário?" : "Reativar usuário?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {member.active
                        ? `${member.email} perderá o acesso imediatamente. A ação fica registrada na auditoria.`
                        : `${member.email} voltará a acessar com os perfis atuais.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setActive.mutate({ userId: member.userId, active: !member.active })}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
