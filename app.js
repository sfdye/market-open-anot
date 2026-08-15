import { el } from "./dom.js";
import { getMarketStatus, getNextOpenDate, getUpcomingClosures as upcomingClosures, parseDateDMY, parseMarketName, QUARTERS, stripTime, } from "./market-logic.js";
import { zhNames } from "./zh-names.js";
import { isPushEnabled, isPushSupported, onFavoritesChanged, subscribeToPush, unsubscribeFromPush } from "./push.js";
import { isStandalone, showInstallPrompt } from "./install-prompt.js";
const API_URL = 'https://data.gov.sg/api/action/datastore_search?resource_id=d_bda4baa634dd1cc7a6c7cad5f19e2d68&limit=200';
const STORAGE = {
    favorites: 'moa_favorites',
    data: 'moa_data',
    fetched: 'moa_fetched',
    lang: 'moa_lang',
    reminderCardDismissed: 'moa_reminder_card_dismissed',
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
        nextClosure: 'Next closure:',
        upcoming: 'Upcoming Closures',
        weeklyRest: 'Most stalls closed',
        cleaning: 'Cleaning',
        otherWorks: 'Maintenance',
        marketStalls: 'market stalls',
        foodStalls: 'food stalls',
        dataSource: 'Data from <a href="https://data.gov.sg/datasets/d_bda4baa634dd1cc7a6c7cad5f19e2d68/view">NEA</a>',
        lastUpdated: 'Last updated:',
        addMarkets: '+ Add Markets',
        chooseMarkets: 'Choose Your Markets',
        tapToAdd: 'Tap to add your markets or hawker centres',
        search: 'Search...',
        done: 'Done',
        doneCount: 'Done ({n})',
        edit: 'Edit',
        doneEditing: 'Done',
        removeAllCount: 'Remove all ({n})',
        removeAllConfirm: 'Remove all markets from your list?',
        addFav: 'Add to favorites',
        removeFav: 'Remove from favorites',
        noFavorites: 'Tap the button below to add your markets or hawker centres',
        closedTil: 'til',
        langToggle: 'EN',
        reminderCardTitle: 'Get closure reminders',
        reminderCardDesc: 'Get a heads-up the day before a market you follow closes.',
        reminderBadge: 'Experimental',
        reminderEnable: 'Enable',
        reminderEnabling: 'Enabling…',
        reminderDismiss: 'Not now',
        reminderBlocked: 'Notifications are blocked. Enable them for this app in your device settings, then try again.',
        remindersOn: 'Reminders on',
        enableReminders: 'Enable reminders',
    },
    zh: {
        appTitle: '巴刹今天开吗？',
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
        upcoming: '近期不营业',
        weeklyRest: '多数摊位休息',
        cleaning: '清洁',
        otherWorks: '维修',
        marketStalls: '个巴刹摊位',
        foodStalls: '个熟食摊位',
        dataSource: '数据来源：<a href="https://data.gov.sg/datasets/d_bda4baa634dd1cc7a6c7cad5f19e2d68/view">国家环境局 (NEA)</a>',
        lastUpdated: '最后更新：',
        addMarkets: '+ 添加巴刹',
        chooseMarkets: '选择您的巴刹',
        tapToAdd: '点击添加您的巴刹或小贩中心',
        search: '搜索...',
        done: '完成',
        doneCount: '完成（{n}）',
        edit: '编辑',
        doneEditing: '完成',
        removeAllCount: '全部移除（{n}）',
        removeAllConfirm: '确定要移除列表中的所有巴刹吗？',
        addFav: '添加至收藏',
        removeFav: '从收藏移除',
        noFavorites: '点击下面的按钮添加您的巴刹或小贩中心',
        closedTil: '至',
        langToggle: '中文',
        reminderCardTitle: '开启休市提醒',
        reminderCardDesc: '您收藏的巴刹休市前一天，我们会提前通知您。',
        reminderBadge: '实验功能',
        reminderEnable: '开启',
        reminderEnabling: '开启中…',
        reminderDismiss: '以后再说',
        reminderBlocked: '通知已被封锁。请在设备设置中为此应用开启通知，然后再试一次。',
        remindersOn: '提醒已开启',
        enableReminders: '开启提醒',
    },
};
let allMarkets = [];
let favorites = [];
let lang = 'en';
let userLat = null;
let userLng = null;
let editMode = false;
function getUpcomingClosures(market, days) {
    return upcomingClosures(market, days, new Date());
}
function getNextCleaningDate(market, today) {
    const todayStripped = stripTime(today);
    const dates = [];
    for (const q of QUARTERS) {
        const start = parseDateDMY(market[`${q}_cleaningstartdate`]);
        if (start && start > todayStripped)
            dates.push(start);
    }
    const owStart = parseDateDMY(market.other_works_startdate);
    if (owStart && owStart > todayStripped)
        dates.push(owStart);
    dates.sort((a, b) => a.getTime() - b.getTime());
    return dates.length > 0 ? dates[0] : null;
}
function formatDate(date) {
    if (lang === 'zh') {
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        return `${date.getMonth() + 1}月${date.getDate()}日 (${dayNames[date.getDay()]})`;
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}
function formatDateLong(date) {
    if (lang === 'zh') {
        const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${dayNames[date.getDay()]}`;
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
function getDisplayName(parsed) {
    if (lang === 'zh') {
        return zhNames[parsed.friendly] || parsed.friendly;
    }
    return parsed.friendly;
}
function decodeHTML(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}
// ===== Data Layer =====
function loadFavorites() {
    try {
        const stored = localStorage.getItem(STORAGE.favorites);
        return stored ? JSON.parse(stored) : [];
    }
    catch {
        return [];
    }
}
function saveFavorites(favs) {
    localStorage.setItem(STORAGE.favorites, JSON.stringify(favs));
    if (isPushEnabled()) {
        void onFavoritesChanged();
    }
}
function loadCachedData() {
    try {
        const stored = localStorage.getItem(STORAGE.data);
        return stored ? JSON.parse(stored) : null;
    }
    catch {
        return null;
    }
}
function saveCachedData(data) {
    localStorage.setItem(STORAGE.data, JSON.stringify(data));
    localStorage.setItem(STORAGE.fetched, Date.now().toString());
}
function shouldRefresh() {
    const fetched = localStorage.getItem(STORAGE.fetched);
    if (!fetched)
        return true;
    const age = Date.now() - parseInt(fetched, 10);
    return age > 7 * 24 * 60 * 60 * 1000;
}
function fetchMarkets(callback) {
    const cached = loadCachedData();
    if (cached && cached.length > 0) {
        allMarkets = cached;
        callback();
        if (shouldRefresh()) {
            fetchFromAPI(() => { });
        }
        return;
    }
    fetchFromAPI(callback);
}
function fetchFromAPI(callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_URL);
    xhr.onload = () => {
        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.result && response.result.records) {
                    allMarkets = response.result.records;
                    saveCachedData(allMarkets);
                }
            }
            catch {
                // Malformed response — keep whatever we already had.
            }
        }
        callback();
    };
    xhr.onerror = () => {
        callback();
    };
    xhr.send();
}
// ===== Rendering =====
function t(key) {
    return strings[lang][key];
}
function reasonText(result) {
    if (result.status === 'open')
        return '';
    if (result.reason === 'monday')
        return t('reasonMonday');
    if (result.reason === 'cleaning')
        return t('reasonCleaning');
    return result.remarks ? decodeHTML(result.remarks) : t('otherWorks');
}
function closureReasonShort(reason, remarks) {
    if (reason === 'monday')
        return t('weeklyRest');
    if (reason === 'cleaning')
        return t('cleaning');
    return remarks ? decodeHTML(remarks) : t('otherWorks');
}
function showScreen(id) {
    document.querySelectorAll('.screen').forEach((screen) => {
        screen.classList.add('hidden');
    });
    el(id).classList.remove('hidden');
}
function renderStatusScreen() {
    const container = el('market-cards');
    const today = new Date();
    el('app-title').textContent = t('appTitle');
    el('today-date').textContent = formatDateLong(today);
    el('add-markets-btn').textContent = t('addMarkets');
    const fetched = localStorage.getItem(STORAGE.fetched);
    let lastUpdatedStr = '';
    if (fetched) {
        const fetchedDate = new Date(parseInt(fetched, 10));
        lastUpdatedStr = ` · ${t('lastUpdated')} ${formatDate(fetchedDate)}`;
    }
    el('data-source').innerHTML = t('dataSource') + lastUpdatedStr;
    renderReminderCard();
    updateStatusControls();
    if (favorites.length === 0) {
        container.innerHTML =
            '<div class="empty-state">' +
                `<p>${t('noFavorites')}</p>` +
                `<button id="empty-add-btn" class="btn-primary empty-add-btn">${t('addMarkets')}</button>` +
                '</div>';
        container.querySelector('#empty-add-btn')?.addEventListener('click', openPicker);
        return;
    }
    let html = '';
    for (const marketName of favorites) {
        const market = findMarket(marketName);
        if (!market)
            continue;
        const status = getMarketStatus(market, today);
        const parsed = parseMarketName(market.name);
        const isOpen = status.status === 'open';
        const isWarning = status.status === 'warning';
        const isClosed = status.status === 'closed';
        const upcoming = getUpcomingClosures(market, 30);
        const statusClass = isOpen ? 'open' : isWarning ? 'warning' : 'closed';
        const statusLabel = isOpen ? t('open') : isWarning ? t('warning') : t('closed');
        let nextText = '';
        if (isOpen || isWarning) {
            const nextCleaningDate = getNextCleaningDate(market, today);
            if (nextCleaningDate) {
                nextText = `${t('nextClosure')} ${formatDate(nextCleaningDate)}`;
            }
        }
        else if (isClosed) {
            const nextOpen = getNextOpenDate(market, today);
            if (nextOpen) {
                nextText = `${t('opensAgain')} ${formatDate(nextOpen)}`;
            }
        }
        const photoUrl = market.photourl || '';
        const address = market.address_myenv || '';
        const marketStalls = parseInt(market.no_of_market_stalls ?? '', 10) || 0;
        const foodStalls = parseInt(market.no_of_food_stalls ?? '', 10) || 0;
        html += `<div class="market-card" data-market="${escapeAttr(marketName)}">`;
        html += '<div class="card-summary">';
        html += `<button class="card-remove-inline" data-market="${escapeAttr(marketName)}" aria-label="${escapeAttr(t('removeFav'))}">−</button>`;
        if (photoUrl) {
            html += `<img class="card-thumb" src="${escapeAttr(photoUrl)}" alt="" loading="lazy">`;
        }
        html += '<div class="card-info">';
        html += `<div class="card-name">${escapeHtml(getDisplayName(parsed))}</div>`;
        html += `<div class="card-next">${escapeHtml(nextText)}</div>`;
        html += '</div>';
        html += `<div class="card-status ${statusClass}">${statusLabel}</div>`;
        html += '</div>';
        // Expanded details
        html += '<div class="card-details">';
        // Info section: address + stalls
        html += '<div class="card-detail-section">';
        if (address) {
            html += `<div class="card-address">📍 ${escapeHtml(address)}</div>`;
        }
        if (marketStalls > 0 || foodStalls > 0) {
            html += '<div class="card-stalls">';
            if (marketStalls > 0) {
                html += `<div class="card-stall-item"><span class="stall-count">🛒 ${marketStalls}</span><span class="stall-label">${t('marketStalls')}</span></div>`;
            }
            if (foodStalls > 0) {
                html += `<div class="card-stall-item"><span class="stall-count">🍜 ${foodStalls}</span><span class="stall-label">${t('foodStalls')}</span></div>`;
            }
            html += '</div>';
        }
        html += '</div>';
        // Closed banner (only for hard closures)
        if (isClosed) {
            html += '<div class="card-detail-section">';
            html += '<div class="card-status-banner closed">';
            html += `<div class="banner-status-text">${t('closedToday')}</div>`;
            html += `<div class="banner-reason">${escapeHtml(reasonText(status))}</div>`;
            const nextOpen = getNextOpenDate(market, today);
            if (nextOpen) {
                html += `<div class="banner-opens-again">${t('opensAgain')} ${formatDate(nextOpen)}</div>`;
            }
            html += '</div>';
            html += '</div>';
        }
        // Upcoming closures section
        if (upcoming.length > 0) {
            html += '<div class="card-detail-section">';
            html += `<div class="upcoming-title">${t('upcoming')}</div>`;
            html += '<ul class="upcoming-list">';
            for (const closure of upcoming.slice(0, 3)) {
                html += `<li><span class="upcoming-date">${formatDate(closure.date)}</span>`;
                html += `<span class="upcoming-reason">${closureReasonShort(closure.reason, closure.remarks)}</span></li>`;
            }
            html += '</ul>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
    container.querySelectorAll('.market-card').forEach((card) => {
        card.querySelector('.card-summary')?.addEventListener('click', () => {
            if (editMode)
                return;
            card.classList.toggle('expanded');
        });
    });
    // Inline remove (edit mode) drops a single market
    container.querySelectorAll('.card-remove-inline').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeMarket(btn.getAttribute('data-market'));
        });
    });
}
function removeMarket(name) {
    favorites = favorites.filter((f) => f !== name);
    saveFavorites(favorites);
    renderStatusScreen();
}
function openPicker() {
    editMode = false;
    showScreen('picker-screen');
    renderPickerScreen();
}
function openStatus() {
    showScreen('status-screen');
    renderStatusScreen();
}
// Toggle the Edit / Remove-all controls and body state to match editMode + favorites.
// Owns the invariant that edit mode is only valid while there are favorites.
function updateStatusControls() {
    const editBtn = el('edit-btn');
    const addBtn = el('add-markets-btn');
    const removeAllBtn = el('remove-all-btn');
    const hasFavorites = favorites.length > 0;
    editMode = editMode && hasFavorites;
    editBtn.textContent = editMode ? t('doneEditing') : t('edit');
    editBtn.classList.toggle('hidden', !hasFavorites);
    // Empty state carries its own add button, so hide the footer entirely
    el('status-footer').classList.toggle('hidden', !hasFavorites);
    removeAllBtn.textContent = t('removeAllCount').replace('{n}', String(favorites.length));
    addBtn.classList.toggle('hidden', editMode);
    removeAllBtn.classList.toggle('hidden', !editMode);
    el('status-screen').classList.toggle('editing', editMode);
}
function distanceBetween(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function getMarketDistance(market) {
    if (userLat === null || userLng === null)
        return null;
    const lat = parseFloat(market.latitude_hc ?? '');
    const lng = parseFloat(market.longitude_hc ?? '');
    if (isNaN(lat) || isNaN(lng))
        return null;
    return distanceBetween(userLat, userLng, lat, lng);
}
function requestGeolocation() {
    if (!navigator.geolocation)
        return;
    navigator.geolocation.getCurrentPosition((pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        renderMarketList(el('search-input').value);
    }, () => { }, { timeout: 5000, maximumAge: 300000 });
}
function renderPickerScreen() {
    el('picker-title').textContent = t('chooseMarkets');
    el('picker-subtitle').textContent = t('tapToAdd');
    el('search-input').placeholder = t('search');
    el('done-btn').textContent = t('done');
    // Always reset to list view
    if (mapView) {
        mapView = false;
        el('market-list').classList.remove('hidden');
        el('market-map').classList.add('hidden');
        el('view-toggle').classList.remove('active');
        el('view-toggle').textContent = '🗺️';
    }
    renderMarketList('');
    updateDoneButton();
    requestGeolocation();
}
function renderMarketList(query) {
    const list = el('market-list');
    let filtered = allMarkets;
    if (query) {
        const q = query.toLowerCase();
        filtered = allMarkets.filter((m) => {
            const name = (m.name || '').toLowerCase();
            const addr = (m.address_myenv || '').toLowerCase();
            const parsed = parseMarketName(m.name);
            const zh = (zhNames[parsed.friendly] || '').toLowerCase();
            return name.indexOf(q) !== -1 || addr.indexOf(q) !== -1 || zh.indexOf(q) !== -1;
        });
    }
    if (userLat !== null && userLng !== null) {
        filtered.sort((a, b) => {
            const distA = getMarketDistance(a);
            const distB = getMarketDistance(b);
            if (distA === null && distB === null)
                return 0;
            if (distA === null)
                return 1;
            if (distB === null)
                return -1;
            return distA - distB;
        });
    }
    else {
        filtered.sort((a, b) => {
            const nameA = getDisplayName(parseMarketName(a.name)).toLowerCase();
            const nameB = getDisplayName(parseMarketName(b.name)).toLowerCase();
            return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
        });
    }
    let html = '';
    for (const market of filtered) {
        const parsed = parseMarketName(market.name);
        const isFav = favorites.indexOf(market.name) !== -1;
        const displayName = getDisplayName(parsed);
        const dist = getMarketDistance(market);
        let distText = '';
        if (dist !== null) {
            distText = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
        }
        html += `<li class="market-list-item${isFav ? ' favorited' : ''}" data-market="${escapeAttr(market.name)}">`;
        html += `<span class="star">${isFav ? '★' : '☆'}</span>`;
        html += '<div class="market-item-info">';
        html += `<div class="market-item-name">${escapeHtml(displayName)}</div>`;
        if (distText) {
            html += `<div class="market-item-address">${distText}</div>`;
        }
        else if (lang === 'zh' && zhNames[parsed.friendly]) {
            html += `<div class="market-item-address">${escapeHtml(parsed.friendly)}</div>`;
        }
        else if (parsed.street) {
            html += `<div class="market-item-address">${escapeHtml(parsed.street)}</div>`;
        }
        html += '</div>';
        html += '</li>';
    }
    list.innerHTML = html;
    list.querySelectorAll('.market-list-item').forEach((item) => {
        item.addEventListener('click', () => {
            const name = item.getAttribute('data-market');
            if (name === null)
                return;
            toggleFavorite(name);
            item.classList.toggle('favorited');
            const star = item.querySelector('.star');
            if (star)
                star.textContent = favorites.indexOf(name) !== -1 ? '★' : '☆';
            updateDoneButton();
        });
    });
}
function toggleFavorite(name) {
    const idx = favorites.indexOf(name);
    if (idx === -1) {
        favorites.push(name);
    }
    else {
        favorites.splice(idx, 1);
    }
    saveFavorites(favorites);
}
function updateDoneButton() {
    const btn = el('done-btn');
    // Always visible so users have a clear confirm-and-return action,
    // even after scrolling the header (with the back button) off-screen.
    btn.classList.remove('hidden');
    btn.textContent =
        favorites.length > 0 ? t('doneCount').replace('{n}', String(favorites.length)) : t('done');
}
// ===== Map View =====
let mapInstance = null;
let mapView = false;
function toggleMapView() {
    mapView = !mapView;
    const list = el('market-list');
    const mapEl = el('market-map');
    const toggleBtn = el('view-toggle');
    if (mapView) {
        list.classList.add('hidden');
        mapEl.classList.remove('hidden');
        toggleBtn.classList.add('active');
        toggleBtn.textContent = '📋';
        initMap();
    }
    else {
        list.classList.remove('hidden');
        mapEl.classList.add('hidden');
        toggleBtn.classList.remove('active');
        toggleBtn.textContent = '🗺️';
    }
    updateDoneButton();
}
function initMap() {
    if (mapInstance) {
        mapInstance.invalidateSize();
        return;
    }
    const map = L.map('market-map').setView([1.3521, 103.8198], 12);
    mapInstance = map;
    L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 11,
        attribution: 'OneMap | &copy; <a href="https://www.sla.gov.sg">Singapore Land Authority</a>',
    }).addTo(map);
    const favIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });
    const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });
    allMarkets.forEach((market) => {
        const lat = parseFloat(market.latitude_hc ?? '');
        const lng = parseFloat(market.longitude_hc ?? '');
        if (isNaN(lat) || isNaN(lng))
            return;
        const displayName = getDisplayName(parseMarketName(market.name));
        const isFav = favorites.indexOf(market.name) !== -1;
        const marker = L.marker([lat, lng], { icon: isFav ? favIcon : defaultIcon }).addTo(map);
        function popupHtml(fav) {
            return (`<strong>${escapeHtml(displayName)}</strong><br>` +
                `<button class="map-fav-btn" data-market="${escapeAttr(market.name)}">` +
                `${fav ? `★ ${t('removeFav')}` : `☆ ${t('addFav')}`}</button>`);
        }
        marker.bindPopup(popupHtml(isFav));
        marker.on('popupopen', () => {
            const btn = document.querySelector(`.map-fav-btn[data-market="${CSS.escape(market.name)}"]`);
            if (!btn)
                return;
            btn.addEventListener('click', () => {
                toggleFavorite(market.name);
                const fav = favorites.indexOf(market.name) !== -1;
                updateDoneButton();
                marker.setIcon(fav ? favIcon : defaultIcon);
                marker.setPopupContent(popupHtml(fav));
                marker.openPopup();
            });
        });
    });
    if (userLat !== null && userLng !== null) {
        L.circleMarker([userLat, userLng], {
            radius: 8,
            color: '#4285f4',
            fillColor: '#4285f4',
            fillOpacity: 0.8,
        })
            .addTo(map)
            .bindPopup('You are here');
        map.setView([userLat, userLng], 14);
    }
}
function findMarket(name) {
    for (const market of allMarkets) {
        if (market.name === name)
            return market;
    }
    return null;
}
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// ===== i18n =====
function loadLang() {
    return localStorage.getItem(STORAGE.lang) === 'zh' ? 'zh' : 'en';
}
function langToggleLabel() {
    return lang === 'en' ? strings.zh.langToggle : strings.en.langToggle;
}
function setLang(newLang) {
    lang = newLang;
    localStorage.setItem(STORAGE.lang, lang);
    el('lang-toggle').textContent = langToggleLabel();
    el('lang-toggle-picker').textContent = langToggleLabel();
}
// ===== Init =====
function init() {
    lang = loadLang();
    favorites = loadFavorites();
    el('lang-toggle').textContent = langToggleLabel();
    el('lang-toggle-picker').textContent = langToggleLabel();
    fetchMarkets(() => {
        // Clean up favorites that no longer exist in data
        favorites = favorites.filter((f) => findMarket(f) !== null);
        saveFavorites(favorites);
        if (favorites.length > 0) {
            openStatus();
        }
        else {
            showScreen('picker-screen');
            renderPickerScreen();
        }
    });
    // Event: Add Markets button
    el('add-markets-btn').addEventListener('click', openPicker);
    // Event: Edit toggle — inline remove buttons already exist in the DOM,
    // so a control refresh (which flips #status-screen.editing) is enough.
    el('edit-btn').addEventListener('click', () => {
        editMode = !editMode;
        updateStatusControls();
    });
    // Event: Remove all
    el('remove-all-btn').addEventListener('click', () => {
        if (!confirm(t('removeAllConfirm')))
            return;
        favorites = [];
        saveFavorites(favorites);
        renderStatusScreen();
    });
    // Event: Done button
    el('done-btn').addEventListener('click', () => {
        openStatus();
        showInstallPrompt();
    });
    // Event: Back button — always available exit from the picker
    el('back-btn').addEventListener('click', openStatus);
    // Event: Search input
    el('search-input').addEventListener('input', (e) => {
        renderMarketList(e.target.value);
    });
    // Event: Map view toggle
    el('view-toggle').addEventListener('click', () => {
        toggleMapView();
    });
    // Event: Language toggles
    function handleLangToggle() {
        setLang(lang === 'en' ? 'zh' : 'en');
        const currentScreen = document.querySelector('.screen:not(.hidden)');
        if (currentScreen && currentScreen.id === 'status-screen') {
            renderStatusScreen();
        }
        else {
            renderPickerScreen();
        }
    }
    el('lang-toggle').addEventListener('click', handleLangToggle);
    el('lang-toggle-picker').addEventListener('click', handleLangToggle);
    // Reminders: header bell + promo card (only when app is installed and push is supported)
    const reminderBtn = el('reminder-btn');
    if (remindersAvailable()) {
        reminderBtn.classList.remove('hidden');
        updateReminderBtn();
        reminderBtn.addEventListener('click', () => void toggleReminders());
        el('reminder-enable-btn').addEventListener('click', () => void toggleReminders());
        el('reminder-dismiss-btn').addEventListener('click', () => {
            localStorage.setItem(STORAGE.reminderCardDismissed, 'true');
            renderReminderCard();
        });
    }
}
function remindersAvailable() {
    return isPushSupported() && isStandalone();
}
let reminderBusy = false;
async function toggleReminders() {
    if (reminderBusy)
        return;
    reminderBusy = true;
    setReminderBusyUI(true);
    try {
        if (isPushEnabled()) {
            await unsubscribeFromPush();
        }
        else {
            await enableReminders();
        }
    }
    finally {
        reminderBusy = false;
        setReminderBusyUI(false);
        updateReminderBtn();
        renderReminderCard();
    }
}
function setReminderBusyUI(busy) {
    const btn = el('reminder-btn');
    const enableBtn = el('reminder-enable-btn');
    const dismissBtn = el('reminder-dismiss-btn');
    btn.disabled = busy;
    btn.classList.toggle('busy', busy);
    enableBtn.disabled = busy;
    dismissBtn.disabled = busy;
    // Only show "Enabling…" while turning reminders on
    if (busy && !isPushEnabled()) {
        enableBtn.textContent = t('reminderEnabling');
    }
}
async function enableReminders() {
    const ok = await subscribeToPush();
    if (!ok && typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        alert(t('reminderBlocked'));
    }
    return ok;
}
function renderReminderCard() {
    const card = el('reminder-card');
    const dismissed = localStorage.getItem(STORAGE.reminderCardDismissed) === 'true';
    const show = remindersAvailable() && !isPushEnabled() && !dismissed && favorites.length > 0;
    if (!show) {
        card.classList.add('hidden');
        return;
    }
    el('reminder-card-title').textContent = t('reminderCardTitle');
    el('reminder-card-desc').textContent = t('reminderCardDesc');
    el('reminder-card-badge').textContent = t('reminderBadge');
    el('reminder-enable-btn').textContent = t('reminderEnable');
    el('reminder-dismiss-btn').textContent = t('reminderDismiss');
    card.classList.remove('hidden');
}
function updateReminderBtn() {
    const btn = el('reminder-btn');
    if (isPushEnabled()) {
        btn.textContent = '🔔';
        btn.classList.add('active');
        btn.title = t('remindersOn');
    }
    else {
        btn.textContent = '🔕';
        btn.classList.remove('active');
        btn.title = t('enableReminders');
    }
}
// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else {
    init();
}
