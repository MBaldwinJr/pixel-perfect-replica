import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/auth-service";
import { ROLE_LABELS, type AppRole } from "@/domain/roles";

export function UserMenu({
  email,
  roles,
}: {
  readonly email: string;
  readonly roles: readonly AppRole[];
}) {
  const navigate = useNavigate();
  const handle = async () => {
    try {
      await signOut();
      void navigate({ to: "/auth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sair.");
    }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight">{email}</p>
        <p className="text-xs text-muted-foreground">
          {roles.map((r) => ROLE_LABELS[r]).join(" · ")}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handle} aria-label="Sair do sistema">
        <LogOut className="size-4" /> <span className="hidden sm:inline">Sair</span>
      </Button>
    </div>
  );
}
