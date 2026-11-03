import { Checkbox } from "@/components/ui/checkbox";
import { APP_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type AppRole } from "@/domain/roles";

interface RolePickerProps {
  readonly value: readonly AppRole[];
  readonly onChange: (next: AppRole[]) => void;
  readonly idPrefix: string;
}

export function RolePicker({ value, onChange, idPrefix }: RolePickerProps) {
  const toggle = (role: AppRole, checked: boolean) =>
    onChange(checked ? [...value, role] : value.filter((r) => r !== role));
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Perfis de acesso</legend>
      {APP_ROLES.map((role) => (
        <label
          key={role}
          htmlFor={`${idPrefix}-${role}`}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50"
        >
          <Checkbox
            id={`${idPrefix}-${role}`}
            checked={value.includes(role)}
            onCheckedChange={(c) => toggle(role, c === true)}
          />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
            <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
