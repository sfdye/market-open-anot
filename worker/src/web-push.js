export async function sendPushNotification(subscription, payload, vapidPublicKey, vapidPrivateKey, vapidSubject) {
  const endpoint = subscription.endpoint;
  const url = new URL(endpoint);

  const vapidHeaders = await generateVAPIDHeaders(
    url.origin,
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  const payloadBytes = new TextEncoder().encode(payload);
  const encrypted = await encryptPayload(
    payloadBytes,
    subscription.keys.p256dh,
    subscription.keys.auth
  );

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeaders.authorization,
      'TTL': '86400',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      ...vapidHeaders.extraHeaders,
    },
    body: encrypted,
  });

  // 201 = success, 410/404 = subscription expired
  if (response.status === 410 || response.status === 404) {
    return false;
  }
  return response.status >= 200 && response.status < 300;
}

export async function generateVAPIDHeaders(audience, subject, publicKeyBase64, privateKeyBase64) {
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = base64urlDecode(privateKeyBase64);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    convertECPrivateKeyToPKCS8(privateKeyBytes),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64urlEncodeBuffer(convertDERtoRaw(new Uint8Array(signature)));
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${publicKeyBase64}`,
    extraHeaders: {},
  };
}

async function encryptPayload(payload, p256dhBase64, authBase64) {
  const clientPublicKey = base64urlDecode(p256dhBase64);
  const authSecret = base64urlDecode(authBase64);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    localKeyPair.privateKey,
    256
  );

  // HKDF to derive IKM
  const authInfo = new TextEncoder().encode('WebPush: info\x00');
  const authInfoFull = concat(authInfo, new Uint8Array(clientPublicKey), localPublicKeyBytes);
  const ikm = await hkdf(new Uint8Array(sharedSecret), authSecret, authInfoFull, 32);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive content encryption key and nonce
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\x00');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\x00');
  const cek = await hkdf(ikm, salt, cekInfo, 16);
  const nonce = await hkdf(ikm, salt, nonceInfo, 12);

  // Pad payload
  const paddedPayload = concat(payload, new Uint8Array([2]));

  // Encrypt
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    paddedPayload
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const idlen = new Uint8Array([65]);

  return concat(salt, rs, idlen, localPublicKeyBytes, new Uint8Array(encrypted));
}

async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));
  const infoKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoWithCounter = concat(info, new Uint8Array([1]));
  const result = new Uint8Array(await crypto.subtle.sign('HMAC', infoKey, infoWithCounter));
  return result.slice(0, length);
}

function concat(...arrays) {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(new Uint8Array(arr.buffer || arr), offset);
    offset += arr.byteLength;
  }
  return result;
}

function base64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlEncodeBuffer(buffer) {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function convertECPrivateKeyToPKCS8(rawKey) {
  // Wrap raw 32-byte EC private key in PKCS8 DER structure
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  // For simplicity, just wrap the raw key
  return concat(pkcs8Header, rawKey).buffer;
}

function convertDERtoRaw(der) {
  // ECDSA signature from WebCrypto is in DER format, convert to raw (r||s)
  // DER: 0x30 len 0x02 rlen r 0x02 slen s
  if (der[0] !== 0x30) return der;
  let offset = 2;
  if (der[offset] !== 0x02) return der;
  const rLen = der[offset + 1];
  offset += 2;
  let r = der.slice(offset, offset + rLen);
  offset += rLen;
  if (der[offset] !== 0x02) return der;
  const sLen = der[offset + 1];
  offset += 2;
  let s = der.slice(offset, offset + sLen);

  // Trim leading zeros and pad to 32 bytes
  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);
  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}
