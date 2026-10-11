// sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCitVETsMx-5ax48t4UViBT8DyIMOiB0sM",
  authDomain: "zero-3dfef.firebaseapp.com",
  databaseURL: "https://zero-3dfef-default-rtdb.firebaseio.com",
  projectId: "zero-3dfef",
  storageBucket: "zero-3dfef.firebasestorage.app",
  messagingSenderId: "59219649844",
  appId: "1:59219649844:web:38546f1960e27abac83161"
});

const messaging = firebase.messaging();

// 백그라운드 푸시 메시지 수신 시 처리
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Caru Routine';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '루틴을 시작할 시간입니다.',
    icon: '/icon.png', // 앱 아이콘 경로
    badge: '/badge.png',
    tag: payload.data?.tag || 'caru-routine',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 탭(클릭)했을 때 앱 열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
