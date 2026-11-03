import { describe, expect, it } from "vitest";
import { formatCnpj, isValidCnpj } from "./cnpj";
import { APP_MODULES, canAccessModule, canManageCompany, findModule } from "./modules";
import { companyFormSchema } from "./company-schema";

describe("CNPJ", () => {
  it("accepts the Peixoto CNPJ 13.364.076/0001-48", () => {
    expect(isValidCnpj("13.364.076/0001-48")).toBe(true);
  });
  it("rejects a wrong check digit", () => {
    expect(isValidCnpj("13.364.076/0001-49")).toBe(false);
  });
  it("rejects repeated digits", () => {
    expect(isValidCnpj("11111111111111")).toBe(false);
  });
  it("formats digits", () => {
    expect(formatCnpj("13364076000148")).toBe("13.364.076/0001-48");
  });
});

describe("module permissions", () => {
  const mod = (slug: string) => findModule(slug)!;
  it("compras opens fornecedores but not conciliação", () => {
    expect(canAccessModule(mod("fornecedores"), ["compras"])).toBe(true);
    expect(canAccessModule(mod("conciliacao"), ["compras"])).toBe(false);
  });
  it("financeiro opens conciliação", () => {
    expect(canAccessModule(mod("conciliacao"), ["financeiro"])).toBe(true);
  });
  it("comercial opens simulador de vendas but not documentos fiscais", () => {
    expect(canAccessModule(mod("simulador-vendas"), ["comercial"])).toBe(true);
    expect(canAccessModule(mod("documentos-fiscais"), ["comercial"])).toBe(false);
  });
  it("diretoria opens every module", () => {
    expect(APP_MODULES.every((m) => canAccessModule(m, ["diretoria"]))).toBe(true);
  });
  it("only admin manages the company", () => {
    expect(canManageCompany(["admin"])).toBe(true);
    expect(canManageCompany(["diretoria", "auditor"])).toBe(false);
  });
  it("lists the 14 planned modules", () => {
    expect(APP_MODULES).toHaveLength(14);
  });
});

describe("company form", () => {
  it("stores CNPJ as digits only", () => {
    const parsed = companyFormSchema.parse({
      legal_name: "Peixoto Materiais de Construção",
      trade_name: "",
      cnpj: "13.364.076/0001-48",
      tax_regime: "lucro_real",
      state_registration: "",
      municipal_registration: "",
      state: "RS",
      city: "",
    });
    expect(parsed.cnpj).toBe("13364076000148");
    expect(parsed.trade_name).toBeNull();
  });
});
