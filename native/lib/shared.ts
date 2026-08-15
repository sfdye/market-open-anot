// The only place that reaches outside native/. market-logic.js and zh-names.js are
// the single source of truth shared verbatim with the web app; Metro sees them via
// the repo-root watchFolder in metro.config.js.
export {
  parseDateDMY,
  stripTime,
  getMarketStatus,
  getUpcomingClosures,
  getNextOpenDate,
  parseMarketName,
} from '../../market-logic';

export type {
  Market,
  ClosureReason,
  MarketStatus,
  Closure,
  ParsedMarketName,
} from '../../market-logic';

export { zhNames } from '../../zh-names';

export {
  HORIZON_DAYS,
  sgToday,
  sgInstant,
  civilKey,
  shortName,
  groupClosuresByDate,
  notificationCopy,
  buildSchedule,
} from '../../reminder-schedule';

export type { DateGroup, ScheduleEntry } from '../../reminder-schedule';
