import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import ConstrainedCamera, { type ConstrainedCameraRef } from './ConstrainedCamera';
import MapCallout from './MapCallout';
import { Icon } from './ui';
import type { Market } from '../lib/core/market-logic';
import { SG_BOUNDS, type Center } from '../lib/core/map-bounds';
import { configureMapLogging } from '../lib/maplibre';
import { getMarketDistance, marketCoords } from '../lib/markets';
import { useFavorites, useT } from '../lib/store';
import { darkColors, lightColors, radius, space, useTheme, type Palette } from '../lib/theme';
import { useLocation } from '../lib/useLocation';

const SINGAPORE_CENTER: Center = [103.8198, 1.3521];
const LOCATED_ZOOM = 15;

/** OneMap raster tiles, the same source the web app fed to Leaflet. No API key needed. */
function buildStyle(colors: Palette): StyleSpecification {
  return {
    version: 8,
    sources: {
      onemap: {
        type: 'raster',
        tiles: ['https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'],
        tileSize: 256,
        minzoom: 11,
        maxzoom: 19,
        // OneMap serves nothing outside this box, and asking anyway costs a failed decode.
        bounds: SG_BOUNDS,
        attribution: 'OneMap | © Singapore Land Authority',
      },
    },
    layers: [
      // Only visible in the gaps while tiles load, but a white flash in dark mode is jarring.
      { id: 'background', type: 'background', paint: { 'background-color': colors.mapBg } },
      { id: 'onemap', type: 'raster', source: 'onemap' },
    ],
  };
}

// Module constants: a style object rebuilt per render would reload the map every time.
const MAP_STYLES = { light: buildStyle(lightColors), dark: buildStyle(darkColors) };

// Here rather than in the root layout, which would drag the whole MapLibre module graph into every
// cold start: this file is its only importer, and the handler is read only while a `Map` is up.
configureMapLogging();

export default function MarketMap({ markets }: { markets: Market[] }) {
  const theme = useTheme();
  const t = useT();
  const favorites = useFavorites();
  const { coords, status, request } = useLocation();
  const camera = useRef<ConstrainedCameraRef>(null);
  const [selected, setSelected] = useState<Market | null>(null);

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
  const awaitingFix = useRef(false);
  useEffect(() => {
    if (!coords || !awaitingFix.current) return;
    awaitingFix.current = false;
    camera.current?.easeTo({ center: [coords.lng, coords.lat], zoom: LOCATED_ZOOM });
  }, [coords]);

  const locate = () => {
    if (coords) {
      camera.current?.easeTo({ center: [coords.lng, coords.lat], zoom: LOCATED_ZOOM });
      return;
    }
    if (status === 'denied') {
      void Linking.openSettings();
      return;
    }
    awaitingFix.current = true;
    request();
  };

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={MAP_STYLES[theme.scheme]}
        logo={false}
        compass={false}
        onPress={() => setSelected(null)}
        onRegionDidChange={(e) => camera.current?.constrain(e.nativeEvent)}
      >
        {/* OneMap draws nothing outside Singapore, and every market is inside it. */}
        <ConstrainedCamera
          ref={camera}
          limit={SG_BOUNDS}
          initialViewState={{
            center: coords ? [coords.lng, coords.lat] : SINGAPORE_CENTER,
            zoom: coords ? 14 : 12,
          }}
          minZoom={11}
          maxZoom={19}
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
