import type { AppRole } from "./roles";

export type ModuleStatus = "ativo" | "em_desenvolvimento";

export interface AppModule {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly status: ModuleStatus;
  /** Roles allowed to open the module. Admin and diretoria see every module. */
  readonly roles: readonly AppRole[];
}

const ALL: readonly AppRole[] = [
  "admin",
  "diretoria",
  "fiscal",
  "compras",
  "financeiro",
  "comercial",
  "auditor",
];

export const APP_MODULES: readonly AppModule[] = [
  { slug: "dashboard", title: "Dashboard Executivo", description: "Indicadores estruturais da operação.", status: "ativo", roles: ALL },
  { slug: "fornecedores", title: "Fornecedores", description: "Cadastro e análise de fornecedores.", status: "em_desenvolvimento", roles: ["compras", "fiscal", "auditor"] },
  { slug: "produtos", title: "Produtos", description: "Catálogo e classificação fiscal de produtos.", status: "em_desenvolvimento", roles: ["compras", "fiscal", "comercial", "auditor"] },
  { slug: "documentos-fiscais", title: "Documentos Fiscais", description: "Importação e leitura de XML de NF-e.", status: "em_desenvolvimento", roles: ["fiscal", "auditor"] },
  { slug: "inteligencia-tributaria", title: "Inteligência Tributária", description: "Créditos, IBS, CBS e reforma tributária.", status: "em_desenvolvimento", roles: ["fiscal", "auditor"] },
  { slug: "simulador-compras", title: "Simulador de Compras", description: "Cenários de custo e crédito em compras.", status: "em_desenvolvimento", roles: ["compras", "fiscal"] },
  { slug: "simulador-vendas", title: "Simulador de Vendas", description: "Cenários de preço e tributação em vendas.", status: "em_desenvolvimento", roles: ["comercial", "fiscal"] },
  { slug: "split-payment", title: "Split Payment", description: "Impactos do recolhimento segregado.", status: "em_desenvolvimento", roles: ["financeiro", "fiscal", "auditor"] },
  { slug: "conciliacao", title: "Adquirentes e Conciliação", description: "Recebimentos de Cielo, PagBank e Vero.", status: "em_desenvolvimento", roles: ["financeiro", "auditor"] },
  { slug: "agente-ia", title: "Agente IA", description: "Assistente analítico sobre dados validados.", status: "em_desenvolvimento", roles: ALL },
  { slug: "legislacao", title: "Legislação", description: "Base normativa de referência.", status: "em_desenvolvimento", roles: ALL },
  { slug: "relatorios", title: "Relatórios", description: "Relatórios gerenciais e fiscais.", status: "em_desenvolvimento", roles: ["auditor", "fiscal", "financeiro"] },
  { slug: "aprovacoes", title: "Aprovações", description: "Fluxos de aprovação de recomendações.", status: "em_desenvolvimento", roles: ["fiscal", "financeiro", "compras"] },
  { slug: "configuracoes", title: "Configurações", description: "Empresa, usuários, perfis e integrações.", status: "ativo", roles: ALL },
];

export function canAccessModule(module: AppModule, roles: readonly AppRole[]): boolean {
  if (roles.includes("admin") || roles.includes("diretoria")) return true;
  return roles.some((r) => module.roles.includes(r));
}

export function findModule(slug: string): AppModule | undefined {
  return APP_MODULES.find((m) => m.slug === slug);
}

export function canManageCompany(roles: readonly AppRole[]): boolean {
  return roles.includes("admin");
}
