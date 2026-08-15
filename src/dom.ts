/**
 * Every id this app looks up is hardcoded in index.html, so a miss is a bug in our own
 * markup rather than a runtime condition to handle. Throwing here keeps the ~40 call
 * sites free of null checks.
 */
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}
