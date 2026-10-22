/**
 * 사단법인 고래 홈페이지 문의 접수 스크립트
 *
 * 홈페이지 문의 양식에서 보낸 내용을 이 스프레드시트에 한 줄씩 저장하고,
 * 아래 NOTIFY_EMAIL 주소로 알림 메일을 보냅니다.
 *
 * 설치: script.google.com 에서 새 프로젝트를 만들어 이 코드를 붙여넣고
 *       배포 > 새 배포 > 유형 "웹 앱" (실행: 나, 액세스: 모든 사용자) 로 배포합니다.
 */

// 문의를 저장할 스프레드시트 ID ("사단법인 고래 홈페이지 문의")
const SHEET_ID = '1Jj4p-DVekGlqYcfD3wO7LiilUJKYO0BXYwjzEKcQsc8';

// 문의 알림을 받을 메일 주소 (여러 개면 쉼표로 구분)
const NOTIFY_EMAIL = 'wwwhhh.kor@gmail.com';

// 입력값 최대 길이 (너무 긴 스팸 방지)
const MAX_LEN = { type: 40, name: 60, phone: 40, msg: 3000, page: 200 };

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // 봇이 채우는 숨은 칸에 값이 있으면 조용히 무시
    if (data.website) return reply_({ ok: true });

    const v = {};
    for (const key in MAX_LEN) v[key] = clean_(data[key], MAX_LEN[key]);
    if (!v.name || !v.msg) return reply_({ ok: false, error: '이름과 내용을 입력해 주세요.' });
    if (data.agree !== true) return reply_({ ok: false, error: '개인정보 수집·이용에 동의해 주세요.' });

    lock.waitLock(10000);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    sheet.appendRow([new Date(), v.type, v.name, v.phone, v.msg, v.page]);

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: '[고래 홈페이지 문의] ' + (v.type || '문의') + ' - ' + v.name,
      body:
        '홈페이지로 새 문의가 들어왔습니다.\n\n' +
        '문의 유형: ' + v.type + '\n' +
        '이름: ' + v.name + '\n' +
        '연락처: ' + (v.phone || '(없음)') + '\n' +
        '보낸 페이지: ' + v.page + '\n\n' +
        '내용:\n' + v.msg + '\n\n' +
        '전체 문의 목록: ' + SpreadsheetApp.openById(SHEET_ID).getUrl()
    });

    return reply_({ ok: true });
  } catch (err) {
    console.error(err);
    return reply_({ ok: false, error: '접수 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// 주소로 직접 열었을 때 동작 확인용
function doGet() {
  return reply_({ ok: true, message: '고래 문의 접수 스크립트가 작동 중입니다.' });
}

function clean_(value, max) {
  let s = String(value == null ? '' : value).trim().slice(0, max);
  // 시트에서 수식으로 실행되지 않도록 = + - @ 로 시작하면 앞에 ' 를 붙임
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
