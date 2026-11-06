"use client";

import { createPortal } from "react-dom";

/**
 * Renders its children at the end of <body>.
 *
 * A `position: fixed` overlay is only fixed to the viewport if nothing above
 * it has a transform, a filter, a backdrop-filter or containment — any one of
 * those makes that ancestor the containing block, and the "full-screen" dialog
 * becomes a box inside a panel. This app is full of those properties: blurred
 * chrome, hover lifts, shimmer sweeps. Depending on where a modal happens to
 * be mounted is depending on none of its ancestors ever gaining one.
 *
 * So no overlay trusts its position in the tree. It leaves.
 *
 * Guarded on `document` rather than on a mounted flag: every overlay here is
 * opened by a click, so none of them exists during the server pass, and there
 * is nothing for a first render to disagree with. A flag set in an effect
 * would render the dialog one frame late for no gain.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
