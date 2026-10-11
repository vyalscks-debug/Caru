const admin = require('firebase-admin');

// GitHub Secret에 넣은 서비스 계정 키 로드
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zero-3dfef-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function checkAndSendRoutines() {
  // 한국 시간(KST, UTC+9) 기준으로 현재 시각 계산
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 60 * 60000));

  const currentHours = String(kst.getHours()).padStart(2, '0');
  const currentMins = kst.getMinutes();
  const currentDay = kst.getDay(); // 0: 일요일, 1: 월요일, ...
  const todayStr = `${kst.getFullYear()}-${String(kst.getMonth()+1).padStart(2,'0')}-${String(kst.getDate()).padStart(2,'0')}`;

  console.log(`[스케줄러 실행] KST 현재 시각: ${currentHours}:${String(currentMins).padStart(2,'0')} (요일: ${currentDay})`);

  // 1. 등록된 푸시 토큰들 가져오기
  const tokensSnap = await db.ref('pushTokens').once('value');
  const tokensData = tokensSnap.val() || {};

  // 2. 유저별 루틴 데이터 확인
  const usersSnap = await db.ref('users').once('value');
  const usersData = usersSnap.val() || {};

  for (const [userId, user] of Object.entries(usersData)) {
    const tokenInfo = tokensData[userId];
    if (!tokenInfo || !tokenInfo.token) continue; // 토큰이 없으면 패스

    const routines = Array.isArray(user.routines) ? user.routines : [];
    const scheduleState = (user.routineScheduleState && user.routineScheduleState[todayStr]) || {};

    for (const routine of routines) {
      if (!routine || !routine.start) continue;
      if (!Array.isArray(routine.days) || !routine.days.includes(currentDay)) continue;

      const [rHour, rMin] = routine.start.split(':').map(Number);
      const startTotalMins = rHour * 60 + rMin;
      const currentTotalMins = kst.getHours() * 60 + currentMins;

      // 루틴 시작 시각으로부터 0 ~ 14분 사이일 때 (10~15분 주기 실행 감안)
      const diff = currentTotalMins - startTotalMins;
      const st = scheduleState[routine.id] || {};

      // 1) 시작 알림 (시작 후 0~10분 사이이고 아직 안 보냈을 때)
      if (diff >= 0 && diff < 10 && !st.firstNoticeSent) {
        console.log(`[알림 발송] ${userId} - ${routine.name} 시작 알림`);
        await admin.messaging().send({
          token: tokenInfo.token,
          notification: {
            title: `Time for ${routine.name || 'Routine'}`,
            body: `지금 루틴을 시작할 시간입니다! 10분 내로 시작해보세요.`
          }
        }).catch(e => console.error('FCM 전송 에러:', e));

        await db.ref(`users/${userId}/routineScheduleState/${todayStr}/${routine.id}/firstNoticeSent`).set(true);
      }

      // 2) 10분 지연 리마인더 (시작 후 10~20분 사이이고 아직 안 보냈으며, 시작도 안 눌렀을 때)
      if (diff >= 10 && diff < 20 && !st.followupSent && !st.started) {
        console.log(`[알림 발송] ${userId} - ${routine.name} 10분 리마인더`);
        await admin.messaging().send({
          token: tokenInfo.token,
          notification: {
            title: `Start ${routine.name || 'Routine'}`,
            body: `10분이 지났습니다. 지금 루틴을 시작해 보세요!`
          }
        }).catch(e => console.error('FCM 전송 에러:', e));

        await db.ref(`users/${userId}/routineScheduleState/${todayStr}/${routine.id}/followupSent`).set(true);
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
