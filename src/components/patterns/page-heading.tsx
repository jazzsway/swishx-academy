import type { ReactNode } from "react";
import { Text } from "@/components/ui/text";

/**
 * The heading every page inside the app shell opens with: a title, one line
 * of what the page is for, and optional actions on the right.
 *
 * Product Library, Claims, Content, MLR Review, the Create screens and
 * Settings each had their own copy at three different sizes. This is the one
 * size, taken from the Product Library.
 */
export function PageHeading({
  title, description, eyebrow, actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** A small label above the title, when the page belongs to a bigger thing. */
  eyebrow?: ReactNode;
  /** Pinned to the right; wraps under the text on narrow screens. */
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <Text size="label" weight="extrabold" tone="faint" className="mb-1.5 block uppercase tracking-[.14em]">{eyebrow}</Text>
        )}
        <Text as="h1" px={28} weight="extrabold" className="block leading-tight tracking-[-1px]">{title}</Text>
        {description && (
          <Text as="p" size="subhead" tone="subtle" className="mt-2 block max-w-[62ch] leading-relaxed">{description}</Text>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
