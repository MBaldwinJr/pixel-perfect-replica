export const APP_ROLES = [
  "admin",
  "diretoria",
  "fiscal",
  "compras",
  "financeiro",
  "comercial",
  "auditor",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Readonly<Record<AppRole, string>> = {
  admin: "Administrador",
  diretoria: "Diretoria",
  fiscal: "Fiscal/Contábil",
  compras: "Compras",
  financeiro: "Financeiro",
  comercial: "Comercial",
  auditor: "Auditor",
};

export const ROLE_DESCRIPTIONS: Readonly<Record<AppRole, string>> = {
  admin: "Gerencia usuários, empresa e configurações.",
  diretoria: "Visualiza todos os módulos e relatórios.",
  fiscal: "Acessa documentos e regras fiscais.",
  compras: "Acessa fornecedores e simulações de compra.",
  financeiro: "Acessa recebimentos e conciliação.",
  comercial: "Acessa simulações de venda e precificação.",
  auditor: "Acesso de leitura e auditoria.",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}
