import webpush from 'web-push';
import type { PushSubscription } from 'web-push';

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // Use web-push to generate the encrypted request details, then send via fetch
  const requestDetails = webpush.generateRequestDetails(subscription, payload);

  const response = await fetch(requestDetails.endpoint, {
    method: requestDetails.method,
    headers: requestDetails.headers as Record<string, string>,
    body: requestDetails.body,
  });

  if (response.status === 410 || response.status === 404) {
    return false;
  }
  if (response.status >= 200 && response.status < 300) {
    return true;
  }
  const text = await response.text();
  throw new Error(`Push failed: ${response.status} ${text}`);
}
