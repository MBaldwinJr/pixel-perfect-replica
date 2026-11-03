import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { AppRole } from "@/domain/roles";
import { fetchCompanyMembers, replaceMemberRoles } from "./users-service";
import { createCompanyUser, setCompanyUserActive } from "./users.functions";

const key = (companyId: string) => ["members", companyId] as const;

export function useCompanyMembers(companyId: string) {
  return useQuery({ queryKey: key(companyId), queryFn: () => fetchCompanyMembers(companyId) });
}

function useInvalidate(companyId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: key(companyId) });
    void qc.invalidateQueries({ queryKey: ["audit"] });
    void qc.invalidateQueries({ queryKey: ["membership"] });
  };
}

export interface NewUserInput {
  readonly email: string;
  readonly fullName: string;
  readonly password: string;
  readonly roles: AppRole[];
}

export function useCreateMember(companyId: string) {
  const fn = useServerFn(createCompanyUser);
  const invalidate = useInvalidate(companyId);
  return useMutation({
    mutationFn: (input: NewUserInput) => fn({ data: { companyId, ...input } }),
    onSuccess: () => {
      toast.success("Usuário criado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetMemberActive(companyId: string) {
  const fn = useServerFn(setCompanyUserActive);
  const invalidate = useInvalidate(companyId);
  return useMutation({
    mutationFn: (v: { userId: string; active: boolean }) => fn({ data: { companyId, ...v } }),
    onSuccess: (_d, v) => {
      toast.success(v.active ? "Usuário reativado." : "Usuário desativado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMemberRoles(companyId: string) {
  const invalidate = useInvalidate(companyId);
  return useMutation({
    mutationFn: (v: { userId: string; current: readonly AppRole[]; next: readonly AppRole[] }) =>
      replaceMemberRoles(companyId, v.userId, v.current, v.next),
    onSuccess: () => {
      toast.success("Perfis atualizados.");
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      invalidate();
    },
  });
}
