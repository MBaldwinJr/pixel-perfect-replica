import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-provider";
import type { CompanyFormOutput } from "@/domain/company-schema";
import {
  confirmCompanyData,
  fetchIntegrations,
  fetchMyMembership,
  fetchRecentAudit,
  updateCompany,
} from "./company-service";

export function useMembership() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["membership", user?.id],
    queryFn: () => fetchMyMembership(user!.id),
    enabled: Boolean(user),
    retry: 2,
  });
}

export function useIntegrations(companyId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["integrations", companyId],
    queryFn: () => fetchIntegrations(companyId!),
    enabled: Boolean(companyId) && enabled,
  });
}

export function useRecentAudit(companyId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["audit", companyId],
    queryFn: () => fetchRecentAudit(companyId!),
    enabled: Boolean(companyId) && enabled,
  });
}

export function useUpdateCompany(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyFormOutput) => updateCompany(companyId, input),
    onSuccess: () => {
      toast.success("Dados da empresa salvos.");
      void qc.invalidateQueries({ queryKey: ["membership"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: (e: Error) => toast.error(`Não foi possível salvar: ${e.message}`),
  });
}

export function useConfirmCompany(companyId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => confirmCompanyData(companyId, user!.id),
    onSuccess: () => {
      toast.success("Cadastro confirmado administrativamente.");
      void qc.invalidateQueries({ queryKey: ["membership"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
