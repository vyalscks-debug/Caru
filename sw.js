// Caru PWA & Push Service Worker
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// 백그라운드 푸시 알림 직접 수신 (화면 꺼짐 대응)
self.addEventListener('push', (e) => {
  let title = 'Caru Routine';
  let body = '루틴 시작 시간입니다! 홈 화면에서 타이머를 확인하세요.';
  let data = {};

  if (e.data) {
    try {
      const json = e.data.json();
      if (json.notification) {
        title = json.notification.title || title;
        body = json.notification.body || body;
      }
      data = json.data || {};
    } catch (err) {
      body = e.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: 'icon.png',
    badge: 'icon.png',
    data: data,
    tag: 'caru-routine-push',
    renotify: true
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// 알림 탭했을 때 Caru 앱 열기
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
