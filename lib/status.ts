import type { ClosureReason, MarketStatus } from './core/market-logic';
import { decodeEntities } from './markets';
import type { Translate } from './store';

export type StatusTone = 'open' | 'warning' | 'closed';

export function statusTone(status: MarketStatus): StatusTone {
  return status.status === 'open' ? 'open' : status.status === 'warning' ? 'warning' : 'closed';
}

/** The short label on the pill: OPEN / MOST STALLS CLOSED / CLOSED. */
export function statusLabel(tone: StatusTone, t: Translate): string {
  return tone === 'open' ? t('open') : tone === 'warning' ? t('warning') : t('closed');
}

/** The longer label used on the detail screen's banner. */
export function statusHeadline(tone: StatusTone, t: Translate): string {
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
