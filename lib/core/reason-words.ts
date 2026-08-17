import type { Lang, NotifiableReason } from './market-logic.ts';

/**
 * The one place a closure reason is put into words.
 *
 * Two forms because English will not reuse one: `label` stands alone in a status pill, `phrase`
 * sits mid-sentence in a notification. They used to live in separate files — `i18n.ts` held
 * "Maintenance" while `notificationCopy` built "for maintenance" — so rewording one left the
 * other behind with nothing to catch it.
 *
 * Keyed by `ClosureReason` rather than a local union, so a fourth reason in the dataset fails
 * typecheck here instead of being silently worded as maintenance by every consumer's `else`.
 */
export const REASON_WORDS: Record<
  Lang,
  Record<NotifiableReason, { label: string; phrase: string }>
> = {
  en: {
    cleaning: { label: 'Cleaning', phrase: 'for cleaning' },
    other_works: { label: 'Maintenance', phrase: 'for maintenance' },
  },
  zh: {
    cleaning: { label: '清洁', phrase: '清洁' },
    other_works: { label: '维修', phrase: '维修' },
  },
};
