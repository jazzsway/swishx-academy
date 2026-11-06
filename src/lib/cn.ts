import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's OWN scale names. Our design tokens add
 * custom ones, and left unregistered they are misclassified — silently
 * breaking both directions of the merge:
 *
 *   twMerge("text-white", "text-body")   -> "text-body"
 *        text-body is read as a text COLOUR, so it cancels text-white and the
 *        text renders in the inherited colour. This is what made the brand
 *        "Save & Apply" button render near-black on orange, and it dropped
 *        the colour from every Chip.
 *
 *   twMerge("text-label", "text-brand")  -> "text-brand"
 *        the same collision the other way, so <Text size tone> lost its SIZE.
 *
 *   twMerge("rounded-card", "rounded-full") -> both kept
 *        no dedupe at all, so a call site could not override a primitive's
 *        radius and CSS source order decided the winner.
 *
 * Registering the token names in their real class groups fixes all of it.
 * Keep these lists in step with the @theme block in globals.css.
 */

const FONT_SIZE = [
  "micro", "caption", "label", "body", "body-lg", "subhead",
  "title", "display", "display-lg", "hero", "hero-lg",
];

const RADIUS = ["glyph", "chip", "control", "panel", "card"];

const SHADOW = [
  "hair", "soft", "float", "modal",
  "brand-soft", "brand-lift", "panel-left", "on-dark",
];

const EASE = ["swish", "spring", "entrance", "exit"];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZE }],
      rounded: [{ rounded: RADIUS }],
      "shadow": [{ shadow: SHADOW }],
      "ease": [{ ease: EASE }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
