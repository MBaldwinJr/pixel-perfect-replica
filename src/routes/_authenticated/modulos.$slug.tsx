import { createFileRoute, notFound } from "@tanstack/react-router";
import { Construction, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { canAccessModule, findModule } from "@/domain/modules";
import { useCurrentMembership } from "@/features/company/membership-context";

export const Route = createFileRoute("/_authenticated/modulos/$slug")({
  loader: ({ params }) => {
    const module = findModule(params.slug);
    if (!module || module.status !== "em_desenvolvimento") throw notFound();
    return { module };
  },
  head: ({ loaderData }) => {
    const title = `${loaderData?.module.title ?? "Módulo"} — Peixoto Tax Intelligence`;
    const description = loaderData?.module.description ?? "Módulo planejado.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: PlannedModulePage,
});

function PlannedModulePage() {
  const { module } = Route.useLoaderData();
  const { roles } = useCurrentMembership();
  const allowed = canAccessModule(module, roles);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{module.title}</h1>
        <Badge variant="warning">Em desenvolvimento</Badge>
      </header>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        {allowed ? (
          <Construction className="size-8 text-warning" aria-hidden />
        ) : (
          <Lock className="size-8 text-muted-foreground" aria-hidden />
        )}
        <p className="font-medium">
          {allowed
            ? "Módulo planejado para as próximas fases"
            : "Seu perfil não acessa este módulo"}
        </p>
        <p className="max-w-md text-sm text-muted-foreground">{module.description}</p>
      </div>
    </div>
  );
}
