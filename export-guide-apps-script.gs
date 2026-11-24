/**
 * 수출 가이드 도구 (export-guide.html) 응답 저장용 Google Apps Script
 *
 * [설치]
 * 1) 새 구글 시트를 만든다(이름 예: "수출 가이드 응답"). 시트 탭 'Responses'는 이 스크립트가 자동으로 만든다.
 * 2) 시트 메뉴 확장 프로그램 > Apps Script 에 이 파일 내용을 통째로 붙여 넣고 저장한다.
 * 3) 배포 > 새 배포 > 유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자 → 배포 후 나오는 웹 앱 URL(…/exec)을 복사한다.
 * 4) export-guide.js 맨 위의 GUIDE_URL 에 그 URL을 넣고 올린다.
 *    (비어 있으면 페이지는 저장 동의 상자를 숨기고 결과만 보여 준다.)
 * 5) 이 파일을 고치면 배포 관리에서 새 버전으로 다시 배포해야 반영된다.
 * (상담 신청·방명록·핫이슈 스크립트와는 별도 스크립트·별도 시트로 쓴다.)
 *
 * [성격] 쓰기 전용이다. doGet 이 없으므로 웹에서 시트 내용을 읽을 길이 없다.
 *   이름·연락처·이메일은 받지 않는다. 방문자는 동의했을 때만 익명 응답과 접수번호를 보낸다.
 *   '내 이전 결과'는 방문자 브라우저(localStorage)에만 있다.
 *
 * [열] 접수번호 / 저장시각 / 수출실적(Q1) / 진행 거래(2번 질문, 2026-11-24부터 모두에게) / 창업 연차·규모(Q2, 복수) / 품목(Q3, 복수) / 수출형태(Q4) /
 *      시장(Q5) / 어려운 점(Q6) / 결제방식(Q7) / 필요(Q8) / 추천(먼저 볼 곳 id) / 매핑버전 / 상담이동 / 상태 / 어려운점_기타(Q6 '기타'에 적은 글, 100자) /
 *      매출실적(Q1, 17열 Q) / 이번건_계약금액(진행 거래가 협상·주문일 때 그 한 건의 금액, 18열 R)
 *   상담이동: 결과 화면에서 '상담 신청서로' 누르면 form, '카카오톡' 누르면 kakao 가 적힌다.
 *   상태: 정상 / 검토대기(1분에 30건 넘게 몰릴 때 자동) — 통계 낼 때 검토대기 행은 걸러 본다.
 * [삭제 요청] 방문자가 접수번호로 삭제를 요청하면 해당 행을 지운다(처리방침 안내).
 * [보유 기간] 3년. 저장시각이 3년 지난 행은 작가님이 정리한다.
 */

var SHEET_NAME = 'Responses';
var HEAD = ['접수번호', '저장시각', '수출실적', '진행거래', '연차·규모', '품목', '수출형태', '시장', '어려운점', '결제방식', '필요', '추천', '매핑버전', '상담이동', '상태', '어려운점_기타', '매출실적', '이번건_계약금액'];
var COL_CONTACT = 14;
var COL_ETC = 16;   // 2026-11-22 맨 끝에 추가: 기존 열(상담이동 14·상태 15) 위치는 그대로
var COL_REV = 17;   // 2026-11-23 맨 끝에 추가: 전년도 매출실적 5단계(기존 열 위치 유지)
var COL_DEAL = 18;  // 2026-11-24 맨 끝(R열)에 추가: 진행 거래 계약금액 5구간. 그 전 행은 빈칸
var MAX_TOTAL = 2000;
var BURST = 30;   // 1분 동안 이보다 많이 들어오면 '검토대기'

// 페이지(export-guide-map.js)의 코드 → 시트에 적을 한글. 여기 없는 코드는 버린다.
var L = {
  q1: { s0: '없음', s1: '1천 달러 미만', s2: '1천~1만 달러', s3: '1만~10만 달러', s4: '10만~100만 달러', s5: '100만~1천만 달러', s6: '1천만 달러 이상' },
  q1r: { r0: '매출 없음', r1: '1억 원 미만', r2: '1억~5억 원 미만', r3: '5억~20억 원 미만', r4: '20억~100억 원 미만', r5: '100억 원 이상' },
  q1b: { prep: '진행 거래 없음(준비 중)', nego: '협상·샘플 진행', order: '주문(계약) 받음' },
  q1c: { d1: '1천 달러 미만', d2: '1천~1만 달러 미만', d3: '1만~10만 달러 미만', d4: '10만~50만 달러 미만', d5: '50만 달러 이상' },
  q2: { pre: '예비창업자', startup: '창업 3년 이내', y7: '3년 초과~7년 이내', y7p: '7년 초과', youth: '청년기업(만 39세 이하)', women: '여성기업', disabled: '장애인기업', social: '사회적기업', venture: '벤처기업', innobiz: '이노비즈', mainbiz: '메인비즈', lab: '기업부설연구소·전담부서', restart: '재창업·중장년 기업', esg_local: '소부장·ESG·비수도권 등', smallbiz: '소상공인', small: '소기업(소상공인 제외)', medium: '중기업', mid: '중견기업', large: '대기업', etc: '기타' },
  q3: { consumer: '소비재', industrial: '산업재·부품', agri: '농수산식품', cosmetic: '화장품', service: '서비스·콘텐츠', etc: '기타' },
  q4: { local: '로컬 수출', b2c: 'B2C 온라인 판매', b2b: '일반수출(B2B)', relay: '중계무역', import: '수입', other: '기타' },
  q5: { undecided: '미정', cnjp: '중국·일본', sea: '동남아', na: '미국·캐나다', eu: '유럽', mea: '중동·아프리카', other: '그 밖의 지역' },
  q6: { buyer: '바이어 발굴', docs: '서류·계약서', collect: '대금 미회수', importer: '수입자 신용조사', factoring: '수출채권 유동화', tclaim: '무역클레임', fx: '환율', fund: '자금', cert: '해외인증·규제', hs: 'HS코드·관세·통관', support: '정부지원사업', fraud: '무역사기', market: '시장 선택', etc: '기타' },
  q7: { prepay: '선수금', lc: '신용장(L/C)', collection: '추심(D/P, D/A)', deferred: '외상거래', other: '기타', unknown: '아직 모름' },
  q8: { info: '자료·도구', market: '시장·바이어', fund: '자금·보험·지원사업', consult: '상담', tool: '자료·도구' }
};

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@');
    sh.getRange('B:B').setNumberFormat('@');
  }
  if (!sh.getRange(1, COL_ETC).getValue()) sh.getRange(1, COL_ETC).setValue(HEAD[COL_ETC - 1]);   // 예전 시트에도 새 열 제목을 붙인다
  if (!sh.getRange(1, COL_REV).getValue()) sh.getRange(1, COL_REV).setValue(HEAD[COL_REV - 1]);
  if (!sh.getRange(1, COL_DEAL).getValue()) sh.getRange(1, COL_DEAL).setValue(HEAD[COL_DEAL - 1]);
  return sh;
}

function one_(key, v) {
  v = String(v || '');
  return L[key][v] || '';
}

function many_(key, v) {
  var out = [];
  String(v || '').split(',').slice(0, 15).forEach(function (c) {
    var t = L[key][c];
    if (t && out.indexOf(t) < 0) out.push(t);
  });
  return out.join(', ');
}

// '기타'에 적은 글: 한 줄·100자로 자르고, 수식으로 읽히지 않게 = + - @ 로 시작하면 앞에 ' 를 붙인다
function text_(v) {
  var t = String(v || '').replace(/[\r\n\t\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return t;
}

function ids_(v) {
  return String(v || '').split(',').slice(0, 7).filter(function (c) {
    return /^[a-z0-9-]{1,30}$/.test(c);
  }).join(', ');
}

function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var hit = sh.getRange(2, 1, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return json_({ result: 'success' });      // 허니팟: 조용히 버린다
  var id = String(p.id || '');
  if (!/^EG-\d{6}-[A-Z0-9]{4}$/.test(id)) return json_({ result: 'error', message: 'bad id' });

  var total = 0;
  for (var k in p) total += String(p[k]).length;
  if (total > MAX_TOTAL) return json_({ result: 'error', message: 'too long' });

  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) { return json_({ result: 'error', message: 'busy' }); }
  try {
    var sh = sheet_();
    var row = findRow_(sh, id);

    if (p.action === 'contact') {
      var via = p.via === 'kakao' ? 'kakao' : 'form';
      if (row) {
        var cell = sh.getRange(row, COL_CONTACT);
        var cur = String(cell.getValue() || '');
        if (cur.indexOf(via) < 0) cell.setValue(cur ? cur + ', ' + via : via);
      }
      return json_({ result: 'success' });
    }

    if (p.action !== 'save') return json_({ result: 'error', message: 'bad action' });
    if (row) return json_({ result: 'success', dup: true });   // 같은 접수번호는 한 번만
    if (!L.q1[p.q1]) return json_({ result: 'error', message: 'bad q1' });

    var cache = CacheService.getScriptCache();
    var n = Number(cache.get('eg_burst') || 0) + 1;
    cache.put('eg_burst', String(n), 60);
    var status = n > BURST ? '검토대기' : '정상';

    var tz = Session.getScriptTimeZone() || 'Asia/Seoul';
    sh.appendRow([
      id,
      Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss'),
      one_('q1', p.q1),
      one_('q1b', p.q1b),   // 2026-11-24: 실적과 상관없이 모두에게 묻는다
      many_('q2', p.q2),
      many_('q3', p.q3),
      many_('q4', p.q4),
      many_('q5', p.q5),
      many_('q6', p.q6),
      many_('q7', p.q7),
      many_('q8', p.q8),
      ids_(p.rec),
      String(p.v || '').replace(/[^0-9.]/g, '').slice(0, 6),
      '',
      status,
      String(p.q6 || '').split(',').indexOf('etc') >= 0 ? text_(p.q6etc) : '',
      one_('q1r', p.q1r),
      (p.q1b === 'nego' || p.q1b === 'order') ? one_('q1c', p.q1c) : ''
    ]);
    return json_({ result: 'success' });
  } finally {
    lock.releaseLock();
  }
}
