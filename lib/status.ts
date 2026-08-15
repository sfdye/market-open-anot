import type { ClosureReason, MarketStatus } from './core/market-logic';
import { decodeEntities } from './markets';
import type { Translate } from './store';

export type StatusTone = 'open' | 'warning' | 'closed';

export function statusTone(status: MarketStatus): StatusTone {
  return status.status === 'open' ? 'open' : status.status === 'warning' ? 'warning' : 'closed';
}

/**
 * The label on a pill or banner: OPEN TODAY / MOST STALLS CLOSED / CLOSED TODAY. Day-scoped
 * rather than "OPEN", because the dataset has closure dates and no opening hours — a bare "OPEN"
 * claims the market is serving right now, which the app has no way to know.
 */
export function statusLabel(tone: StatusTone, t: Translate): string {
  return tone === 'open' ? t('openToday') : tone === 'warning' ? t('warningToday') : t('closedToday');
}

/** Why the market is in this state, one line. Empty when it is simply open. */
export function reasonText(status: MarketStatus, t: Translate): string {
  if (status.status === 'warning') return t('reasonMonday');
  if (status.status === 'closed') {
    if (status.reason === 'cleaning') return t('reasonCleaning');
    return status.remarks ? decodeEntities(status.remarks) : t('otherWorks');
  }
  return '';
}

/** The same thing for a row in the upcoming-closures list, where space is tight. */
export function closureReasonShort(
  reason: ClosureReason,
  remarks: string | undefined,
  t: Translate
): string {
  if (reason === 'monday') return t('weeklyRest');
  if (reason === 'cleaning') return t('cleaning');
  return remarks ? decodeEntities(remarks) : t('otherWorks');
}
