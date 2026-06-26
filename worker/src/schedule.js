export async function getMarketsWithCleaningOn(date, apiUrl) {
  const response = await fetch(apiUrl);
  if (!response.ok) return [];

  const data = await response.json();
  const records = data.result?.records || [];
  const target = stripTime(date);

  const closed = [];
  for (const market of records) {
    const quarters = ['q1', 'q2', 'q3', 'q4'];
    let isClosed = false;

    for (const q of quarters) {
      const start = parseDateDMY(market[`${q}_cleaningstartdate`]);
      const end = parseDateDMY(market[`${q}_cleaningenddate`]);
      if (start && end && target >= start && target <= end) {
        isClosed = true;
        break;
      }
    }

    if (!isClosed) {
      const owStart = parseDateDMY(market.other_works_startdate);
      const owEnd = parseDateDMY(market.other_works_enddate);
      if (owStart && owEnd && target >= owStart && target <= owEnd) {
        isClosed = true;
      }
    }

    if (isClosed) {
      closed.push(market);
    }
  }

  return closed;
}

function parseDateDMY(str) {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(y, m - 1, d);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
