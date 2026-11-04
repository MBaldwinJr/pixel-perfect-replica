import { z } from "zod";
import { isValidCnpj, onlyDigits } from "./cnpj";

export const TAX_REGIMES = ["simples_nacional", "lucro_presumido", "lucro_real"] as const;
export type TaxRegime = (typeof TAX_REGIMES)[number];

export const TAX_REGIME_LABELS: Readonly<Record<TaxRegime, string>> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

export const BR_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

export const companyFormSchema = z.object({
  legal_name: z.string().trim().min(2, "Informe a razão social").max(200),
  trade_name: optionalText(200),
  cnpj: z.string().refine(isValidCnpj, "CNPJ inválido").transform(onlyDigits),
  tax_regime: z.enum(TAX_REGIMES),
  state_registration: optionalText(30),
  municipal_registration: optionalText(30),
  state: z.enum(BR_STATES),
  city: optionalText(120),
});

export type CompanyFormInput = z.input<typeof companyFormSchema>;
export type CompanyFormOutput = z.output<typeof companyFormSchema>;
