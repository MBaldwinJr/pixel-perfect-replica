import { useEffect } from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { ErrorState, LoadingState } from "@/components/layout/state-views";
import { useAuth } from "@/features/auth/auth-provider";
import { useMembership } from "@/features/company/use-company";
import { MembershipProvider } from "@/features/company/membership-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const membership = useMembership();

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session || !user) return <LoadingState label="Verificando sessão…" />;
  if (membership.isPending) return <LoadingState label="Carregando permissões…" />;
  if (membership.isError)
    return (
      <ErrorState message={membership.error.message} onRetry={() => void membership.refetch()} />
    );

  if (!membership.data) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md text-center">
          <ShieldOff className="mx-auto size-8 text-warning" aria-hidden />
          <h1 className="mt-4 font-display text-xl font-semibold">Acesso aguardando liberação</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta ({user.email}) ainda não possui perfil em nenhuma empresa, ou foi desativada.
            Solicite a liberação a um administrador.
          </p>
          <div className="mt-6 flex justify-center">
            <UserMenu email={user.email ?? ""} roles={[]} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <MembershipProvider value={membership.data}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar roles={membership.data.roles} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger aria-label="Alternar menu" />
                <span className="hidden text-sm text-muted-foreground md:inline">
                  {membership.data.company.legal_name}
                </span>
              </div>
              <UserMenu email={user.email ?? ""} roles={membership.data.roles} />
            </header>
            <main className="flex-1 p-4 md:p-8">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </MembershipProvider>
  );
}
