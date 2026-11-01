/**
 * 감사·응원 한마디 (guestbook.html) 용 Google Apps Script
 *
 * [설치]
 * 1) 새 구글 시트를 만든다(이름 예: "감사응원 한마디"). 시트 탭은 이 스크립트가 자동으로 만든다.
 * 2) 시트 메뉴 확장 프로그램 > Apps Script 에 이 파일 내용을 통째로 붙여 넣고 저장한다.
 * 3) 배포 > 새 배포 > 유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자 → 배포 후 나오는 웹 앱 URL(…/exec)을 복사한다.
 * 4) guestbook.js 맨 위의 GUESTBOOK_URL 에 그 URL을 넣고 올린다.
 * 5) 이 파일을 고치면 배포 관리에서 새 버전으로 다시 배포해야 반영된다.
 * (상담 신청용 스크립트와는 별도 스크립트·별도 시트로 쓴다.)
 *
 * [운영] 시트의 '상태' 열 값
 *   공개      : 누구나 읽을 수 있음 (기본값)
 *   검토대기  : 욕설·악담·스팸·연락처·링크로 보이면 자동 분류 → 작가님이 '공개'로 바꾸면 다른 사람도 읽음
 *   숨김      : 작가님이 비공개로 돌린 글 (글쓴이 본인 브라우저에서만 보임)
 *   삭제      : 삭제된 글
 * '답글' 열에 적으면 해당 글 아래에 'Happy Oh 답글'로 표시된다.
 * '비공개' 열이 Y 이면 글쓴이가 '나만 보기'를 선택한 글이다(시트에서는 항상 보임).
 */

var SHEET_NAME = 'Guestbook';
var HEAD = ['id', '작성시각', '글쓴이', '분류', '내용', '비밀번호해시', '비공개', '상태', '답글', '수정시각', '검토사유'];
var C = { id: 1, time: 2, name: 3, cat: 4, text: 5, pw: 6, priv: 7, status: 8, reply: 9, edited: 10, reason: 11 };
var SALT = 'happyoh-guestbook-v1';   // 바꾸면 기존 글의 비밀번호가 무효가 되므로 처음 한 번만 정한다
var MAX_TEXT = 500;
var MAX_NAME = 20;
var MIN_PW = 4;
var CATS = ['감사', '응원', '제안·의견'];

// 욕설·악담(공백·기호를 붙여서 검사). 필요하면 단어를 더한다.
var BAD_WORDS = ['시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '병신', '개새끼', '좆', '지랄', '꺼져', '죽어라', '뒤져', '미친놈', '미친년', '또라이', '쓰레기', '사기꾼', '엿먹', '닥쳐'];
// 스팸 낱말
var SPAM_WORDS = ['카지노', '바카라', '토토', '슬롯', '먹튀', '도박', '비아그라', '출장안마', '성인용품', '수익보장', '주식리딩', '코인리딩', '대출상담'];

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
    sh.getRange('B:B').setNumberFormat('@');
    sh.getRange('J:J').setNumberFormat('@');
    sh.getRange('E:E').setWrap(true);
  }
  return sh;
}

function now_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'); }
function str_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  return v === null || v === undefined ? '' : String(v);
}

function hash_(id, pw) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + '|' + id + '|' + pw);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

// 자동 분류: 문제가 있으면 사유 문자열, 없으면 ''
function classify_(name, text) {
  var all = name + ' ' + text;
  var compact = all.toLowerCase().replace(/[\s\.\-_~!@#$%^&*()+=\[\]{}|\\\/:;"'<>,?`]/g, '');
  var i;
  for (i = 0; i < BAD_WORDS.length; i++) if (compact.indexOf(BAD_WORDS[i]) >= 0) return '욕설·악담';
  for (i = 0; i < SPAM_WORDS.length; i++) if (compact.indexOf(SPAM_WORDS[i]) >= 0) return '스팸 낱말';
  if (/https?:\/\/|www\.|\.com\b|\.net\b|\.co\.kr\b|\.kr\/|t\.me\//i.test(all)) return '링크 포함';
  if (/01[016789][\s\-\.]?\d{3,4}[\s\-\.]?\d{4}/.test(all)) return '전화번호 포함';
  if (/[\w\.\-]+@[\w\-]+\.[a-z]{2,}/i.test(all)) return '이메일 포함';
  if (/(.)\1{9,}/.test(all)) return '반복 문자';
  return '';
}

function publicItem_(row) {
  return {
    id: str_(row[C.id - 1]),
    time: str_(row[C.time - 1]),
    name: str_(row[C.name - 1]),
    cat: str_(row[C.cat - 1]),
    text: str_(row[C.text - 1]),
    reply: str_(row[C.reply - 1])
  };
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'list';
  if (action !== 'list') return json_({ ok: false, error: 'unknown action' });
  var cache = CacheService.getScriptCache();
  var hit = cache.get('list');
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  var rows = sheet_().getDataRange().getValues();
  var items = [];
  for (var r = rows.length - 1; r >= 1; r--) {
    var row = rows[r];
    if (str_(row[C.status - 1]) === '공개' && str_(row[C.priv - 1]) !== 'Y' && str_(row[C.text - 1])) {
      items.push(publicItem_(row));
      if (items.length >= 300) break;
    }
  }
  var out = JSON.stringify({ ok: true, items: items });
  cache.put('list', out, 60);
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function findRow_(sh, id) {
  var rows = sh.getDataRange().getValues();
  for (var r = 1; r < rows.length; r++) {
    if (str_(rows[r][C.id - 1]) === id) return { index: r + 1, row: rows[r] };
  }
  return null;
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || '';
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var sh = sheet_();
    var cache = CacheService.getScriptCache();

    if (action === 'create') {
      if (p.website) return json_({ ok: true });                    // 허니팟: 조용히 무시
      var name = String(p.name || '').trim();
      var text = String(p.text || '').trim();
      var pw = String(p.pw || '');
      var cat = CATS.indexOf(p.cat) >= 0 ? p.cat : '응원';
      if (!name || name.length > MAX_NAME) return json_({ ok: false, error: '글쓴이는 1~' + MAX_NAME + '자로 적어 주세요.' });
      if (!text || text.length > MAX_TEXT) return json_({ ok: false, error: '내용은 1~' + MAX_TEXT + '자로 적어 주세요.' });
      if (pw.length < MIN_PW) return json_({ ok: false, error: '비밀번호는 ' + MIN_PW + '자 이상으로 정해 주세요.' });

      var reason = classify_(name, text);
      var elapsed = Number(p.t || 0);
      if (!reason && elapsed > 0 && elapsed < 3000) reason = '너무 빠른 등록';
      var rows = sh.getDataRange().getValues();
      if (!reason) {
        var recent = 0, tenMin = Date.now() - 10 * 60 * 1000;
        for (var r = Math.max(1, rows.length - 60); r < rows.length; r++) {
          if (str_(rows[r][C.text - 1]) === text) { reason = '중복 내용'; break; }
          var t = new Date(str_(rows[r][C.time - 1]).replace(' ', 'T') + ':00+09:00').getTime();
          if (t > tenMin) recent++;
        }
        if (!reason && recent > 30) reason = '짧은 시간 다량 등록';
      }
      var id = Utilities.getUuid();
      var status = reason ? '검토대기' : '공개';
      sh.appendRow([id, now_(), name, cat, text, hash_(id, pw), p.priv === 'Y' ? 'Y' : 'N', status, '', '', reason]);
      cache.remove('list');
      return json_({ ok: true, id: id, status: status, priv: p.priv === 'Y' });
    }

    if (action === 'mine') {
      var ids = String(p.ids || '').split(',').slice(0, 60);
      var want = {};
      ids.forEach(function (x) { if (x) want[x] = true; });
      var all = sh.getDataRange().getValues(), mine = [];
      for (var i = 1; i < all.length; i++) {
        var rid = str_(all[i][C.id - 1]);
        var st = str_(all[i][C.status - 1]);
        if (want[rid] && st.indexOf('삭제') < 0) {
          var it = publicItem_(all[i]);
          it.status = st;
          it.priv = str_(all[i][C.priv - 1]) === 'Y';
          mine.push(it);
        }
      }
      return json_({ ok: true, items: mine });
    }

    if (action === 'update' || action === 'delete') {
      var found = findRow_(sh, String(p.id || ''));
      if (!found || str_(found.row[C.status - 1]).indexOf('삭제') >= 0) return json_({ ok: false, error: '글을 찾을 수 없습니다.' });
      if (hash_(str_(found.row[C.id - 1]), String(p.pw || '')) !== str_(found.row[C.pw - 1])) {
        return json_({ ok: false, error: '비밀번호가 맞지 않습니다.' });
      }
      if (action === 'delete') {
        sh.getRange(found.index, C.text).setValue('');
        sh.getRange(found.index, C.status).setValue('삭제(본인)');
        sh.getRange(found.index, C.edited).setValue(now_());
        cache.remove('list');
        return json_({ ok: true });
      }
      var ntext = String(p.text || '').trim();
      if (!ntext || ntext.length > MAX_TEXT) return json_({ ok: false, error: '내용은 1~' + MAX_TEXT + '자로 적어 주세요.' });
      var nreason = classify_(str_(found.row[C.name - 1]), ntext);
      sh.getRange(found.index, C.text).setValue(ntext);
      if (p.priv === 'Y' || p.priv === 'N') sh.getRange(found.index, C.priv).setValue(p.priv);
      sh.getRange(found.index, C.edited).setValue(now_());
      if (nreason) {
        sh.getRange(found.index, C.status).setValue('검토대기');
        sh.getRange(found.index, C.reason).setValue(nreason);
      }
      cache.remove('list');
      return json_({ ok: true, status: nreason ? '검토대기' : str_(found.row[C.status - 1]) });
    }

    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: '잠시 후 다시 시도해 주세요.' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
