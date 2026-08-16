import type { Lang } from './market-logic.ts';

/**
 * The one place a closure reason is put into words.
 *
 * Two forms because English will not reuse one: `label` stands alone in a status pill, `phrase`
 * sits mid-sentence in a notification. They used to live in separate files — `i18n.ts` held
 * "Maintenance" while `notificationCopy` built "for maintenance" — so rewording one left the
 * other behind with nothing to catch it.
 */
export const REASON_WORDS: Record<
  Lang,
  Record<'cleaning' | 'other', { label: string; phrase: string }>
> = {
  en: {
    cleaning: { label: 'Cleaning', phrase: 'for cleaning' },
    other: { label: 'Maintenance', phrase: 'for maintenance' },
  },
  zh: {
    cleaning: { label: '清洁', phrase: '清洁' },
    other: { label: '维修', phrase: '维修' },
  },
};
