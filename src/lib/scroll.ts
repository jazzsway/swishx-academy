/** Brings an element's top back under the sticky header if it has scrolled past it. */
export function revealTop(el: HTMLElement | null, offset = 84) {
  const top = el?.getBoundingClientRect().top;
  if (top !== undefined && top < offset) window.scrollTo({ top: window.scrollY + top - offset, behavior: "smooth" });
}
