import MarketMap from '../../../components/MarketMap';
import { useMarkets } from '../../../lib/store';
import { useLocation } from '../../../lib/useLocation';

export default function MapScreen() {
  const markets = useMarkets();
  const { coords } = useLocation();

  return <MarketMap markets={markets} user={coords} />;
}
