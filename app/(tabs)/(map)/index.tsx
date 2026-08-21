import MarketMap from '../../../components/MarketMap';
import { useMarkets, useReady } from '../../../lib/store';

export default function MapScreen() {
  // The store is hydrated before the splash lifts, so by the time the map tab is tappable the saved
  // view is in state. A deep link straight here could mount it early; hold off so the initial view
  // is the saved one, not the overview that predates it.
  const ready = useReady();
  const markets = useMarkets();
  if (!ready) return null;
  return <MarketMap markets={markets} />;
}
