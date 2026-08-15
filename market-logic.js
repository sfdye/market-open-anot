/** Exported so callers building `${q}_cleaningstartdate` keys resolve to declared fields. */
export const QUARTERS = ['q1', 'q2', 'q3', 'q4'];
/** Parses a `DD/MM/YYYY` string. Returns null for blank or malformed input. */
export function parseDateDMY(str) {
    if (!str || !str.trim())
        return null;
    const parts = str.trim().split('/');
    if (parts.length !== 3)
        return null;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(d) || isNaN(m) || isNaN(y))
        return null;
    return new Date(y, m - 1, d);
}
/** Midnight of `date` in the local timezone. */
export function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
export function getMarketStatus(market, date) {
    const today = stripTime(date);
    for (const q of QUARTERS) {
        const start = parseDateDMY(market[`${q}_cleaningstartdate`]);
        const end = parseDateDMY(market[`${q}_cleaningenddate`]);
        if (start && end && today >= start && today <= end) {
            return { status: 'closed', reason: 'cleaning', start, end };
        }
    }
    const owStart = parseDateDMY(market.other_works_startdate);
    const owEnd = parseDateDMY(market.other_works_enddate);
    if (owStart && owEnd && today >= owStart && today <= owEnd) {
        return {
            status: 'closed',
            reason: 'other_works',
            remarks: market.remarks_other_works || '',
            start: owStart,
            end: owEnd,
        };
    }
    if (today.getDay() === 1) {
        return { status: 'warning', reason: 'monday' };
    }
    return { status: 'open' };
}
/** Closures and warnings over the next `days` days, starting the day after `fromDate`. */
export function getUpcomingClosures(market, days, fromDate) {
    const closures = [];
    const today = stripTime(fromDate);
    for (let i = 1; i <= days; i++) {
        // Calendar arithmetic, not +86400000: adding fixed milliseconds slips an hour either
        // way across a DST boundary in the device's timezone, which can shift the calendar day.
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        const result = getMarketStatus(market, date);
        if (result.status === 'open')
            continue;
        closures.push({
            date,
            reason: result.reason,
            remarks: 'remarks' in result ? result.remarks : undefined,
        });
    }
    return closures;
}
/** Next day the market is open or on weekly rest, searching up to 60 days out. */
export function getNextOpenDate(market, fromDate) {
    const start = stripTime(fromDate);
    for (let i = 1; i <= 60; i++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const s = getMarketStatus(market, date).status;
        if (s === 'open' || s === 'warning') {
            return date;
        }
    }
    return null;
}
/** Splits `"Blk 1 Foo Rd (Bar Market)"` into street + friendly name, decoding HTML entities. */
export function parseMarketName(rawName) {
    const name = (rawName || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    const match = name.match(/^(.+?)\s*\((.+)\)\s*$/);
    if (match) {
        return { street: match[1].trim(), friendly: match[2].trim() };
    }
    return { street: '', friendly: name };
}
