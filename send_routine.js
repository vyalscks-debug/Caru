const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zero-3dfef-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function checkAndSendRoutines() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 60 * 60000));

  const currentHours = kst.getHours();
  const currentMins = kst.getMinutes();
  const currentDay = kst.getDay();
  const todayStr = `${kst.getFullYear()}-${String(kst.getMonth()+1).padStart(2,'0')}-${String(kst.getDate()).padStart(2,'0')}`;

  console.log(`[스케줄러] KST: ${currentHours}:${String(currentMins).padStart(2,'0')} (${todayStr})`);

  const tokensSnap = await db.ref('pushTokens').once('value');
  const tokensData = tokensSnap.val() || {};

  const usersSnap = await db.ref('users').once('value');
  const usersData = usersSnap.val() || {};

  for (const [userId, user] of Object.entries(usersData)) {
    const tokenInfo = tokensData[userId];
    if (!tokenInfo || !tokenInfo.token) {
      console.log(`[스킵] ${userId} 토큰 없음`);
      continue;
    }

    const routines = Array.isArray(user.routines) ? user.routines : [];
    const scheduleState = (user.routineScheduleState && user.routineScheduleState[todayStr]) || {};

    for (const routine of routines) {
      if (!routine || !routine.start) continue;
      if (!Array.isArray(routine.days) || !routine.days.includes(currentDay)) continue;

      const [rHour, rMin] = routine.start.split(':').map(Number);
      const startTotalMins = rHour * 60 + rMin;
      const currentTotalMins = currentHours * 60 + currentMins;

      const diff = currentTotalMins - startTotalMins;
      const st = scheduleState[routine.id] || {};

      console.log(`루틴 확인: ${routine.name} (시작 ${routine.start}, 차이: ${diff}분)`);

      // 시작 시각으로부터 0 ~ 15분 이내
      if (diff >= 0 && diff <= 15 && !st.firstNoticeSent) {
        console.log(`[푸시 전송] ${routine.name} 시작 알림 -> ${userId}`);
        try {
          await admin.messaging().send({
            token: tokenInfo.token,
            notification: {
              title: `Time for ${routine.name || 'Routine'}`,
              body: `루틴 시작 시간입니다! 지금 시작해보세요.`
            }
          });
          await db.ref(`users/${userId}/routineScheduleState/${todayStr}/${routine.id}/firstNoticeSent`).set(true);
        } catch(e) {
          console.error('FCM 전송 실패:', e.message);
        }
      }
    }
  }
  console.log('[스케줄러 완료]');
  process.exit(0);
}

checkAndSendRoutines().catch(err => {
  console.error(err);
  process.exit(1);
});
