import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

/** Matches the web app's `maximumAge: 300000` — a five-minute-old fix is good enough here. */
const MAX_AGE_MS = 5 * 60 * 1000;

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Foreground location, requested once. Resolves to null when permission is denied or no fix
 * arrives — callers fall back to alphabetical ordering, exactly as on the web.
 */
export function useLocation(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (!granted || cancelled) return;

        const last = await Location.getLastKnownPositionAsync({ maxAge: MAX_AGE_MS });
        if (cancelled) return;
        if (last) {
          setCoords({ lat: last.coords.latitude, lng: last.coords.longitude });
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setCoords({ lat: current.coords.latitude, lng: current.coords.longitude });
        }
      } catch {
        // No fix available; alphabetical ordering it is.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
}
