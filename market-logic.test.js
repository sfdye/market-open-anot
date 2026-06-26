const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDateDMY,
  stripTime,
  getMarketStatus,
  getUpcomingClosures,
  getNextOpenDate,
  parseMarketName
} = require('./market-logic.js');

describe('parseDateDMY', () => {
  test('parses D/M/YYYY correctly', () => {
    const d = parseDateDMY('5/1/2026');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 0); // January
    assert.equal(d.getDate(), 5);
  });

  test('parses DD/MM/YYYY correctly', () => {
    const d = parseDateDMY('23/12/2026');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 11); // December
    assert.equal(d.getDate(), 23);
  });

  test('returns null for empty string', () => {
    assert.equal(parseDateDMY(''), null);
  });

  test('returns null for null input', () => {
    assert.equal(parseDateDMY(null), null);
  });

  test('returns null for "NA"', () => {
    assert.equal(parseDateDMY('NA'), null);
  });

  test('returns null for "nil"', () => {
    assert.equal(parseDateDMY('nil'), null);
  });

  test('returns null for malformed date', () => {
    assert.equal(parseDateDMY('abc/def/ghi'), null);
  });

  test('handles whitespace around date', () => {
    const d = parseDateDMY(' 5/1/2026 ');
    assert.equal(d.getDate(), 5);
    assert.equal(d.getMonth(), 0);
  });
});

describe('stripTime', () => {
  test('removes time component', () => {
    const d = new Date(2026, 5, 15, 14, 30, 45);
    const stripped = stripTime(d);
    assert.equal(stripped.getHours(), 0);
    assert.equal(stripped.getMinutes(), 0);
    assert.equal(stripped.getSeconds(), 0);
    assert.equal(stripped.getDate(), 15);
  });
});

describe('getMarketStatus', () => {
  const market = {
    name: 'Test Market',
    q1_cleaningstartdate: '5/1/2026',
    q1_cleaningenddate: '7/1/2026',
    q2_cleaningstartdate: '6/4/2026',
    q2_cleaningenddate: '8/4/2026',
    q3_cleaningstartdate: '31/8/2026',
    q3_cleaningenddate: '1/9/2026',
    q4_cleaningstartdate: '16/11/2026',
    q4_cleaningenddate: '17/11/2026',
    other_works_startdate: 'NA',
    other_works_enddate: 'NA',
    remarks_other_works: 'nil'
  };

  test('returns closed on Monday', () => {
    const monday = new Date(2026, 5, 29); // June 29, 2026 is Monday
    const result = getMarketStatus(market, monday);
    assert.equal(result.status, 'closed');
    assert.equal(result.reason, 'monday');
  });

  test('returns open on a regular weekday', () => {
    const wednesday = new Date(2026, 5, 25); // June 25, 2026 is Wednesday
    const result = getMarketStatus(market, wednesday);
    assert.equal(result.status, 'open');
  });

  test('returns closed on cleaning start date (non-Monday)', () => {
    const cleanStart = new Date(2026, 3, 6); // Apr 6 = q2 start, is a Monday — use Apr 7 (Tue)
    const result = getMarketStatus(market, new Date(2026, 3, 7)); // Apr 7 = Tue, within q2 range
    assert.equal(result.status, 'closed');
    assert.equal(result.reason, 'cleaning');
  });

  test('returns closed on cleaning end date', () => {
    const cleanEnd = new Date(2026, 0, 7); // Jan 7 = q1 end
    const result = getMarketStatus(market, cleanEnd);
    assert.equal(result.status, 'closed');
    assert.equal(result.reason, 'cleaning');
  });

  test('returns closed on date within cleaning range', () => {
    const midClean = new Date(2026, 0, 6); // Jan 6 = between q1 start and end
    const result = getMarketStatus(market, midClean);
    assert.equal(result.status, 'closed');
    assert.equal(result.reason, 'cleaning');
  });

  test('returns open day before cleaning', () => {
    const beforeClean = new Date(2026, 0, 4); // Jan 4 = day before q1 start
    const result = getMarketStatus(market, beforeClean);
    assert.equal(result.status, 'open');
  });

  test('returns open day after cleaning', () => {
    const afterClean = new Date(2026, 0, 8); // Jan 8 = day after q1 end
    const result = getMarketStatus(market, afterClean);
    assert.equal(result.status, 'open');
  });

  test('Monday takes priority over cleaning', () => {
    // If a cleaning day falls on a Monday, reason should be monday
    const marketMonClean = {
      ...market,
      q1_cleaningstartdate: '29/6/2026', // June 29 is Monday
      q1_cleaningenddate: '30/6/2026'
    };
    const monday = new Date(2026, 5, 29);
    const result = getMarketStatus(marketMonClean, monday);
    assert.equal(result.reason, 'monday');
  });

  test('handles other works closure', () => {
    const marketWithWorks = {
      ...market,
      other_works_startdate: '10/3/2026',
      other_works_enddate: '20/3/2026',
      remarks_other_works: 'Renovation'
    };
    const duringWorks = new Date(2026, 2, 15); // March 15
    const result = getMarketStatus(marketWithWorks, duringWorks);
    assert.equal(result.status, 'closed');
    assert.equal(result.reason, 'other_works');
    assert.equal(result.remarks, 'Renovation');
  });

  test('ignores other works with NA dates', () => {
    const result = getMarketStatus(market, new Date(2026, 2, 15));
    assert.equal(result.status, 'open');
  });

  test('handles market with missing cleaning fields', () => {
    const sparseMarket = { name: 'Sparse', q1_cleaningstartdate: '', q1_cleaningenddate: '' };
    const result = getMarketStatus(sparseMarket, new Date(2026, 5, 25)); // Wednesday
    assert.equal(result.status, 'open');
  });

  test('handles date with time component', () => {
    const dateWithTime = new Date(2026, 5, 29, 14, 30, 0); // Monday with time
    const result = getMarketStatus(market, dateWithTime);
    assert.equal(result.status, 'closed');
    assert.equal(result.reason, 'monday');
  });
});

describe('getUpcomingClosures', () => {
  const market = {
    name: 'Test Market',
    q1_cleaningstartdate: '5/1/2026',
    q1_cleaningenddate: '7/1/2026',
    q2_cleaningstartdate: '6/4/2026',
    q2_cleaningenddate: '8/4/2026',
    q3_cleaningstartdate: '',
    q3_cleaningenddate: '',
    q4_cleaningstartdate: '',
    q4_cleaningenddate: '',
    other_works_startdate: 'NA',
    other_works_enddate: 'NA',
    remarks_other_works: 'nil'
  };

  test('finds upcoming Mondays', () => {
    // Starting from a Tuesday
    const tuesday = new Date(2026, 5, 23); // June 23, 2026 = Tuesday
    const closures = getUpcomingClosures(market, 10, tuesday);
    const mondays = closures.filter(c => c.reason === 'monday');
    assert.ok(mondays.length >= 1);
    assert.equal(mondays[0].date.getDay(), 1);
  });

  test('finds cleaning days in range', () => {
    const beforeCleaning = new Date(2026, 0, 2); // Jan 2, 2026 = Friday
    const closures = getUpcomingClosures(market, 10, beforeCleaning);
    const cleaning = closures.filter(c => c.reason === 'cleaning');
    // Jan 5 is Monday (reason=monday), so only Jan 6 and 7 count as cleaning
    assert.equal(cleaning.length, 2);
  });

  test('returns empty for fully open range', () => {
    // A Tuesday through Saturday with no cleaning
    const tues = new Date(2026, 5, 9); // June 9, 2026 = Tuesday
    const closures = getUpcomingClosures(market, 4, tues);
    // Wed, Thu, Fri, Sat — no Monday, no cleaning in June for this market
    assert.equal(closures.length, 0);
  });
});

describe('getNextOpenDate', () => {
  const market = {
    name: 'Test Market',
    q1_cleaningstartdate: '5/1/2026',
    q1_cleaningenddate: '7/1/2026',
    q2_cleaningstartdate: '',
    q2_cleaningenddate: '',
    q3_cleaningstartdate: '',
    q3_cleaningenddate: '',
    q4_cleaningstartdate: '',
    q4_cleaningenddate: '',
    other_works_startdate: 'NA',
    other_works_enddate: 'NA',
    remarks_other_works: ''
  };

  test('returns Tuesday after a Monday', () => {
    const monday = new Date(2026, 5, 29);
    const next = getNextOpenDate(market, monday);
    assert.equal(next.getDay(), 2); // Tuesday
    assert.equal(next.getDate(), 30);
  });

  test('returns day after cleaning ends', () => {
    const lastCleanDay = new Date(2026, 0, 7); // Wed Jan 7 = last cleaning day
    const next = getNextOpenDate(market, lastCleanDay);
    assert.equal(next.getDate(), 8); // Jan 8
  });

  test('skips Monday after cleaning if cleaning ends on Sunday', () => {
    const marketSunEnd = {
      ...market,
      q2_cleaningstartdate: '27/6/2026', // Saturday
      q2_cleaningenddate: '28/6/2026'    // Sunday
    };
    const sunday = new Date(2026, 5, 28);
    const next = getNextOpenDate(marketSunEnd, sunday);
    // Monday June 29 is closed, so next open is Tuesday June 30
    assert.equal(next.getDay(), 2);
    assert.equal(next.getDate(), 30);
  });
});

describe('parseMarketName', () => {
  test('extracts friendly name from parentheses', () => {
    const result = parseMarketName('Smith Street Blk 335 (Chinatown Complex Market)');
    assert.equal(result.friendly, 'Chinatown Complex Market');
    assert.equal(result.street, 'Smith Street Blk 335');
  });

  test('handles HTML entities', () => {
    const result = parseMarketName('Smith St Blk 335 (Chinatown Complex Market &amp; Food Centre)');
    assert.equal(result.friendly, 'Chinatown Complex Market & Food Centre');
  });

  test('uses full name when no parentheses', () => {
    const result = parseMarketName('Adam Road Food Centre');
    assert.equal(result.friendly, 'Adam Road Food Centre');
    assert.equal(result.street, '');
  });

  test('handles null/empty input', () => {
    assert.equal(parseMarketName(null).friendly, '');
    assert.equal(parseMarketName('').friendly, '');
  });
});
