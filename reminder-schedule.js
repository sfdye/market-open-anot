(function (exports, MarketLogic) {
  'use strict';

  var getUpcomingClosures = MarketLogic.getUpcomingClosures;

  // Singapore has been a fixed UTC+8 with no DST since 1982, so a constant offset is exact.
  var SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

  // Far enough ahead to cover the next quarterly cleaning window, short enough that
  // per-date grouping keeps us clear of iOS's ~64 pending-request ceiling.
  var HORIZON_DAYS = 90;

  // The two moments worker/wrangler.toml's crons fire, in SGT.
  var EVENING_BEFORE_HOUR = 19;
  var MORNING_OF_HOUR = 6;

  /**
   * Today's Singapore calendar date as a Date whose *local* Y/M/D match Singapore's.
   * market-logic.js reads dates with local getters and parses DD/MM/YYYY into local
   * midnight, so feeding it these "civil" dates keeps status correct in any device timezone.
   */
  function sgToday(now) {
    var sgt = new Date((now || new Date()).getTime() + SGT_OFFSET_MS);
    return new Date(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate());
  }

  /** The real instant of hour:00 Singapore time on the given civil date. */
  function sgInstant(civil, hour) {
    var utc = Date.UTC(civil.getFullYear(), civil.getMonth(), civil.getDate(), hour);
    return new Date(utc - SGT_OFFSET_MS);
  }

  /** Stable YYYY-M-D key for collapsing closures that fall on the same civil date. */
  function civilKey(date) {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
  }

  /** A market's name as it reads in a notification — the parenthesised part when present. */
  function shortName(rawName) {
    var match = rawName.match(/\((.+)\)/);
    return match ? match[1] : rawName;
  }

  function findMarket(markets, name) {
    for (var i = 0; i < markets.length; i++) {
      if (markets[i].name === name) return markets[i];
    }
    return null;
  }

  /**
   * Closures across all favourites over the next HORIZON_DAYS days, collapsed to one entry
   * per date so five favourites closing the same day become one notification.
   *
   * Mondays are excluded: worker/src/schedule.js deliberately omits the weekly-rest rule,
   * and including it would be 52+ notifications per market per year.
   */
  function groupClosuresByDate(favorites, markets, today) {
    var groups = {};
    var order = [];

    for (var f = 0; f < favorites.length; f++) {
      var market = findMarket(markets, favorites[f]);
      if (!market) continue;

      var closures = getUpcomingClosures(market, HORIZON_DAYS, today);
      for (var c = 0; c < closures.length; c++) {
        var closure = closures[c];
        if (closure.reason === 'monday') continue;

        var key = civilKey(closure.date);
        if (!groups[key]) {
          groups[key] = { date: closure.date, names: [], reasons: [] };
          order.push(key);
        }
        var group = groups[key];
        var name = shortName(favorites[f]);
        if (group.names.indexOf(name) === -1) group.names.push(name);
        if (group.reasons.indexOf(closure.reason) === -1) group.reasons.push(closure.reason);
      }
    }

    return order
      .map(function (key) { return groups[key]; })
      .sort(function (a, b) { return a.date - b.date; });
  }

  /** Bilingual copy carried over from worker/src/index.js, with a maintenance variant. */
  function notificationCopy(group, isToday, lang) {
    var names = group.names.join(', ');
    var cleaningOnly = group.reasons.length === 1 && group.reasons[0] === 'cleaning';

    if (lang === 'zh') {
      var zhWhy = cleaningOnly ? '清洁' : '维修';
      return {
        title: isToday ? '🚫 今天关门（' + zhWhy + '）' : '⚠️ 明天关门（' + zhWhy + '）',
        body: isToday
          ? names + ' 今天关闭' + zhWhy + ' — 别白跑一趟！'
          : names + ' 明天关闭' + zhWhy + ' — 请改天再去。'
      };
    }

    var why = cleaningOnly ? 'for cleaning' : 'for maintenance';
    return {
      title: isToday ? '🚫 Closed today ' + why : '⚠️ Closed tomorrow ' + why,
      body: isToday
        ? names + ' is closed — don\'t make the trip!'
        : names + ' is closed tomorrow — plan another day.'
    };
  }

  /**
   * The full set of reminders to queue: two per closure date, 7pm the evening before and
   * 6am the morning of, skipping any instant already in the past. Pure — the caller hands
   * these to expo-notifications.
   */
  function buildSchedule(favorites, markets, lang, now) {
    var at = now || new Date();
    var groups = groupClosuresByDate(favorites, markets, sgToday(at));
    var entries = [];

    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      var d = group.date;
      var dayBefore = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
      var slots = [
        { slot: 'eve', when: sgInstant(dayBefore, EVENING_BEFORE_HOUR), isToday: false },
        { slot: 'morn', when: sgInstant(d, MORNING_OF_HOUR), isToday: true }
      ];

      for (var s = 0; s < slots.length; s++) {
        if (slots[s].when.getTime() <= at.getTime()) continue;
        var copy = notificationCopy(group, slots[s].isToday, lang);
        entries.push({
          identifier: 'moa-' + civilKey(d) + '-' + slots[s].slot,
          title: copy.title,
          body: copy.body,
          at: slots[s].when,
          markets: group.names.slice()
        });
      }
    }

    return entries;
  }

  exports.HORIZON_DAYS = HORIZON_DAYS;
  exports.sgToday = sgToday;
  exports.sgInstant = sgInstant;
  exports.civilKey = civilKey;
  exports.shortName = shortName;
  exports.groupClosuresByDate = groupClosuresByDate;
  exports.notificationCopy = notificationCopy;
  exports.buildSchedule = buildSchedule;
})(
  typeof module !== 'undefined' ? module.exports : (window.ReminderSchedule = {}),
  typeof module !== 'undefined' ? require('./market-logic.js') : window.MarketLogic
);
