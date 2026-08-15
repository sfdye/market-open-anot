import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { parseMarketName, type Market } from '../lib/core/market-logic';
import { getDisplayName, marketCoords } from '../lib/markets';
import type { Coords } from '../lib/useLocation';
import { colors, radius, shadow } from '../lib/theme';
import { useStore } from '../lib/store';

const SINGAPORE_CENTER: [number, number] = [103.8198, 1.3521];

/** OneMap raster tiles, the same source the web app feeds to Leaflet. No API key needed. */
const ONEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    onemap: {
      type: 'raster',
      tiles: ['https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 11,
      maxzoom: 19,
      attribution: 'OneMap | © Singapore Land Authority',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': colors.bg } },
    { id: 'onemap', type: 'raster', source: 'onemap' },
  ],
};

export default function MarketMap({ markets, user }: { markets: Market[]; user: Coords | null }) {
  const { favorites, lang, isFavorite, toggleFavorite, t } = useStore();
  const [selected, setSelected] = useState<Market | null>(null);

  // Circles are drawn by the GPU from one source, so all ~123 markets stay cheap. Native view
  // annotations would not.
  const collection = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => {
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (const market of markets) {
      const coords = marketCoords(market);
      if (!coords) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
        properties: { name: market.name, favorite: favorites.includes(market.name) },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [markets, favorites]);

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={ONEMAP_STYLE}
        logo={false}
        compass={false}
        onPress={() => setSelected(null)}
      >
        <Camera
          initialViewState={{
            center: user ? [user.lng, user.lat] : SINGAPORE_CENTER,
            zoom: user ? 14 : 12,
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
          <Layer
            id="markets"
            type="circle"
            paint={{
              'circle-radius': 9,
              'circle-color': [
                'case',
                ['boolean', ['get', 'favorite'], false],
                colors.green,
                colors.surface,
              ],
              'circle-stroke-width': 2.5,
              'circle-stroke-color': [
                'case',
                ['boolean', ['get', 'favorite'], false],
                colors.greenDark,
                colors.textMuted,
              ],
            }}
          />
        </GeoJSONSource>

        {/* Only rendered once a fix exists, which also means permission was granted. */}
        {!!user && <UserLocation />}
      </Map>

      {!!selected && (
        <View style={styles.callout}>
          <Text style={styles.calloutName} numberOfLines={2}>
            {getDisplayName(parseMarketName(selected.name), lang)}
          </Text>
          <Pressable
            style={[styles.calloutBtn, isFavorite(selected.name) && styles.calloutBtnOn]}
            onPress={() => toggleFavorite(selected.name)}
            accessibilityRole="button"
          >
            <Text
              style={[styles.calloutBtnText, isFavorite(selected.name) && styles.calloutBtnTextOn]}
            >
              {isFavorite(selected.name) ? `★ ${t('removeFav')}` : `☆ ${t('addFav')}`}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  callout: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
    ...shadow.card,
  },
  calloutName: { fontSize: 18, fontWeight: '700', color: colors.text },
  calloutBtn: {
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.green,
    alignItems: 'center',
  },
  calloutBtnOn: { backgroundColor: colors.green },
  calloutBtnText: { fontSize: 16, fontWeight: '600', color: colors.green },
  calloutBtnTextOn: { color: colors.surface },
});
