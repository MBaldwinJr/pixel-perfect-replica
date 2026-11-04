import { createContext, useContext, type ReactNode } from "react";
import type { Membership } from "./company-service";

const MembershipContext = createContext<Membership | null>(null);

export function MembershipProvider({
  value,
  children,
}: {
  readonly value: Membership;
  readonly children: ReactNode;
}) {
  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useCurrentMembership(): Membership {
  const m = useContext(MembershipContext);
  if (!m) throw new Error("useCurrentMembership must be used inside MembershipProvider");
  return m;
}
