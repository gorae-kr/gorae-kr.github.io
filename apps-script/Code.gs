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

    // 회원가입 신청서는 '회원가입' 탭에 따로 저장
    if (data.kind === 'member') return saveMember_(data, lock);

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

// 회원가입 신청서 저장 (사단법인 고래 회원가입 신청서 항목)
const MEMBER_SHEET = '회원가입';
const MEMBER_HEADER = ['접수일시', '성명', '생년월일', '연락처', '이메일', '주소', '활동 희망 지역',
                       '개인정보 수집·이용 동의', '동의 일시', '이사회 승인', '비고'];
const MEMBER_LEN = { name: 60, birth: 10, phone: 40, email: 120, address: 300, branch: 40 };

function saveMember_(data, lock) {
  const m = {};
  for (const key in MEMBER_LEN) m[key] = clean_(data[key], MEMBER_LEN[key]);
  if (!m.name || !m.birth || !m.phone || !m.email || !m.address) {
    return reply_({ ok: false, error: '성명, 생년월일, 연락처, 이메일, 주소를 모두 입력해 주세요.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.birth)) return reply_({ ok: false, error: '생년월일을 다시 확인해 주세요.' });
  if (data.agree !== true) return reply_({ ok: false, error: '개인정보 수집·이용에 동의해 주세요.' });

  lock.waitLock(10000);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(MEMBER_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(MEMBER_SHEET);
    sheet.appendRow(MEMBER_HEADER);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date(), m.name, m.birth, m.phone, m.email, m.address, m.branch,
                   '동의함', clean_(data.consentAt, 40), '', '']);

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '[고래 회원가입 신청] ' + m.name,
    body:
      '홈페이지로 새 회원가입 신청서가 들어왔습니다.\n\n' +
      '성명: ' + m.name + '\n' +
      '생년월일: ' + m.birth + '\n' +
      '연락처: ' + m.phone + '\n' +
      '이메일: ' + m.email + '\n' +
      '주소: ' + m.address + '\n' +
      '활동 희망 지역: ' + m.branch + '\n' +
      '개인정보 수집·이용: 동의함\n\n' +
      '이사회 승인 후 시트의 "이사회 승인" 칸에 기록해 주세요.\n' +
      '신청서 목록: ' + ss.getUrl() + '#gid=' + sheet.getSheetId()
  });
  return reply_({ ok: true });
}

// 주소로 직접 열었을 때 동작 확인용
function doGet() {
  return reply_({ ok: true, message: '고래 문의 접수 스크립트가 작동 중입니다.' });
}

function clean_(value, max) {
  let s = String(value == null ? '' : value).trim().slice(0, max);
  // 시트에서 수식으로 실행되지 않도록 = + - @ 로 시작하면 앞에 ' 를 붙임
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  // 0으로 시작하는 숫자(전화번호)는 앞자리 0이 사라지지 않도록 글자로 저장
  else if (/^0\d+$/.test(s)) s = "'" + s;
  return s;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
