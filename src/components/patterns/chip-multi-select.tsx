"use client";

import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

/**
 * Chips you click directly, plus an "Other" chip that reveals an inline text
 * field for a value not in the list.
 *
 * This is the pattern the floating-dropdown removal converged on, and it had
 * been written twice in the dossier modal at two different sizes. The two
 * sizes here reproduce those two call sites exactly — `md` for the therapy
 * areas, `sm` for the doctor specialities — so adopting this changes no
 * markup.
 *
 * Per AGENTS.md this lives in patterns/ rather than ui/: it composes
 * primitives and encodes an interaction, but knows nothing about the product.
 */

type Size = "sm" | "md";

export interface ChipOption {
  id: string;
  label: string;
}

const chip: Record<Size, string> = {
  sm: "px-2.5 py-1 rounded-chip text-label font-semibold border transition-all cursor-pointer flex items-center gap-1",
  md: "px-3 py-1.5 rounded-chip text-body font-semibold border transition-all cursor-pointer flex items-center gap-1.5",
};

const chipSelected = "bg-tint border-brand text-brand-deep font-bold shadow-2xs";
const chipIdle = "bg-card border-hair-2 text-ink-2 hover:border-hair-3 hover:bg-subtle";

const otherChip: Record<Size, string> = {
  sm: "px-2.5 py-1 rounded-chip text-label font-semibold border border-dashed transition-all cursor-pointer flex items-center gap-1",
  md: "px-3 py-1.5 rounded-chip text-body font-semibold border border-dashed transition-all cursor-pointer flex items-center gap-1.5",
};

/** md carried a shadow on the open state and sm did not; preserved as-is. */
const otherOpen: Record<Size, string> = {
  sm: "bg-ink border-ink text-white font-bold",
  md: "bg-ink border-ink text-white shadow-2xs font-bold",
};
const otherIdle = "bg-card border-hair-3 text-ink-2 hover:border-hair-3 hover:bg-subtle";

const checkSize: Record<Size, string> = { sm: "size-2.5", md: "size-3" };
const box: Record<Size, string> = { sm: "p-2", md: "p-2.5" };
const addButton: Record<Size, string> = {
  sm: "h-7 text-label font-bold px-3 cursor-pointer",
  md: "h-7.5 text-label font-bold px-3.5 cursor-pointer",
};

export interface ChipMultiSelectProps {
  options: ChipOption[];
  selected: string[];
  onToggle: (id: string) => void;
  size?: Size;
  /** Classes for the chip row — e.g. a max height with scroll. */
  rowClassName?: string;

  /** Omit the whole "Other" affordance by leaving these unset. */
  otherLabel?: string;
  otherOpen?: boolean;
  onToggleOther?: () => void;
  customValue?: string;
  onCustomChange?: (value: string) => void;
  onCustomSubmit?: () => void;
  customPlaceholder?: string;
  addLabel?: string;
}

export function ChipMultiSelect({
  options, selected, onToggle, size = "md", rowClassName,
  otherLabel, otherOpen: isOtherOpen, onToggleOther,
  customValue = "", onCustomChange, onCustomSubmit,
  customPlaceholder, addLabel = "Add",
}: ChipMultiSelectProps) {
  const hasOther = Boolean(otherLabel && onToggleOther);

  return (
    <>
      <div className={cn("flex flex-wrap", size === "sm" ? "gap-1.5" : "gap-2", rowClassName)}>
        {options.map((option) => {
          const isSel = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              aria-pressed={isSel}
              className={cn(chip[size], isSel ? chipSelected : chipIdle)}
            >
              {isSel && <Check className={cn(checkSize[size], "text-brand stroke-[3]")} />}
              <span>{option.label}</span>
            </button>
          );
        })}

        {hasOther && (
          <button
            type="button"
            onClick={onToggleOther}
            aria-expanded={isOtherOpen}
            className={cn(otherChip[size], isOtherOpen ? otherOpen[size] : otherIdle)}
          >
            <Plus className="size-3" />
            <span>{otherLabel}</span>
          </button>
        )}
      </div>

      {hasOther && isOtherOpen && (
        <div className={cn("flex items-center gap-2 rounded-control bg-subtle border border-hair-2 animate-in fade-in duration-100", box[size])}>
          <input
            type="text"
            value={customValue}
            onChange={(e) => onCustomChange?.(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onCustomSubmit?.(); }}
            placeholder={customPlaceholder}
            className="flex-1 bg-card rounded-chip border border-hair-2 px-3 py-1.5 text-body font-medium text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-brand"
            autoFocus
          />
          <Button
            size="sm"
            variant="primary"
            onClick={onCustomSubmit}
            disabled={!customValue.trim()}
            className={addButton[size]}
          >
            <span>{addLabel}</span>
          </Button>
        </div>
      )}
    </>
  );
}
