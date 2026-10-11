const https = require('https');

const FIREBASE_DB_URL = "https://zero-3dfef-default-rtdb.firebaseio.com";
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY; // GitHub Secret에서 가져옴

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

function sendFCM(token, title, body, tag) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      to: token,
      notification: { title, body },
      data: { tag, title, body }
    });

    const req = https.request({
      hostname: 'fcm.googleapis.com',
      path: '/fcm/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let resData = '';
      res.on('data', c => resData += c);
      res.on('end', () => resolve(resData));
    });

    req.on('error', (e) => {
      console.error('FCM 전송 실패:', e.message);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

function parseHM(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

async function run() {
  if (!FCM_SERVER_KEY) {
    console.error("FCM_SERVER_KEY 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  // 한국 시간(KST) 구하기
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 3600000));

  const currentDow = kst.getDay();
  const currentMinutes = kst.getHours() * 60 + kst.getMinutes();

  console.log(`현재 KST 시각: ${String(kst.getHours()).padStart(2,'0')}:${String(kst.getMinutes()).padStart(2,'0')} (요일: ${currentDow})`);

  const [users, tokens] = await Promise.all([
    fetchJSON(`${FIREBASE_DB_URL}/users.json`),
    fetchJSON(`${FIREBASE_DB_URL}/pushTokens.json`)
  ]);

  if (!users || !tokens) {
    console.log("유저 또는 토큰 데이터가 없습니다.");
    return;
  }

  for (const [userId, userData] of Object.entries(users)) {
    const tokenObj = tokens[userId];
    if (!tokenObj || !tokenObj.token) continue;

    const routines = Array.isArray(userData.routines) ? userData.routines : [];

    for (const r of routines) {
      if (!Array.isArray(r.days) || !r.days.includes(currentDow)) continue;

      const routineStartMins = parseHM(r.start);
      if (isNaN(routineStartMins)) continue;

      // GitHub Actions 실행 오차(±5분) 고려: 현재 시각과 루틴 시각이 5분 이내일 때 발송
      const diff = currentMinutes - routineStartMins;
      if (diff >= 0 && diff < 10) {
        console.log(`[발송] 유저 ${userId} - ${r.name || '루틴'} (${r.start})`);
        await sendFCM(
          tokenObj.token,
          `Time for ${r.name || 'Routine'}`,
          `Your ${r.name || 'routine'} is scheduled now.`,
          `routine-${r.id}`
        );
      }
    }
  }
}

run();
