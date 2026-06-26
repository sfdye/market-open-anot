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

  // Chinese names for well-known markets (keyed by friendly name from parseMarketName)
  var zhNames = {
    'Chinatown Complex Market': '牛车水大厦巴刹',
    'Tekka Centre/Zhu Jiao Market': '竹脚中心',
    'Tiong Bahru Market': '中峇鲁巴刹',
    'Geylang Serai Market': '芽笼士乃巴刹',
    'Maxwell Food Centre': '麦士威熟食中心',
    'Kim Hua Market': '金华巴刹',
    'Adam Road Food Centre': '亚当路熟食中心',
    'Newton Food Centre': '纽顿熟食中心',
    '51 Old Airport Road Food Centre and Shopping Mall': '旧机场路熟食中心',
    'Golden Mile Food Centre': '黄金坊熟食中心',
    'Chomp Chomp Food Centre': '忠忠熟食中心',
    'Albert Centre': '阿尔柏中心',
    'Berseh Food Centre': '马里士他熟食中心',
    'Zion Riverside Food Centre': '锡安河畔熟食中心',
    'Hong Lim Food Centre and Market': '芳林巴刹与熟食中心',
    "People's Park Food Centre": '珠江熟食中心',
    'Amoy Street Food Centre': '厦门街熟食中心',
    'Telok Ayer Food Centre': '直落亚逸熟食中心',
    'North Bridge Road Market': '桥北路巴刹',
    'ABC Brickworks Market/Food Centre': 'ABC砖厂巴刹与熟食中心',
    'Bukit Timah Market': '武吉知马巴刹',
    'Commonwealth Crescent Market': '联邦通道巴刹',
    'Tanglin Halt Market': '东陵福巴刹',
    'Holland Village Market and Food Centre': '荷兰村巴刹与熟食中心',
    'Holland Drive Market and Food Centre': '荷兰通道巴刹与熟食中心',
    'Ghim Moh Road Blk 20': '锦茂路第20座',
    'Clementi Ave 2 Market/Cooked Food Centre': '金文泰2道巴刹与熟食中心',
    'Taman Jurong Market and Food Centre': '淡滨尼花园巴刹与熟食中心',
    'Boon Lay Place Market and Food Village': '文礼坊巴刹与美食村',
    'Jurong West Hawker Centre': '裕廊西小贩中心',
    'Yuhua Market and Hawker Centre': '裕华巴刹与小贩中心',
    'Yuhua Village Market and Food Centre': '裕华村巴刹与熟食中心',
    'Bukit Merah Central Food Centre': '红山中心熟食中心',
    'Alexandra Village Food Centre': '亚历山大村熟食中心',
    'Redhill Market': '红山巴刹',
    'Redhill Food Centre': '红山熟食中心',
    'Telok Blangah Food Centre': '直落布兰雅熟食中心',
    'Telok Blangah Market': '直落布兰雅巴刹',
    'Beo Crescent Market': '庙弯巴刹',
    'Pek Kio Market and Food Centre': '北桥巴刹与熟食中心',
    'Bendemeer Market and Food Centre': '明地迷亚巴刹与熟食中心',
    'Whampoa Drive Makan Place/Whampoa Food Centre': '黄埔通道熟食中心',
    'Whampoa Drive Makan Place/Whampoa Market': '黄埔巴刹',
    'Toa Payoh West Market and Food Court': '大巴窑西巴刹与熟食中心',
    'Toa Payoh Vista Market': '大巴窑景巴刹',
    'Kim Keat Palm Market and Food Centre': '金吉巴刹与熟食中心',
    'Chong Boon Market and Food Centre': '松文巴刹与熟食中心',
    'Cheng San Market and Cooked Food Centre': '静山巴刹与熟食中心',
    'Kebun Baru Market and Food Centre': '宏茂桥巴刹与熟食中心',
    'Kebun Baru Food Centre': '宏茂桥熟食中心',
    'Mayflower Market': '美华巴刹',
    'Ang Mo Kio 628 Market': '宏茂桥628巴刹',
    'Blk 724 Ang Mo Kio Market': '宏茂桥724巴刹',
    'Teck Ghee Court': '德义苑',
    'Teck Ghee Square': '德义广场',
    'Shunfu Mart': '顺福商场',
    'Serangoon Garden Market': '实龙岗花园巴刹',
    'Chomp Chomp Food Centre': '忠忠熟食中心',
    'Hougang 105 Hainanese Village Centre': '后港105海南村中心',
    'Kovan Hougang Market and Food Centre': '高文后港巴刹与熟食中心',
    'Ci Yuan Hawker Centre': '慈缘小贩中心',
    'Bedok Food Centre': '勿洛熟食中心',
    'Bedok Interchange Hawker Centre': '勿洛转换站小贩中心',
    '85 Fengshan Centre': '85凤山中心',
    'Kaki Bukit 511 Market and Food Centre': '加基武吉511巴刹与熟食中心',
    'East Coast Lagoon Food Village': '东海岸美食村',
    'Dunman Food Centre': '敦曼熟食中心',
    'Marine Parade Central Blk 84': '马林百列中心第84座',
    'Changi Village Blk 2 and 3': '樟宜村第2和3座',
    'Pasir Ris Central Hawker Centre': '巴西立中心小贩中心',
    'The Hawker Centre @ Our Tampines Hub': '淡滨尼天地小贩中心',
    'Tampines Round Market and Food Centre': '淡滨尼圆巴刹与熟食中心',
    'Fernvale Hawker Centre and Market': '芬维尔小贩中心与巴刹',
    'Buangkok Hawker Centre': '万国小贩中心',
    'Senja Hawker Centre': '森雅小贩中心',
    'Bukit Panjang Hawker Centre and Market': '武吉班让小贩中心与巴刹',
    'Chong Pang Market and Food Centre': '忠邦巴刹与熟食中心',
    'Yishun Park Hawker Centre': '义顺公园小贩中心',
    'Kampung Admiralty Hawker Centre': '甘榜海军部小贩中心',
    'Marsiling Mall Hawker Centre': '马西岭商场小贩中心',
    'Woodleigh Village Hawker Centre': '兀里小贩中心',
    'One Punggol Hawker Centre': '榜鹅综合社区中心小贩中心',
    'Punggol Coast Hawker Centre': '榜鹅海岸小贩中心',
    'Anchorvale Village Hawker Centre': '安谷村小贩中心',
    'Margaret Drive Hawker Centre': '玛格烈通道小贩中心',
    'Bukit Canberra Hawker Centre': '武吉坎贝拉小贩中心',
    'Bukit Batok West Hawker Centre': '武吉巴督西小贩中心',
    'Market Street Hawker Centre': '市场街小贩中心',
    'Kallang Estate Fresh Market and Food Centre': '加冷鲜巴刹与熟食中心',
    'Empress Road Market and Food Centre': '女皇道巴刹与熟食中心',
    'Pasir Panjang Food Centre': '巴西班让熟食中心',
    'Haig Road Market and Cooked Food Centre': '海格路巴刹与熟食中心',
    'Sims Vista Market and Food Centre': '沈氏坊巴刹与熟食中心',
    'Havelock Road Cooked Food Centre': '合洛路熟食中心',
    'Blk 117 Aljunied Market and Food Centre': '阿裕尼117巴刹与熟食中心',
    'Blk 69 Geylang Bahru Market and Food Centre': '芽笼峇鲁69巴刹与熟食中心',
    '50A Marine Terrace': '马林台50A',
    'Teban Gardens Market and Food Centre': '德坂花园巴刹与熟食中心',
    '11 Telok Blangah Crescent Market and Food Centre': '直落布兰雅弯11巴刹与熟食中心',
    'Ayer Rajah Market': '亚逸拉惹巴刹',
    'Ayer Rajah Food Centre': '亚逸拉惹熟食中心',
    'Mei Chin Road Market': '美芹路巴刹',
    'Blk 6 Tanjong Pagar Plaza Market and Food Centre': '丹戎巴葛广场巴刹与熟食中心',
    'Kukoh 21 Food Centre': '库河21熟食中心',
    'Blk 4A Jalan Batu Hawker Centre/Market': '惹兰勿刹4A小贩中心',
    'Blk 17 Upper Boon Keng Market and Food Centre': '文庆路上段17巴刹与熟食中心',
    'Blk 115 Bukit Merah View Market and Food Centre': '红山景115巴刹与熟食中心',
    'Blk 112 Jalan Bukit Merah Market and Food Centre': '惹兰红山112巴刹与熟食中心',
    '80 Circuit Road Market and Food Centre': '切路80巴刹与熟食中心',
    '84 Marine Parade Central Market and Food Centre': '马林百列中心84巴刹与熟食中心',
    'Jalan Leban Food Centre': '惹兰里万熟食中心',
    'Sembawang Hills Food Centre': '三巴旺山熟食中心'
  };

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

      html += '<div class="market-card" data-market="' + escapeAttr(marketName) + '">';
      html += '<div class="card-summary">';
      html += '<div class="card-info">';
      html += '<div class="card-name">' + escapeHtml(getDisplayName(parsed)) + '</div>';
      html += '<div class="card-next">' + escapeHtml(nextText) + '</div>';
      html += '</div>';
      html += '<div class="card-status ' + statusClass + '">' + statusLabel + '</div>';
      html += '</div>';

      // Expanded details
      html += '<div class="card-details">';
      if (parsed.street) {
        html += '<div class="card-address">' + escapeHtml(parsed.street) + '</div>';
      }

      if (isClosed) {
        html += '<div class="card-status-banner closed">';
        html += '<div class="banner-status-text">' + t('closedToday') + '</div>';
        html += '<div class="banner-reason">' + escapeHtml(reasonText(status)) + '</div>';
        var nextOpen = getNextOpenDate(market, today);
        if (nextOpen) {
          html += '<div class="banner-opens-again">' + t('opensAgain') + ' ' + formatDate(nextOpen) + '</div>';
        }
        html += '</div>';
      }

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
