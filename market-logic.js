(function (exports) {
  'use strict';

  function parseDateDMY(str) {
    if (!str || !str.trim()) return null;
    var parts = str.trim().split('/');
    if (parts.length !== 3) return null;
    var d = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var y = parseInt(parts[2], 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    return new Date(y, m - 1, d);
  }

  function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function getMarketStatus(market, date) {
    var today = stripTime(date);

    if (today.getDay() === 1) {
      return { status: 'warning', reason: 'monday' };
    }

    var quarters = ['q1', 'q2', 'q3', 'q4'];
    for (var i = 0; i < quarters.length; i++) {
      var q = quarters[i];
      var start = parseDateDMY(market[q + '_cleaningstartdate']);
      var end = parseDateDMY(market[q + '_cleaningenddate']);
      if (start && end && today >= start && today <= end) {
        return { status: 'closed', reason: 'cleaning', start: start, end: end };
      }
    }

    var owStart = parseDateDMY(market['other_works_startdate']);
    var owEnd = parseDateDMY(market['other_works_enddate']);
    if (owStart && owEnd && today >= owStart && today <= owEnd) {
      var remarks = market['remarks_other_works'] || '';
      return { status: 'closed', reason: 'other_works', remarks: remarks, start: owStart, end: owEnd };
    }

    return { status: 'open' };
  }

  function getUpcomingClosures(market, days, fromDate) {
    var closures = [];
    var today = stripTime(fromDate);
    for (var i = 1; i <= days; i++) {
      var date = new Date(today.getTime() + i * 86400000);
      var result = getMarketStatus(market, date);
      if (result.status === 'closed' || result.status === 'warning') {
        closures.push({ date: date, reason: result.reason, remarks: result.remarks });
      }
    }
    return closures;
  }

  function getNextOpenDate(market, fromDate) {
    var date = stripTime(fromDate);
    for (var i = 1; i <= 60; i++) {
      date = new Date(date.getTime() + 86400000);
      var s = getMarketStatus(market, date).status;
      if (s === 'open' || s === 'warning') {
        return date;
      }
    }
    return null;
  }

  function parseMarketName(rawName) {
    var name = (rawName || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    var match = name.match(/^(.+?)\s*\((.+)\)\s*$/);
    if (match) {
      return { street: match[1].trim(), friendly: match[2].trim() };
    }
    return { street: '', friendly: name };
  }

  exports.parseDateDMY = parseDateDMY;
  exports.stripTime = stripTime;
  exports.getMarketStatus = getMarketStatus;
  exports.getUpcomingClosures = getUpcomingClosures;
  exports.getNextOpenDate = getNextOpenDate;
  exports.parseMarketName = parseMarketName;

})(typeof module !== 'undefined' ? module.exports : (window.MarketLogic = {}));
