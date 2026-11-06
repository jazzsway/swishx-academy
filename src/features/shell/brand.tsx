import { GraduationCap } from "lucide-react";
import { Text } from "@/components/ui/text";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div className="squircle grid shrink-0 place-items-center bg-brand text-white shadow-brand-lift" style={{ width: size, height: size, borderRadius: size * 0.3 }}>
      <GraduationCap size={size * 0.58} strokeWidth={2.1} aria-hidden="true" />
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
