(function () {
  'use strict';

  const API_URL = 'https://data.gov.sg/api/action/datastore_search?resource_id=d_bda4baa634dd1cc7a6c7cad5f19e2d68&limit=200';
  const STORAGE = {
    favorites: 'moa_favorites',
    data: 'moa_data',
    fetched: 'moa_fetched',
    lang: 'moa_lang'
  };

  const strings = {
    en: {
      appTitle: 'Market Open Anot?',
      open: 'OPEN',
      closed: 'CLOSED',
      openToday: 'OPEN TODAY',
      closedToday: 'CLOSED TODAY',
      reasonMonday: 'Monday rest day',
      reasonCleaning: 'Quarterly cleaning',
      opensAgain: 'Opens again:',
      nextClosure: 'Next:',
      upcoming: 'Upcoming Closures',
      weeklyRest: 'Weekly rest',
      cleaning: 'Cleaning',
      otherWorks: 'Maintenance',
      addMarkets: '+ Add Markets',
      chooseMarkets: 'Choose Your Markets',
      tapToAdd: 'Tap to add to favorites',
      search: 'Search...',
      done: 'Done',
      remove: 'Remove from favorites',
      noFavorites: 'Tap the button below to add your markets',
      closedTil: 'til',
      langToggle: 'EN'
    },
    zh: {
      appTitle: '巴刹开吗？',
      open: '开门',
      closed: '关门',
      openToday: '今天开门',
      closedToday: '今天关门',
      reasonMonday: '星期一休息',
      reasonCleaning: '每季度清洁',
      opensAgain: '下次开门：',
      nextClosure: '下次关：',
      upcoming: '即将关闭',
      weeklyRest: '每周休息',
      cleaning: '清洁',
      otherWorks: '维修',
      addMarkets: '+ 添加巴刹',
      chooseMarkets: '选择你的巴刹',
      tapToAdd: '点击添加到收藏',
      search: '搜索...',
      done: '完成',
      remove: '从收藏中移除',
      noFavorites: '点击下面的按钮添加你的巴刹',
      closedTil: '至',
      langToggle: '中文'
    }
  };

  let allMarkets = [];
  let favorites = [];
  let lang = 'en';

  // ===== Date Utilities =====

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

  function formatDate(date) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[date.getDay()] + ' ' + date.getDate() + ' ' + months[date.getMonth()];
  }

  function formatDateLong(date) {
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return days[date.getDay()] + ', ' + date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  // ===== Closure Logic =====

  function getMarketStatus(market, date) {
    var today = stripTime(date);

    if (today.getDay() === 1) {
      return { status: 'closed', reason: 'monday' };
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

  function getUpcomingClosures(market, days) {
    var closures = [];
    var today = stripTime(new Date());
    for (var i = 1; i <= days; i++) {
      var date = new Date(today.getTime() + i * 86400000);
      var result = getMarketStatus(market, date);
      if (result.status === 'closed') {
        closures.push({ date: date, reason: result.reason, remarks: result.remarks });
      }
    }
    return closures;
  }

  function getNextOpenDate(market, fromDate) {
    var date = stripTime(fromDate);
    for (var i = 1; i <= 60; i++) {
      date = new Date(date.getTime() + 86400000);
      if (getMarketStatus(market, date).status === 'open') {
        return date;
      }
    }
    return null;
  }

  // ===== Market Name Helpers =====

  function decodeHTML(str) {
    var txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function parseMarketName(rawName) {
    var name = decodeHTML(rawName || '');
    var match = name.match(/^(.+?)\s*\((.+)\)\s*$/);
    if (match) {
      return { street: match[1].trim(), friendly: match[2].trim() };
    }
    return { street: '', friendly: name };
  }

  // ===== Data Layer =====

  function loadFavorites() {
    try {
      var stored = localStorage.getItem(STORAGE.favorites);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(favs) {
    localStorage.setItem(STORAGE.favorites, JSON.stringify(favs));
  }

  function loadCachedData() {
    try {
      var stored = localStorage.getItem(STORAGE.data);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  function saveCachedData(data) {
    localStorage.setItem(STORAGE.data, JSON.stringify(data));
    localStorage.setItem(STORAGE.fetched, Date.now().toString());
  }

  function shouldRefresh() {
    var fetched = localStorage.getItem(STORAGE.fetched);
    if (!fetched) return true;
    var age = Date.now() - parseInt(fetched, 10);
    return age > 7 * 24 * 60 * 60 * 1000;
  }

  function fetchMarkets(callback) {
    var cached = loadCachedData();
    if (cached && cached.length > 0) {
      allMarkets = cached;
      callback();
      if (shouldRefresh()) {
        fetchFromAPI(function () { });
      }
      return;
    }
    fetchFromAPI(callback);
  }

  function fetchFromAPI(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var response = JSON.parse(xhr.responseText);
          if (response.result && response.result.records) {
            allMarkets = response.result.records;
            saveCachedData(allMarkets);
          }
        } catch (e) { }
      }
      callback();
    };
    xhr.onerror = function () {
      callback();
    };
    xhr.send();
  }

  // ===== Rendering =====

  function t(key) {
    return strings[lang][key] || strings['en'][key] || key;
  }

  function reasonText(result) {
    if (result.reason === 'monday') return t('reasonMonday');
    if (result.reason === 'cleaning') return t('reasonCleaning');
    if (result.reason === 'other_works') {
      return result.remarks ? decodeHTML(result.remarks) : t('otherWorks');
    }
    return '';
  }

  function closureReasonShort(reason, remarks) {
    if (reason === 'monday') return t('weeklyRest');
    if (reason === 'cleaning') return t('cleaning');
    if (reason === 'other_works') return remarks ? decodeHTML(remarks) : t('otherWorks');
    return '';
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');
  }

  function renderStatusScreen() {
    var container = document.getElementById('market-cards');
    var today = new Date();

    document.getElementById('app-title').textContent = t('appTitle');
    document.getElementById('today-date').textContent = formatDateLong(today);
    document.getElementById('add-markets-btn').textContent = t('addMarkets');

    if (favorites.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>' + t('noFavorites') + '</p></div>';
      return;
    }

    var html = '';
    for (var i = 0; i < favorites.length; i++) {
      var marketName = favorites[i];
      var market = findMarket(marketName);
      if (!market) continue;

      var status = getMarketStatus(market, today);
      var parsed = parseMarketName(market.name);
      var isOpen = status.status === 'open';
      var upcoming = getUpcomingClosures(market, 30);
      var nextClosure = upcoming.length > 0 ? upcoming[0] : null;

      var nextText = '';
      if (isOpen && nextClosure) {
        nextText = t('nextClosure') + ' ' + formatDate(nextClosure.date);
      } else if (!isOpen) {
        var endDate = status.end;
        if (status.reason === 'monday') {
          nextText = reasonText(status);
        } else if (endDate) {
          nextText = reasonText(status) + ' ' + t('closedTil') + ' ' + formatDate(endDate);
        } else {
          nextText = reasonText(status);
        }
      }

      html += '<div class="market-card" data-market="' + escapeAttr(marketName) + '">';
      html += '<div class="card-summary">';
      html += '<div class="card-info">';
      html += '<div class="card-name">' + escapeHtml(parsed.friendly) + '</div>';
      html += '<div class="card-next">' + escapeHtml(nextText) + '</div>';
      html += '</div>';
      html += '<div class="card-status ' + (isOpen ? 'open' : 'closed') + '">' + (isOpen ? t('open') : t('closed')) + '</div>';
      html += '</div>';

      // Expanded details
      html += '<div class="card-details">';
      if (parsed.street) {
        html += '<div class="card-address">' + escapeHtml(parsed.street) + '</div>';
      }

      html += '<div class="card-status-banner ' + (isOpen ? 'open' : 'closed') + '">';
      html += '<div class="banner-status-text">' + (isOpen ? t('openToday') : t('closedToday')) + '</div>';
      if (!isOpen) {
        html += '<div class="banner-reason">' + escapeHtml(reasonText(status)) + '</div>';
        var nextOpen = getNextOpenDate(market, today);
        if (nextOpen) {
          html += '<div class="banner-opens-again">' + t('opensAgain') + ' ' + formatDate(nextOpen) + '</div>';
        }
      }
      html += '</div>';

      if (upcoming.length > 0) {
        html += '<div class="upcoming-title">' + t('upcoming') + '</div>';
        html += '<ul class="upcoming-list">';
        var shown = Math.min(upcoming.length, 7);
        for (var j = 0; j < shown; j++) {
          html += '<li><span class="upcoming-date">' + formatDate(upcoming[j].date) + '</span>';
          html += '<span class="upcoming-reason">' + closureReasonShort(upcoming[j].reason, upcoming[j].remarks) + '</span></li>';
        }
        html += '</ul>';
      }

      html += '<button class="card-remove" data-market="' + escapeAttr(marketName) + '">' + t('remove') + '</button>';
      html += '</div>';
      html += '</div>';
    }

    container.innerHTML = html;

    container.querySelectorAll('.market-card').forEach(function (card) {
      card.querySelector('.card-summary').addEventListener('click', function () {
        card.classList.toggle('expanded');
      });
    });

    container.querySelectorAll('.card-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var name = btn.getAttribute('data-market');
        favorites = favorites.filter(function (f) { return f !== name; });
        saveFavorites(favorites);
        renderStatusScreen();
      });
    });
  }

  function renderPickerScreen() {
    document.getElementById('picker-title').textContent = t('chooseMarkets');
    document.getElementById('picker-subtitle').textContent = t('tapToAdd');
    document.getElementById('search-input').placeholder = t('search');
    document.getElementById('done-btn').textContent = t('done');

    renderMarketList('');
    updateDoneButton();
  }

  function renderMarketList(query) {
    var list = document.getElementById('market-list');
    var filtered = allMarkets;

    if (query) {
      var q = query.toLowerCase();
      filtered = allMarkets.filter(function (m) {
        var name = (m.name || '').toLowerCase();
        var addr = (m.address_myenv || '').toLowerCase();
        return name.indexOf(q) !== -1 || addr.indexOf(q) !== -1;
      });
    }

    filtered.sort(function (a, b) {
      var nameA = parseMarketName(a.name).friendly.toLowerCase();
      var nameB = parseMarketName(b.name).friendly.toLowerCase();
      return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
    });

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var market = filtered[i];
      var parsed = parseMarketName(market.name);
      var isFav = favorites.indexOf(market.name) !== -1;

      html += '<li class="market-list-item' + (isFav ? ' favorited' : '') + '" data-market="' + escapeAttr(market.name) + '">';
      html += '<span class="star">' + (isFav ? '★' : '☆') + '</span>';
      html += '<div class="market-item-info">';
      html += '<div class="market-item-name">' + escapeHtml(parsed.friendly) + '</div>';
      if (parsed.street) {
        html += '<div class="market-item-address">' + escapeHtml(parsed.street) + '</div>';
      }
      html += '</div>';
      html += '</li>';
    }

    list.innerHTML = html;

    list.querySelectorAll('.market-list-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var name = item.getAttribute('data-market');
        var idx = favorites.indexOf(name);
        if (idx === -1) {
          favorites.push(name);
        } else {
          favorites.splice(idx, 1);
        }
        saveFavorites(favorites);
        item.classList.toggle('favorited');
        item.querySelector('.star').textContent = favorites.indexOf(name) !== -1 ? '★' : '☆';
        updateDoneButton();
      });
    });
  }

  function updateDoneButton() {
    var btn = document.getElementById('done-btn');
    if (favorites.length > 0) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }

  function findMarket(name) {
    for (var i = 0; i < allMarkets.length; i++) {
      if (allMarkets[i].name === name) return allMarkets[i];
    }
    return null;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ===== i18n =====

  function loadLang() {
    var stored = localStorage.getItem(STORAGE.lang);
    return stored || 'en';
  }

  function setLang(newLang) {
    lang = newLang;
    localStorage.setItem(STORAGE.lang, lang);
    document.getElementById('lang-toggle').textContent = lang === 'en' ? strings.zh.langToggle : strings.en.langToggle;
  }

  // ===== Init =====

  function init() {
    lang = loadLang();
    favorites = loadFavorites();

    document.getElementById('lang-toggle').textContent = lang === 'en' ? strings.zh.langToggle : strings.en.langToggle;

    fetchMarkets(function () {
      // Clean up favorites that no longer exist in data
      favorites = favorites.filter(function (f) { return findMarket(f) !== null; });
      saveFavorites(favorites);

      if (favorites.length > 0) {
        showScreen('status-screen');
        renderStatusScreen();
      } else {
        showScreen('picker-screen');
        renderPickerScreen();
      }
    });

    // Event: Add Markets button
    document.getElementById('add-markets-btn').addEventListener('click', function () {
      showScreen('picker-screen');
      renderPickerScreen();
    });

    // Event: Done button
    document.getElementById('done-btn').addEventListener('click', function () {
      showScreen('status-screen');
      renderStatusScreen();
    });

    // Event: Search input
    document.getElementById('search-input').addEventListener('input', function (e) {
      renderMarketList(e.target.value);
    });

    // Event: Language toggle
    document.getElementById('lang-toggle').addEventListener('click', function () {
      setLang(lang === 'en' ? 'zh' : 'en');
      var currentScreen = document.querySelector('.screen:not(.hidden)');
      if (currentScreen && currentScreen.id === 'status-screen') {
        renderStatusScreen();
      } else {
        renderPickerScreen();
      }
    });
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
