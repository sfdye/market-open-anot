const WORKER_URL = 'https://market-open-anot-push.tsfdye.workers.dev';
const STORAGE_KEY = 'moa_push_enabled';
export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
export function isPushEnabled() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
}
function setPushEnabled(val) {
    localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
}
async function getVapidPublicKey() {
    const res = await fetch(`${WORKER_URL}/vapid-public-key`);
    const data = (await res.json());
    return data.key;
}
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
export async function subscribeToPush() {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted')
            return false;
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = await getVapidPublicKey();
        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        await syncSubscription(subscription);
        setPushEnabled(true);
        return true;
    }
    catch (e) {
        console.error('Push subscription failed:', e);
        setPushEnabled(false);
        return false;
    }
}
export async function unsubscribeFromPush() {
    try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
            await fetch(`${WORKER_URL}/unsubscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
            await subscription.unsubscribe();
        }
        setPushEnabled(false);
        return true;
    }
    catch (e) {
        console.error('Push unsubscribe failed:', e);
        return false;
    }
}
async function syncSubscription(subscription) {
    let sub = subscription;
    if (!sub) {
        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.getSubscription();
    }
    if (!sub)
        throw new Error('No push subscription available');
    let favorites = [];
    try {
        favorites = JSON.parse(localStorage.getItem('moa_favorites') || '[]');
    }
    catch {
        // Corrupt cache — subscribe with no markets rather than failing outright.
    }
    const lang = localStorage.getItem('moa_lang') || 'en';
    const res = await fetch(`${WORKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), markets: favorites, lang }),
    });
    if (!res.ok) {
        throw new Error(`Subscribe request failed: ${res.status}`);
    }
}
/** Re-sends the favourites list so the worker knows which closures to push. */
export async function onFavoritesChanged() {
    if (!isPushEnabled())
        return;
    try {
        await syncSubscription();
    }
    catch {
        // Best-effort; the next favourites change or re-subscribe will retry.
    }
}
