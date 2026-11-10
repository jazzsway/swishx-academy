import { LogoMark } from "@/components/ui/logo-mark";
import { Text } from "@/components/ui/text";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div className="squircle grid shrink-0 place-items-center bg-brand text-white shadow-brand-lift" style={{ width: size, height: size, borderRadius: size * 0.3 }}>
      <span aria-hidden="true" className="contents"><LogoMark size={Math.round(size * 0.6)} /></span>
    </div>
  );
}

export function BrandLockup({ sub }: { sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="flex min-w-0 flex-col leading-tight">
        <Text size="body-lg" weight="extrabold" tracking="tight">SwishX Academy</Text>
        {sub && <Text size="micro" tone="subtle" truncate>{sub}</Text>}
      </div>
    </div>
  );
}
