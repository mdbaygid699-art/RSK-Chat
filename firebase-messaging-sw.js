/* RSK Chat - Firebase Messaging Service Worker (v2) */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD05kawEaOVRFNnwDN--fKJzlnSnk-o_CY",
  authDomain: "toxic-earning-60302.firebaseapp.com",
  databaseURL: "https://toxic-earning-60302-default-rtdb.firebaseio.com",
  projectId: "toxic-earning-60302",
  storageBucket: "toxic-earning-60302.firebasestorage.app",
  messagingSenderId: "151497989358",
  appId: "1:151497989358:web:e722ecf152c1d48f5ae7ff",
  measurementId: "G-R0714CXGKQ"
});

const messaging = firebase.messaging();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* Data-only push (server theke): title, body, cid, icon, sender */
messaging.onBackgroundMessage(payload => {
  if (payload && payload.notification) return; // browser nijei dekhabe
  const d = (payload && payload.data) || {};
  return self.registration.showNotification(d.title || 'RSK Chat', {
    body: d.body || 'New message',
    icon: d.icon || undefined,
    badge: d.badge || undefined,
    tag: d.call === '1' ? 'rsk-call' : (d.cid ? 'rsk-' + d.cid : 'rsk-msg'),
    renotify: true,
    requireInteraction: d.call === '1',
    timestamp: Date.now(),
    vibrate: d.call === '1' ? [300, 150, 300, 150, 300, 150, 300] : [120, 60, 120, 60, 220],
    actions: [
      { action: 'open', title: '💬 Open' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ],
    data: { cid: d.cid || '' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const cid = event.notification.data && event.notification.data.cid;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) {
        await w.focus();
        if (cid) w.postMessage({ type: 'RSK_OPEN_CHAT', cid });
        return;
      }
    }
    await self.clients.openWindow('./' + (cid ? '?cid=' + encodeURIComponent(cid) : ''));
  })());
});
