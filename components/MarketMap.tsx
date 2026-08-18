import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  type CameraRef,
  type StyleSpecification,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import MapCallout from './MapCallout';
import { Icon } from './ui';
import type { Market } from '../lib/core/market-logic';
import { centerLimit, clampCenter, sameBounds, SG_BOUNDS } from '../lib/core/map-bounds';
import type { Bounds } from '../lib/core/map-bounds';
import { getMarketDistance, marketCoords } from '../lib/markets';
import { useFavorites, useT } from '../lib/store';
import { darkColors, lightColors, radius, space, useTheme, type Palette } from '../lib/theme';
import { useLocation } from '../lib/useLocation';

const SINGAPORE_CENTER: [number, number] = [103.8198, 1.3521];
const LOCATED_ZOOM = 15;
/** Long enough to read as a correction rather than a jump, short enough not to fight a drag. */
const RECENTER_MS = 250;

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
        // Off the edge of its coverage OneMap answers with a body that is not a PNG, so a tile
        // there fails to decode rather than coming back empty. Not requesting it is cheaper.
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

export default function MarketMap({ markets }: { markets: Market[] }) {
  const theme = useTheme();
  const t = useT();
  const favorites = useFavorites();
  const { coords, status, request } = useLocation();
  const camera = useRef<CameraRef>(null);
  const [selected, setSelected] = useState<Market | null>(null);
  // Starts at the full box: until the map reports a viewport there is nothing to inset it by.
  const [centerBounds, setCenterBounds] = useState<Bounds>(SG_BOUNDS);

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

  // Every market is in Singapore and OneMap draws nothing outside it, so the camera has no business
  // leaving. `maxBounds` alone only holds the *centre* in, which still lets a pan pull half a screen
  // of empty background in from the coastline — so the box it gets is inset by half the visible
  // span, measured from the viewport the map just reported rather than derived from the zoom.
  const constrainCamera = ({ nativeEvent }: { nativeEvent: ViewStateChangeEvent }) => {
    const limit = centerLimit(nativeEvent.bounds, SG_BOUNDS);
    setCenterBounds((current) => (sameBounds(current, limit) ? current : limit));
    // Only a zoom changes the span, and zooming out near an edge lands the centre outside the
    // tightened box — which the native clamp will not undo, it only refuses the next move.
    const corrected = clampCenter(nativeEvent.center, limit);
    if (corrected) camera.current?.easeTo({ center: corrected, duration: RECENTER_MS });
  };

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
        onRegionDidChange={constrainCamera}
      >
        <Camera
          ref={camera}
          initialViewState={{
            center: coords ? [coords.lng, coords.lat] : SINGAPORE_CENTER,
            zoom: coords ? 14 : 12,
          }}
          minZoom={11}
          maxZoom={19}
          maxBounds={centerBounds}
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
