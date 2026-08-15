import MarketMap from '../../../components/MarketMap';
import { useMarkets } from '../../../lib/store';

export default function MapScreen() {
  return <MarketMap markets={useMarkets()} />;
}
