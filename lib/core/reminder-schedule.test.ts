import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  sgToday,
  sgInstant,
  civilKey,
  displayName,
  groupClosuresByDate,
  notificationCopy,
  buildSchedule,
  MAX_SCHEDULED_REMINDERS,
} from './reminder-schedule.ts';
import { MAX_FAVORITES } from './favorites.ts';
import type { DateGroup } from './reminder-schedule.ts';
import type { Market } from './market-logic.ts';

// 5-7 Feb 2026 is a Thursday-Saturday, so no Monday overlaps the cleaning window.
function market(name: string, overrides?: Partial<Market>): Market {
  return {
    name,
    q1_cleaningstartdate: 'NA',
    q1_cleaningenddate: 'NA',
    q2_cleaningstartdate: 'NA',
    q2_cleaningenddate: 'NA',
    q3_cleaningstartdate: 'NA',
    q3_cleaningenddate: 'NA',
    q4_cleaningstartdate: 'NA',
    q4_cleaningenddate: 'NA',
    other_works_startdate: 'NA',
    other_works_enddate: 'NA',
    remarks_other_works: '',
    ...overrides,
  };
}

const CLEAN_FEB = { q1_cleaningstartdate: '5/2/2026', q1_cleaningenddate: '7/2/2026' };

describe('sgToday', () => {
  test('gives the Singapore calendar date, not the device one', () => {
    // 2026-02-05T20:00Z is already 6 Feb in Singapore (UTC+8) but still 5 Feb in UTC.
    const d = sgToday(new Date('2026-02-05T20:00:00Z'));
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 1);
    assert.equal(d.getDate(), 6);
  });

  test('is midnight local so market-logic comparisons line up', () => {
    const d = sgToday(new Date('2026-02-05T20:00:00Z'));
    assert.equal(d.getHours(), 0);
    assert.equal(d.getMinutes(), 0);
  });

  test('does not roll over before Singapore midnight', () => {
    // 15:59Z is 23:59 SGT on the same day.
    const d = sgToday(new Date('2026-02-05T15:59:00Z'));
    assert.equal(d.getDate(), 5);
  });
});

describe('sgInstant', () => {
  test('resolves an hour on a civil date to the right UTC instant', () => {
    const civil = new Date(2026, 1, 6);
    assert.equal(sgInstant(civil, 19).toISOString(), '2026-02-06T11:00:00.000Z');
    assert.equal(sgInstant(civil, 6).toISOString(), '2026-02-05T22:00:00.000Z');
  });

  test('resolves 7pm and 6am SGT to 11:00 and 22:00 UTC', () => {
    const civil = new Date(2026, 1, 6);
    assert.equal(sgInstant(civil, 19).getUTCHours(), 11);
    assert.equal(sgInstant(civil, 6).getUTCHours(), 22);
  });
});

describe('civilKey', () => {
  test('is stable for the same calendar day regardless of time', () => {
    assert.equal(civilKey(new Date(2026, 1, 6)), civilKey(new Date(2026, 1, 6, 23, 59)));
  });

  test('differs across days', () => {
    assert.notEqual(civilKey(new Date(2026, 1, 6)), civilKey(new Date(2026, 1, 7)));
  });
});

describe('displayName', () => {
  test('extracts the parenthesised friendly name', () => {
    assert.equal(displayName('Blk 1 Foo Rd (Bar Market)', 'en'), 'Bar Market');
  });

  test('falls back to the whole name', () => {
    assert.equal(displayName('Tiong Bahru Market', 'en'), 'Tiong Bahru Market');
  });

  test('translates the friendly name in Chinese', () => {
    assert.equal(displayName('Blk 30 Seng Poh Rd (Tiong Bahru Market)', 'zh'), '中峇鲁巴刹');
  });

  test('falls back to English when there is no Chinese name', () => {
    assert.equal(displayName('Blk 1 Foo Rd (Bar Market)', 'zh'), 'Bar Market');
  });
});

describe('groupClosuresByDate', () => {
  const today = new Date(2026, 0, 15); // Thursday

  test('collapses markets closing the same day into one entry', () => {
    const markets = [market('A (Alpha)', CLEAN_FEB), market('B (Beta)', CLEAN_FEB)];
    const groups = groupClosuresByDate(['A (Alpha)', 'B (Beta)'], markets, today, 'en');

    assert.equal(groups.length, 3); // 5, 6, 7 Feb
    for (const group of groups) {
      assert.deepEqual(group.names, ['Alpha', 'Beta']);
    }
  });

  test('keeps the raw NEA names alongside the display ones', () => {
    const markets = [market('A (Alpha)', CLEAN_FEB)];
    const groups = groupClosuresByDate(['A (Alpha)'], markets, today, 'en');
    assert.deepEqual(groups[0].rawNames, ['A (Alpha)']);
  });

  test('uses Chinese market names in Chinese', () => {
    const raw = 'Blk 30 Seng Poh Rd (Tiong Bahru Market)';
    const groups = groupClosuresByDate([raw], [market(raw, CLEAN_FEB)], today, 'zh');
    assert.deepEqual(groups[0].names, ['中峇鲁巴刹']);
    assert.deepEqual(groups[0].rawNames, [raw]);
  });

  test('excludes Mondays', () => {
    const markets = [market('A (Alpha)')];
    const groups = groupClosuresByDate(['A (Alpha)'], markets, today, 'en');
    assert.deepEqual(groups, []);
  });

  test('excludes Mondays that fall inside the horizon alongside real closures', () => {
    const markets = [market('A (Alpha)', CLEAN_FEB)];
    const groups = groupClosuresByDate(['A (Alpha)'], markets, today, 'en');

    assert.equal(groups.length, 3);
    for (const group of groups) {
      assert.notEqual(group.date.getDay(), 1);
      assert.deepEqual(group.reasons, ['cleaning']);
    }
  });

  test('is sorted by date ascending', () => {
    const markets = [
      market('A (Alpha)', { q1_cleaningstartdate: '20/3/2026', q1_cleaningenddate: '20/3/2026' }),
      market('B (Beta)', CLEAN_FEB),
    ];
    const groups = groupClosuresByDate(['A (Alpha)', 'B (Beta)'], markets, today, 'en');
    const times = groups.map((g) => g.date.getTime());
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
  });

  test('ignores favourites no longer in the dataset', () => {
    const groups = groupClosuresByDate(
      ['Gone (Ghost)'],
      [market('A (Alpha)', CLEAN_FEB)],
      today,
      'en'
    );
    assert.deepEqual(groups, []);
  });

  test('tracks other_works separately from cleaning', () => {
    const markets = [
      market('A (Alpha)', { other_works_startdate: '5/2/2026', other_works_enddate: '5/2/2026' }),
    ];
    const groups = groupClosuresByDate(['A (Alpha)'], markets, today, 'en');
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].reasons, ['other_works']);
  });

  test('stays inside the 90-day horizon', () => {
    const markets = [
      market('A (Alpha)', { q4_cleaningstartdate: '1/12/2026', q4_cleaningenddate: '3/12/2026' }),
    ];
    assert.deepEqual(groupClosuresByDate(['A (Alpha)'], markets, today, 'en'), []);
  });
});

describe('notificationCopy', () => {
  type CopyInput = Pick<DateGroup, 'names' | 'reasons'>;
  const group: CopyInput = { names: ['Alpha', 'Beta'], reasons: ['cleaning'] };

  test('English, day before', () => {
    const copy = notificationCopy(group, false, 'en');
    assert.equal(copy.title, '⚠️ Closed tomorrow for cleaning');
    assert.equal(copy.body, 'Alpha, Beta is closed tomorrow — plan another day.');
  });

  test('English, morning of', () => {
    const copy = notificationCopy(group, true, 'en');
    assert.equal(copy.title, '🚫 Closed today for cleaning');
    assert.equal(copy.body, "Alpha, Beta is closed — don't make the trip!");
  });

  test('Chinese, day before', () => {
    const copy = notificationCopy(group, false, 'zh');
    assert.equal(copy.title, '⚠️ 明天关门（清洁）');
    assert.equal(copy.body, 'Alpha, Beta 明天关闭清洁 — 请改天再去。');
  });

  test('Chinese, morning of', () => {
    const copy = notificationCopy(group, true, 'zh');
    assert.equal(copy.title, '🚫 今天关门（清洁）');
    assert.equal(copy.body, 'Alpha, Beta 今天关闭清洁 — 别白跑一趟！');
  });

  test('says maintenance for other_works', () => {
    const works: CopyInput = { names: ['Alpha'], reasons: ['other_works'] };
    assert.equal(notificationCopy(works, true, 'en').title, '🚫 Closed today for maintenance');
    assert.equal(notificationCopy(works, true, 'zh').title, '🚫 今天关门（维修）');
  });

  test('says maintenance when a date mixes both reasons', () => {
    const mixed: CopyInput = { names: ['Alpha', 'Beta'], reasons: ['cleaning', 'other_works'] };
    assert.equal(notificationCopy(mixed, false, 'en').title, '⚠️ Closed tomorrow for maintenance');
  });
});

describe('buildSchedule', () => {
  // 15 Jan 2026, 10:00 SGT.
  const now = new Date('2026-01-15T02:00:00Z');
  const markets = [market('A (Alpha)', CLEAN_FEB), market('B (Beta)', CLEAN_FEB)];

  test('emits two reminders per closure date', () => {
    const entries = buildSchedule(['A (Alpha)'], markets, 'en', now);
    assert.equal(entries.length, 6); // 3 days x 2
  });

  test('fires at 7pm the evening before and 6am the morning of, SGT', () => {
    const entries = buildSchedule(['A (Alpha)'], markets, 'en', now);
    const feb5 = entries.filter((e) => e.identifier.startsWith('oa-2026-2-5-'));

    assert.equal(feb5.length, 2);
    const eve = feb5.find((e) => e.identifier.endsWith('-eve'));
    const morn = feb5.find((e) => e.identifier.endsWith('-morn'));
    assert.ok(eve);
    assert.ok(morn);
    assert.equal(eve.at.toISOString(), '2026-02-04T11:00:00.000Z');
    assert.equal(morn.at.toISOString(), '2026-02-04T22:00:00.000Z');
  });

  test('one reminder covers every market closed that day', () => {
    const entries = buildSchedule(['A (Alpha)', 'B (Beta)'], markets, 'en', now);
    assert.equal(entries.length, 6);
    for (const entry of entries) {
      assert.deepEqual(entry.markets, ['Alpha', 'Beta']);
      assert.deepEqual(entry.rawNames, ['A (Alpha)', 'B (Beta)']);
      assert.match(entry.body, /^Alpha, Beta /);
    }
  });

  test('carries the closure date and reason, which the fire time alone does not give', () => {
    const entries = buildSchedule(['A (Alpha)'], markets, 'en', now);
    const feb5 = entries.filter((e) => e.identifier.startsWith('oa-2026-2-5-'));

    for (const entry of feb5) {
      assert.equal(civilKey(entry.date), '2026-2-5');
      assert.deepEqual(entry.reasons, ['cleaning']);
    }
  });

  test('identifiers are unique', () => {
    const entries = buildSchedule(['A (Alpha)', 'B (Beta)'], markets, 'en', now);
    const ids = entries.map((e) => e.identifier);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('skips instants already past', () => {
    // 5 Feb 2026, 09:00 SGT — the 4 Feb evening and 5 Feb morning slots have both gone.
    const late = new Date('2026-02-05T01:00:00Z');
    const entries = buildSchedule(['A (Alpha)'], markets, 'en', late);
    assert.equal(entries.length, 4); // 6 Feb and 7 Feb only
    for (const entry of entries) {
      assert.ok(entry.at.getTime() > late.getTime());
    }
  });

  test('never schedules for a Monday', () => {
    const entries = buildSchedule(['A (Alpha)'], [market('A (Alpha)')], 'en', now);
    assert.deepEqual(entries, []);
  });

  // A full list is the worst a user can do, so that is what the queue budget is checked against —
  // and against the cap `rescheduleAll` really applies, which is what would truncate it.
  test('a full favourites list fits the reminder queue without truncation', () => {
    const many: Market[] = [];
    const names: string[] = [];
    for (let i = 0; i < MAX_FAVORITES; i++) {
      names.push(`M${i} (Market ${i})`);
      many.push(
        market(`M${i} (Market ${i})`, {
          q1_cleaningstartdate: `${5 + i}/2/2026`,
          q1_cleaningenddate: `${7 + i}/2/2026`,
        })
      );
    }
    const entries = buildSchedule(names, many, 'en', now);
    assert.ok(
      entries.length <= MAX_SCHEDULED_REMINDERS,
      `expected <= ${MAX_SCHEDULED_REMINDERS} pending, got ${entries.length}`
    );
  });

  test('respects the language setting', () => {
    const entries = buildSchedule(['A (Alpha)'], markets, 'zh', now);
    assert.match(entries[0].title, /关门/);
  });

  test('names the market in Chinese too, not just the copy around it', () => {
    const raw = 'Blk 30 Seng Poh Rd (Tiong Bahru Market)';
    const entries = buildSchedule([raw], [market(raw, CLEAN_FEB)], 'zh', now);
    assert.match(entries[0].body, /^中峇鲁巴刹 /);
  });
});
