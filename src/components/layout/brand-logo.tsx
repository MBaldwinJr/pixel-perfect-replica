export function BrandLogo({ compact = false }: { readonly compact?: boolean }) {
  if (compact) {
    return <span className="font-display text-lg font-bold text-brand-gradient" aria-label="Peixoto Tax Intelligence">PT</span>;
  }
  return (
    <span className="flex flex-col leading-none" aria-label="Peixoto Tax Intelligence">
      <span className="font-display text-base font-bold tracking-tight">Peixoto</span>
      <span className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-brand-gradient">Tax Intelligence</span>
    </span>
  );
}
