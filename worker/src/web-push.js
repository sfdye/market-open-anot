import webpush from 'web-push';

export async function sendPushNotification(subscription, payload, vapidPublicKey, vapidPrivateKey, vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // Use web-push to generate the encrypted request details, then send via fetch
  const requestDetails = webpush.generateRequestDetails(subscription, payload);

  const response = await fetch(requestDetails.endpoint, {
    method: requestDetails.method,
    headers: requestDetails.headers,
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
