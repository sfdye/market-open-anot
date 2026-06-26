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
      warning: 'MOST STALLS CLOSED',
      openToday: 'OPEN TODAY',
      closedToday: 'CLOSED TODAY',
      warningToday: 'MANY STALLS CLOSED',
      reasonMonday: 'Monday — most stalls rest',
      reasonCleaning: 'Quarterly cleaning',
      opensAgain: 'Opens again:',
      nextClosure: 'Next:',
      upcoming: 'Upcoming Closures',
      weeklyRest: 'Most stalls closed',
      cleaning: 'Cleaning',
      otherWorks: 'Maintenance',
      marketStalls: 'market stalls',
      foodStalls: 'food stalls',
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
      warning: '多数摊位休息',
      openToday: '今天开门',
      closedToday: '今天关门',
      warningToday: '多数摊位休息',
      reasonMonday: '星期一 — 多数摊位休息',
      reasonCleaning: '每季度清洁',
      opensAgain: '下次开门：',
      nextClosure: '下次关：',
      upcoming: '即将关闭',
      weeklyRest: '多数摊位休息',
      cleaning: '清洁',
      otherWorks: '维修',
      marketStalls: '个巴刹摊位',
      foodStalls: '个熟食摊位',
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

  var parseDateDMY = MarketLogic.parseDateDMY;
  var stripTime = MarketLogic.stripTime;
  var getMarketStatus = MarketLogic.getMarketStatus;
  var getNextOpenDate = MarketLogic.getNextOpenDate;
  var parseMarketName = MarketLogic.parseMarketName;

  var zhNames = ZhNames.zhNames;

  function getUpcomingClosures(market, days) {
    return MarketLogic.getUpcomingClosures(market, days, new Date());
  }

  function formatDate(date) {
    if (lang === 'zh') {
      var m = date.getMonth() + 1;
      var d = date.getDate();
      var dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      return m + '月' + d + '日 (' + dayNames[date.getDay()] + ')';
    }
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[date.getDay()] + ' ' + date.getDate() + ' ' + months[date.getMonth()];
  }

  function formatDateLong(date) {
    if (lang === 'zh') {
      var y = date.getFullYear();
      var m = date.getMonth() + 1;
      var d = date.getDate();
      var dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      return y + '年' + m + '月' + d + '日 ' + dayNames[date.getDay()];
    }
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return days[date.getDay()] + ', ' + date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
  }

  function getDisplayName(parsed) {
    if (lang === 'zh') {
      return zhNames[parsed.friendly] || parsed.friendly;
    }
    return parsed.friendly;
  }

  function decodeHTML(str) {
    var txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
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
      var isWarning = status.status === 'warning';
      var isClosed = status.status === 'closed';
      var upcoming = getUpcomingClosures(market, 30);
      var nextClosure = upcoming.length > 0 ? upcoming[0] : null;

      var statusClass = isOpen ? 'open' : isWarning ? 'warning' : 'closed';
      var statusLabel = isOpen ? t('open') : isWarning ? t('warning') : t('closed');
      var bannerText = isOpen ? t('openToday') : isWarning ? t('warningToday') : t('closedToday');

      var nextText = '';
      if (isOpen && nextClosure) {
        nextText = t('nextClosure') + ' ' + formatDate(nextClosure.date);
      } else if (isWarning) {
        nextText = reasonText(status);
      } else if (isClosed) {
        var endDate = status.end;
        if (endDate) {
          nextText = reasonText(status) + ' ' + t('closedTil') + ' ' + formatDate(endDate);
        } else {
          nextText = reasonText(status);
        }
      }

      var photoUrl = market.photourl || '';
      var address = market.address_myenv || '';
      var marketStalls = parseInt(market.no_of_market_stalls, 10) || 0;
      var foodStalls = parseInt(market.no_of_food_stalls, 10) || 0;

      html += '<div class="market-card" data-market="' + escapeAttr(marketName) + '">';
      html += '<div class="card-summary">';
      if (photoUrl) {
        html += '<img class="card-thumb" src="' + escapeAttr(photoUrl) + '" alt="" loading="lazy">';
      }
      html += '<div class="card-info">';
      html += '<div class="card-name">' + escapeHtml(getDisplayName(parsed)) + '</div>';
      html += '<div class="card-next">' + escapeHtml(nextText) + '</div>';
      html += '</div>';
      html += '<div class="card-status ' + statusClass + '">' + statusLabel + '</div>';
      html += '</div>';

      // Expanded details
      html += '<div class="card-details">';

      // Info section: address + stalls
      html += '<div class="card-detail-section">';
      if (address) {
        html += '<div class="card-address">📍 ' + escapeHtml(address) + '</div>';
      }
      if (marketStalls > 0 || foodStalls > 0) {
        html += '<div class="card-stalls">';
        if (marketStalls > 0) {
          html += '<div class="card-stall-item"><span class="stall-count">🛒 ' + marketStalls + '</span><span class="stall-label">' + t('marketStalls') + '</span></div>';
        }
        if (foodStalls > 0) {
          html += '<div class="card-stall-item"><span class="stall-count">🍜 ' + foodStalls + '</span><span class="stall-label">' + t('foodStalls') + '</span></div>';
        }
        html += '</div>';
      }
      html += '</div>';

      // Closed banner (only for hard closures)
      if (isClosed) {
        html += '<div class="card-detail-section">';
        html += '<div class="card-status-banner closed">';
        html += '<div class="banner-status-text">' + t('closedToday') + '</div>';
        html += '<div class="banner-reason">' + escapeHtml(reasonText(status)) + '</div>';
        var nextOpen = getNextOpenDate(market, today);
        if (nextOpen) {
          html += '<div class="banner-opens-again">' + t('opensAgain') + ' ' + formatDate(nextOpen) + '</div>';
        }
        html += '</div>';
        html += '</div>';
      }

      // Upcoming closures section
      if (upcoming.length > 0) {
        html += '<div class="card-detail-section">';
        html += '<div class="upcoming-title">' + t('upcoming') + '</div>';
        html += '<ul class="upcoming-list">';
        var shown = Math.min(upcoming.length, 7);
        for (var j = 0; j < shown; j++) {
          html += '<li><span class="upcoming-date">' + formatDate(upcoming[j].date) + '</span>';
          html += '<span class="upcoming-reason">' + closureReasonShort(upcoming[j].reason, upcoming[j].remarks) + '</span></li>';
        }
        html += '</ul>';
        html += '</div>';
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
        var parsed = parseMarketName(m.name);
        var zh = (zhNames[parsed.friendly] || '').toLowerCase();
        return name.indexOf(q) !== -1 || addr.indexOf(q) !== -1 || zh.indexOf(q) !== -1;
      });
    }

    filtered.sort(function (a, b) {
      var parsedA = parseMarketName(a.name);
      var parsedB = parseMarketName(b.name);
      var nameA = getDisplayName(parsedA).toLowerCase();
      var nameB = getDisplayName(parsedB).toLowerCase();
      return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
    });

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var market = filtered[i];
      var parsed = parseMarketName(market.name);
      var isFav = favorites.indexOf(market.name) !== -1;

      var displayName = getDisplayName(parsed);
      html += '<li class="market-list-item' + (isFav ? ' favorited' : '') + '" data-market="' + escapeAttr(market.name) + '">';
      html += '<span class="star">' + (isFav ? '★' : '☆') + '</span>';
      html += '<div class="market-item-info">';
      html += '<div class="market-item-name">' + escapeHtml(displayName) + '</div>';
      if (lang === 'zh' && zhNames[parsed.friendly]) {
        html += '<div class="market-item-address">' + escapeHtml(parsed.friendly) + '</div>';
      } else if (parsed.street) {
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
