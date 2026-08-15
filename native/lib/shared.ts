// The only place that reaches outside native/. The TypeScript in ../../src is the single
// source of truth shared with the web app, which compiles the same files to plain JS at
// the repo root; Metro sees them via the repo-root watchFolder in metro.config.js.
export {
  parseDateDMY,
  stripTime,
  getMarketStatus,
  getUpcomingClosures,
  getNextOpenDate,
  parseMarketName,
} from '../../src/market-logic';

export type {
  Market,
  ClosureReason,
  MarketStatus,
  Closure,
  ParsedMarketName,
} from '../../src/market-logic';

export { zhNames } from '../../src/zh-names';

export {
  HORIZON_DAYS,
  sgToday,
  sgInstant,
  civilKey,
  shortName,
  groupClosuresByDate,
  notificationCopy,
  buildSchedule,
} from '../../src/reminder-schedule';

export type { DateGroup, ScheduleEntry } from '../../src/reminder-schedule';
