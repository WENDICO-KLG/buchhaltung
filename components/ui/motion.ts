export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Runs a synchronous DOM update behind one cross-fade of the page where the browser can. */
export function crossFade(update: () => void) {
  if (!document.startViewTransition || reducedMotion()) { update(); return; }
  document.startViewTransition(update);
}
