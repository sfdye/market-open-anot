import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import ConstrainedCamera, { type ConstrainedCameraRef } from './ConstrainedCamera';
import MapAttribution from './MapAttribution';
import MapCallout from './MapCallout';
import { Icon } from './ui';
import type { Market } from '../lib/core/market-logic';
import { SG_BOUNDS, type Center } from '../lib/core/map-bounds';
import { MAX_MAP_ZOOM, MIN_MAP_ZOOM, type MapView } from '../lib/core/map-view';
import { configureMapLogging } from '../lib/maplibre';
import { getMarketDistance, marketCoords } from '../lib/markets';
import { getState, saveMapView, useFavorites, useT } from '../lib/store';
import { darkColors, lightColors, radius, space, useTheme, type Palette } from '../lib/theme';
import { useLocation } from '../lib/useLocation';

const SINGAPORE_CENTER: Center = [103.8198, 1.3521];
const LOCATED_ZOOM = 15;
const USER_VIEW_SAVE_DELAY_MS = 500;

/** OneMap raster tiles, the same source the web app fed to Leaflet. No API key needed. */
function buildStyle(colors: Palette, tileset: 'Default' | 'Night'): StyleSpecification {
  return {
    version: 8,
    sources: {
      onemap: {
        type: 'raster',
        tiles: [`https://www.onemap.gov.sg/maps/tiles/${tileset}/{z}/{x}/{y}.png`],
        tileSize: 256,
        minzoom: 11,
        maxzoom: 19,
        // OneMap serves nothing outside this box, and asking anyway costs a failed decode.
        bounds: SG_BOUNDS,
        attribution: 'OneMap © contributors | Singapore Land Authority',
      },
    },
    layers: [
      // Only visible in the gaps while tiles load, but a white flash in dark mode is jarring.
      { id: 'background', type: 'background', paint: { 'background-color': colors.mapBg } },
      { id: `onemap-${tileset.toLowerCase()}`, type: 'raster', source: 'onemap' },
    ],
  };
}

// Module constants: a style object rebuilt per render would reload the map every time.
// Dark mode swaps the Default tileset for OneMap's Night variant.
const MAP_STYLES = {
  light: buildStyle(lightColors, 'Default'),
  dark: buildStyle(darkColors, 'Night'),
};

// Here rather than in the root layout, which would drag the whole MapLibre module graph into every
// cold start: this file is its only importer, and the handler is read only while a `Map` is up.
configureMapLogging();

export default function MarketMap({ markets }: { markets: Market[] }) {
  const theme = useTheme();
  const t = useT();
  const favorites = useFavorites();
  const { coords, status, request } = useLocation();
  const coordsRef = useRef(coords);
  coordsRef.current = coords;
  const camera = useRef<ConstrainedCameraRef>(null);
  const [selected, setSelected] = useState<Market | null>(null);

  // Read once at mount, not subscribed: a re-render on every save (i.e. every region settle) would
  // re-serialise the tile style and all ~123 features, the cost ConstrainedCamera's state placement
  // exists to avoid. The store is hydrated before the map tab can be reached, so this is current.
  const [savedView] = useState<MapView | null>(() => getState().mapView);
  const latestView = useRef<MapView | null>(savedView);
  const pendingUserView = useRef<MapView | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Circles are drawn by the GPU from one source, so all ~123 markets stay cheap. Native view
  // annotations would not.
  const collection = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => {
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (const market of markets) {
      const point = marketCoords(market);
      if (!point) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
        properties: { name: market.name, favorite: favorites.includes(market.name) },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [markets, favorites]);

  // Set when "locate me" is tapped before a fix exists, so the camera moves as soon as one lands.
  // Also armed on a first-ever visit (no saved view) so the map defaults to the user's location.
  const awaitingFix = useRef(false);
  useEffect(() => {
    if (!savedView && !coords) awaitingFix.current = true;
  }, []);
  useEffect(() => {
    if (!coords || (savedView && !awaitingFix.current)) return;
    const view: MapView = {
      center: [coords.lng, coords.lat],
      zoom: awaitingFix.current ? LOCATED_ZOOM : 14,
    };
    clearTimeout(saveTimer.current);
    pendingUserView.current = null;
    latestView.current = view;
    saveMapView(view);
    if (!awaitingFix.current) return;
    awaitingFix.current = false;
    camera.current?.easeTo(view);
  }, [coords, savedView]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') return;
      clearTimeout(saveTimer.current);
      pendingUserView.current = null;
      if (latestView.current) saveMapView(latestView.current);
    });
    return () => {
      subscription.remove();
      clearTimeout(saveTimer.current);
      pendingUserView.current = null;
      if (latestView.current) saveMapView(latestView.current);
    };
  }, []);

  const locate = () => {
    if (!coords && status === 'denied') {
      void Linking.openSettings();
      return;
    }
    // The puck (MapLibre <UserLocation>) tracks the device continuously; `coords` from
    // useLocation is a one-shot fix that goes stale. Always re-acquire on tap so the camera
    // heads to where the blue dot actually is, not where it was at app start.
    awaitingFix.current = true;
    const before = coordsRef.current;
    void request({ fresh: true }).then(() => {
      if (coordsRef.current === before) awaitingFix.current = false;
    });
  };

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={MAP_STYLES[theme.scheme]}
        logo={false}
        attribution={false}
        compass={false}
        onPress={() => setSelected(null)}
        onRegionIsChanging={(e) => {
          if (!e.nativeEvent.userInteraction) return;
          latestView.current = { center: e.nativeEvent.center, zoom: e.nativeEvent.zoom };
        }}
        onRegionDidChange={(e) => {
          camera.current?.constrain(e.nativeEvent);
          const view = { center: e.nativeEvent.center, zoom: e.nativeEvent.zoom };

          if (!e.nativeEvent.userInteraction) {
            // A user at an edge can trigger ConstrainedCamera's corrective ease. Keep the camera
            // position it actually settles on rather than the pre-correction gesture position.
            if (!pendingUserView.current) return;
            clearTimeout(saveTimer.current);
            pendingUserView.current = null;
            latestView.current = view;
            saveMapView(view);
            return;
          }

          latestView.current = view;
          pendingUserView.current = view;
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            if (!pendingUserView.current) return;
            pendingUserView.current = null;
            if (latestView.current) saveMapView(latestView.current);
          }, USER_VIEW_SAVE_DELAY_MS);
        }}
      >
        {/* OneMap draws nothing outside Singapore, and every market is inside it. */}
        <ConstrainedCamera
          ref={camera}
          limit={SG_BOUNDS}
          initialViewState={{
            center: savedView
              ? savedView.center
              : coords
                ? [coords.lng, coords.lat]
                : SINGAPORE_CENTER,
            zoom: savedView ? savedView.zoom : coords ? 14 : 12,
          }}
          minZoom={MIN_MAP_ZOOM}
          maxZoom={MAX_MAP_ZOOM}
        />

        <GeoJSONSource
          id="market-points"
          data={collection}
          onPress={(e) => {
            // Otherwise the press bubbles to Map's handler, which clears the selection.
            e.stopPropagation();
            const name = e.nativeEvent.features[0]?.properties?.name as string | undefined;
            setSelected(name ? (markets.find((m) => m.name === name) ?? null) : null);
          }}
        >
          {/* Under the dots: a ring around whichever pin the callout is describing. */}
          <Layer
            id="market-selected"
            type="circle"
            filter={['==', ['get', 'name'], selected?.name ?? '']}
            paint={{
              'circle-radius': 18,
              'circle-color': theme.colors.accent,
              'circle-opacity': 0.25,
              'circle-stroke-width': 2,
              'circle-stroke-color': theme.colors.accent,
            }}
          />
          <Layer
            id="markets"
            type="circle"
            paint={{
              // Favourites read first: bigger and filled green, everything else a hollow dot.
              'circle-radius': ['case', ['boolean', ['get', 'favorite'], false], 11, 8],
              'circle-color': [
                'case',
                ['boolean', ['get', 'favorite'], false],
                theme.colors.mapFavFill,
                theme.colors.mapPinFill,
              ],
              'circle-stroke-width': 2.5,
              'circle-stroke-color': [
                'case',
                ['boolean', ['get', 'favorite'], false],
                theme.colors.mapFavStroke,
                theme.colors.mapPinStroke,
              ],
            }}
          />
        </GeoJSONSource>

        {/* Only rendered once a fix exists, which also means permission was granted. */}
        {!!coords && <UserLocation />}
      </Map>

      {!selected && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.controlWrap}>
          <Pressable
            onPress={locate}
            accessibilityRole="button"
            testID="map-my-location"
            accessibilityLabel={t('myLocation')}
            style={({ pressed }) => [
              styles.control,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon name="locate" size={24} color={coords ? 'accent' : 'textMuted'} />
          </Pressable>
        </Animated.View>
      )}

      {!!selected && (
        <MapCallout
          market={selected}
          distanceKm={getMarketDistance(selected, coords?.lat ?? null, coords?.lng ?? null)}
          onClose={() => setSelected(null)}
        />
      )}

      <MapAttribution />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  // Not the ui/Fab: a map control, squarer and on a surface fill, and placed by the animated
  // wrapper it fades in with rather than by itself.
  controlWrap: { position: 'absolute', right: space.md, bottom: space.md },
  control: {
    width: 48,
    height: 48,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
