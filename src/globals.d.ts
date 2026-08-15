/** Non-standard properties the app feature-detects, plus the Leaflet global from the CDN. */

// index.html loads Leaflet from unpkg as a classic script, so it is a global rather than
// an import. Types come from the @types/leaflet devDependency.
import type * as leaflet from 'leaflet';

declare global {
  const L: typeof leaflet;

  interface Navigator {
    /** Legacy iOS Safari home-screen flag; `display-mode: standalone` covers everyone else. */
    standalone?: boolean;
  }

  interface Window {
    /** Present only in IE/Edge Legacy — used to rule out false iOS user-agent matches. */
    MSStream?: unknown;
  }
}
