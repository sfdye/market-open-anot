import type { Lang } from './i18n';

// The Singapore-pinned date helpers live in core/reminder-schedule.ts so `node --test` can
// cover them without a React Native runtime; this module is only display formatting.
export { sgToday, sgInstant, civilKey } from './core/reminder-schedule';

const DAYS_SHORT = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], zh: ['日', '一', '二', '三', '四', '五', '六'] };
const DAYS_LONG = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] };
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDate(date: Date, lang: Lang): string {
  if (lang === 'zh') {
    return `${date.getMonth() + 1}月${date.getDate()}日 (${DAYS_SHORT.zh[date.getDay()]})`;
  }
  return `${DAYS_SHORT.en[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatDateLong(date: Date, lang: Lang): string {
  if (lang === 'zh') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${DAYS_LONG.zh[date.getDay()]}`;
  }
  return `${DAYS_LONG.en[date.getDay()]}, ${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}
