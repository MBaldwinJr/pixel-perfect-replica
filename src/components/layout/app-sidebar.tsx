import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight, Bot, Boxes, CheckSquare, FileBarChart, FileText, LayoutDashboard, Landmark,
  Scale, Settings, ShoppingCart, SplitSquareHorizontal, Tags, Truck, type LucideIcon,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { APP_MODULES, canAccessModule, type AppModule } from "@/domain/modules";
import type { AppRole } from "@/domain/roles";
import { BrandLogo } from "./brand-logo";

const ICONS: Readonly<Record<string, LucideIcon>> = {
  dashboard: LayoutDashboard, fornecedores: Truck, produtos: Boxes, "documentos-fiscais": FileText,
  "inteligencia-tributaria": Landmark, "simulador-compras": ShoppingCart, "simulador-vendas": Tags,
  "split-payment": SplitSquareHorizontal, conciliacao: ArrowLeftRight, "agente-ia": Bot,
  legislacao: Scale, relatorios: FileBarChart, aprovacoes: CheckSquare, configuracoes: Settings,
};

function moduleLink(m: AppModule) {
  if (m.slug === "dashboard") return { to: "/dashboard" } as const;
  if (m.slug === "configuracoes") return { to: "/configuracoes" } as const;
  return { to: "/modulos/$slug", params: { slug: m.slug } } as const;
}

export function AppSidebar({ roles }: { readonly roles: readonly AppRole[] }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const visible = APP_MODULES.filter((m) => canAccessModule(m, roles));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-4">
        <BrandLogo compact={collapsed} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((m) => {
                const Icon = ICONS[m.slug] ?? LayoutDashboard;
                const link = moduleLink(m);
                const href = link.to === "/modulos/$slug" ? `/modulos/${m.slug}` : link.to;
                return (
                  <SidebarMenuItem key={m.slug}>
                    <SidebarMenuButton asChild isActive={path === href} tooltip={m.title}>
                      <Link {...link}>
                        <Icon className="size-4" aria-hidden />
                        <span>{m.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {m.status === "em_desenvolvimento" && !collapsed && (
                      <SidebarMenuBadge className="text-[0.6rem] text-muted-foreground">em dev.</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
