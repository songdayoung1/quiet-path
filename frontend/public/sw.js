self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'QUIET PATH';
  const options = {
    body: payload.body || '오늘의 방향을 천천히 돌아볼 시간이에요.',
    icon: payload.icon || '/assets/mascot/mascot_3d_CALM.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || 'quiet-path-notification',
  };
  const notifyOpenClients = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => clients.forEach((client) => {
      client.postMessage({ type: 'QP_NOTIFICATION_RECEIVED' });
    }));
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    notifyOpenClients,
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
