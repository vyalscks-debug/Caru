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

// 백그라운드 상태(앱 닫힘 등)에서 푸시 수신 시 시스템 알림 표시
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);
  
  const title = payload.notification?.title || 'Caru';
  const options = {
    body: payload.notification?.body || '루틴 알림이 도착했습니다.',
    icon: '/icon.png', // 필요시 아이콘 경로
    data: payload.data
  };

  self.registration.showNotification(title, options);
});
