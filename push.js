(function () {
  'use strict';

  var WORKER_URL = 'https://market-open-anot-push.tsfdye.workers.dev';
  var STORAGE_KEY = 'moa_push_enabled';

  function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function isPushEnabled() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function setPushEnabled(val) {
    localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
  }

  async function getVapidPublicKey() {
    var res = await fetch(WORKER_URL + '/vapid-public-key');
    var data = await res.json();
    return data.key;
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function subscribeToPush() {
    try {
      var permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      var reg = await navigator.serviceWorker.ready;
      var vapidKey = await getVapidPublicKey();
      var subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await syncSubscription(subscription);
      setPushEnabled(true);
      return true;
    } catch (e) {
      console.error('Push subscription failed:', e);
      return false;
    }
  }

  async function unsubscribeFromPush() {
    try {
      var reg = await navigator.serviceWorker.ready;
      var subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch(WORKER_URL + '/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
      return true;
    } catch (e) {
      console.error('Push unsubscribe failed:', e);
      return false;
    }
  }

  async function syncSubscription(subscription) {
    if (!subscription) {
      var reg = await navigator.serviceWorker.ready;
      subscription = await reg.pushManager.getSubscription();
    }
    if (!subscription) return;

    var favorites = [];
    try {
      favorites = JSON.parse(localStorage.getItem('moa_favorites') || '[]');
    } catch (e) {}

    await fetch(WORKER_URL + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        markets: favorites,
      }),
    });
  }

  // Auto-sync when favorites change (called from app.js)
  async function onFavoritesChanged() {
    if (!isPushEnabled()) return;
    try {
      await syncSubscription();
    } catch (e) {}
  }

  // Expose globally
  window.MarketPush = {
    isPushSupported: isPushSupported,
    isPushEnabled: isPushEnabled,
    subscribeToPush: subscribeToPush,
    unsubscribeFromPush: unsubscribeFromPush,
    onFavoritesChanged: onFavoritesChanged,
    setWorkerUrl: function (url) { WORKER_URL = url; },
  };
})();
