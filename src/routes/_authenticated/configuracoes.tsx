import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyForm } from "@/features/company/company-form";
import { IntegrationsPanel } from "@/features/company/integrations-panel";
import { useCurrentMembership } from "@/features/company/membership-context";
import { MembersPanel } from "@/features/users/members-panel";
import { canManageCompany } from "@/domain/modules";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Peixoto Tax Intelligence" },
      { name: "description", content: "Empresa, usuários, perfis e integrações." },
      { property: "og:title", content: "Configurações — Peixoto Tax Intelligence" },
      { property: "og:description", content: "Empresa, usuários, perfis e integrações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { company, roles } = useCurrentMembership();
  const isAdmin = canManageCompany(roles);
  const canViewIntegrations = roles.some((r) => ["admin", "diretoria", "fiscal", "financeiro", "auditor"].includes(r));

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Toda alteração é registrada na auditoria.</p>
      </header>
      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários e perfis</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>
        <TabsContent value="empresa" className="mt-6"><CompanyForm company={company} canEdit={isAdmin} /></TabsContent>
        <TabsContent value="usuarios" className="mt-6"><MembersPanel companyId={company.id} canManage={isAdmin} /></TabsContent>
        <TabsContent value="integracoes" className="mt-6"><IntegrationsPanel companyId={company.id} canView={canViewIntegrations} /></TabsContent>
      </Tabs>
    </div>
  );
}
