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
 * '공감' 열은 '공감해요' 누른 수(작가님이 직접 고치지 않는다). 기기당 1회는 화면(브라우저)에서 막는다.
 * '비공개' 열이 Y 이면 글쓴이가 '나만 보기'를 선택한 글이다(시트에서는 항상 보임).
 *
 * [댓글] 'Comments' 시트 탭은 스크립트가 자동으로 만든다. 열: id, postId, 작성시각, 글쓴이, 내용, 비밀번호해시, 비공개, 상태, 답글, 수정시각, 검토사유
 *   상태는 글과 같다(공개 / 검토대기 / 숨김 / 삭제). 비공개 댓글은 댓글 쓴 사람과 원글 쓴 사람만 본다(작가님은 시트에서 봄).
 *   원글 쓴 사람은 글 비밀번호로 확인하며, 맞으면 브라우저에 확인 표(토큰)가 저장된다.
 */

var SHEET_NAME = 'Guestbook';
var HEAD = ['id', '작성시각', '글쓴이', '분류', '내용', '비밀번호해시', '비공개', '상태', '답글', '수정시각', '검토사유', '공감'];
var C = { id: 1, time: 2, name: 3, cat: 4, text: 5, pw: 6, priv: 7, status: 8, reply: 9, edited: 10, reason: 11, likes: 12 };
var CSHEET = 'Comments';
var CHEAD = ['id', 'postId', '작성시각', '글쓴이', '내용', '비밀번호해시', '비공개', '상태', '답글', '수정시각', '검토사유'];
var CC = { id: 1, post: 2, time: 3, name: 4, text: 5, pw: 6, priv: 7, status: 8, reply: 9, edited: 10, reason: 11 };
var MAX_COMMENTS = 600;
var SALT = 'happyoh-guestbook-v1';   // 바꾸면 기존 글의 비밀번호가 무효가 되므로 처음 한 번만 정한다
var MAX_TEXT = 500;
var MAX_NAME = 20;
var MAX_COMMENT = 300;
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

function csheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CSHEET);
  if (!sh) {
    sh = ss.insertSheet(CSHEET);
    sh.appendRow(CHEAD);
    sh.setFrozenRows(1);
    sh.getRange('C:C').setNumberFormat('@');
    sh.getRange('J:J').setNumberFormat('@');
    sh.getRange('E:E').setWrap(true);
  }
  return sh;
}

// 원글 쓴이 확인 표: 글 비밀번호 해시로 만들며 시트 밖으로는 이 값만 나간다
function tok_(id, pwHash) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + '|owner|' + id + '|' + pwHash);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function cItem_(row) {
  return {
    id: str_(row[CC.id - 1]),
    post: str_(row[CC.post - 1]),
    time: str_(row[CC.time - 1]),
    name: str_(row[CC.name - 1]),
    text: str_(row[CC.text - 1]),
    reply: str_(row[CC.reply - 1]),
    nopw: !str_(row[CC.pw - 1])
  };
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
    reply: str_(row[C.reply - 1]),
    likes: Number(row[C.likes - 1]) || 0
  };
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'list';
  if (action === 'clist') {
    var cc = CacheService.getScriptCache();
    var chit = cc.get('clist');
    if (chit) return ContentService.createTextOutput(chit).setMimeType(ContentService.MimeType.JSON);
    var crows = csheet_().getDataRange().getValues();
    var citems = [];
    for (var q = 1; q < crows.length; q++) {
      var cr = crows[q];
      if (str_(cr[CC.status - 1]) === '공개' && str_(cr[CC.priv - 1]) !== 'Y' && str_(cr[CC.text - 1])) citems.push(cItem_(cr));
    }
    if (citems.length > MAX_COMMENTS) citems = citems.slice(citems.length - MAX_COMMENTS);
    var cout = JSON.stringify({ ok: true, items: citems });
    cc.put('clist', cout, 60);
    return ContentService.createTextOutput(cout).setMimeType(ContentService.MimeType.JSON);
  }
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
      var ph = hash_(id, pw);
      sh.appendRow([id, now_(), name, cat, text, ph, p.priv === 'Y' ? 'Y' : 'N', status, '', '', reason, 0]);
      cache.remove('list');
      return json_({ ok: true, id: id, status: status, priv: p.priv === 'Y', tok: tok_(id, ph) });
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

    if (action === 'unlock') {
      var uf = findRow_(sh, String(p.id || ''));
      if (!uf || str_(uf.row[C.status - 1]).indexOf('삭제') >= 0) return json_({ ok: false, error: '글을 찾을 수 없습니다.' });
      if (hash_(str_(uf.row[C.id - 1]), String(p.pw || '')) !== str_(uf.row[C.pw - 1])) return json_({ ok: false, error: '비밀번호가 맞지 않습니다.' });
      return json_({ ok: true, tok: tok_(str_(uf.row[C.id - 1]), str_(uf.row[C.pw - 1])) });
    }

    if (action === 'ccreate') {
      if (p.website) return json_({ ok: true });
      var csh = csheet_();
      var pf = findRow_(sh, String(p.post || ''));
      if (!pf || str_(pf.row[C.status - 1]).indexOf('삭제') >= 0) return json_({ ok: false, error: '댓글을 달 글을 찾을 수 없습니다.' });
      var cname = String(p.name || '').trim();
      var ctext = String(p.text || '').trim();
      var cpw = String(p.pw || '');
      if (!cname || cname.length > MAX_NAME) return json_({ ok: false, error: '글쓴이는 1~' + MAX_NAME + '자로 적어 주세요.' });
      if (!ctext || ctext.length > MAX_COMMENT) return json_({ ok: false, error: '댓글은 1~' + MAX_COMMENT + '자로 적어 주세요.' });
      if (cpw && cpw.length < MIN_PW) return json_({ ok: false, error: '비밀번호는 비우거나 ' + MIN_PW + '자 이상으로 정해 주세요.' });
      var creason = classify_(cname, ctext);
      var celapsed = Number(p.t || 0);
      if (!creason && celapsed > 0 && celapsed < 2000) creason = '너무 빠른 등록';
      var crows2 = csh.getDataRange().getValues();
      if (!creason) {
        var crecent = 0, cten = Date.now() - 10 * 60 * 1000;
        for (var cr2 = Math.max(1, crows2.length - 60); cr2 < crows2.length; cr2++) {
          if (str_(crows2[cr2][CC.text - 1]) === ctext && str_(crows2[cr2][CC.post - 1]) === str_(pf.row[C.id - 1])) { creason = '중복 내용'; break; }
          var ct = new Date(str_(crows2[cr2][CC.time - 1]).replace(' ', 'T') + ':00+09:00').getTime();
          if (ct > cten) crecent++;
        }
        if (!creason && crecent > 40) creason = '짧은 시간 다량 등록';
      }
      var cid = Utilities.getUuid();
      var cstatus = creason ? '검토대기' : '공개';
      csh.appendRow([cid, str_(pf.row[C.id - 1]), now_(), cname, ctext, cpw ? hash_(cid, cpw) : '', p.priv === 'Y' ? 'Y' : 'N', cstatus, '', '', creason]);
      cache.remove('clist');
      return json_({ ok: true, id: cid, status: cstatus, priv: p.priv === 'Y' });
    }

    if (action === 'cmine') {
      var cids = {};
      String(p.ids || '').split(',').slice(0, 120).forEach(function (x) { if (x) cids[x] = true; });
      var owned = {};
      String(p.toks || '').split(',').slice(0, 60).forEach(function (pair) {
        var k = pair.split(':');
        if (k.length !== 2 || !k[0] || !k[1]) return;
        var of = findRow_(sh, k[0]);
        if (of && str_(of.row[C.status - 1]).indexOf('삭제') < 0 && tok_(k[0], str_(of.row[C.pw - 1])) === k[1]) owned[k[0]] = true;
      });
      var call = csheet_().getDataRange().getValues(), cout2 = [];
      for (var ci = 1; ci < call.length; ci++) {
        var crow = call[ci], cs = str_(crow[CC.status - 1]);
        if (cs.indexOf('삭제') >= 0 || !str_(crow[CC.text - 1])) continue;
        var cmid = str_(crow[CC.id - 1]), cpost = str_(crow[CC.post - 1]);
        var isMine = !!cids[cmid];
        var viaOwner = owned[cpost] && str_(crow[CC.priv - 1]) === 'Y' && cs === '공개';
        if (isMine || viaOwner) {
          var cit = cItem_(crow);
          cit.status = cs;
          cit.priv = str_(crow[CC.priv - 1]) === 'Y';
          cit.mine = isMine;
          cout2.push(cit);
        }
      }
      return json_({ ok: true, items: cout2, owned: Object.keys(owned) });
    }

    if (action === 'cupdate' || action === 'cdelete') {
      var csh3 = csheet_();
      var crs = csh3.getDataRange().getValues(), cfound = null;
      for (var cx = 1; cx < crs.length; cx++) if (str_(crs[cx][CC.id - 1]) === String(p.id || '')) { cfound = { index: cx + 1, row: crs[cx] }; break; }
      if (!cfound || str_(cfound.row[CC.status - 1]).indexOf('삭제') >= 0) return json_({ ok: false, error: '댓글을 찾을 수 없습니다.' });
      if (!str_(cfound.row[CC.pw - 1])) return json_({ ok: false, error: '비밀번호 없이 쓴 댓글은 수정·삭제할 수 없습니다.' });
      if (hash_(str_(cfound.row[CC.id - 1]), String(p.pw || '')) !== str_(cfound.row[CC.pw - 1])) return json_({ ok: false, error: '비밀번호가 맞지 않습니다.' });
      if (action === 'cdelete') {
        csh3.getRange(cfound.index, CC.text).setValue('');
        csh3.getRange(cfound.index, CC.status).setValue('삭제(본인)');
        csh3.getRange(cfound.index, CC.edited).setValue(now_());
        cache.remove('clist');
        return json_({ ok: true });
      }
      var cnt = String(p.text || '').trim();
      if (!cnt || cnt.length > MAX_COMMENT) return json_({ ok: false, error: '댓글은 1~' + MAX_COMMENT + '자로 적어 주세요.' });
      var cnr = classify_(str_(cfound.row[CC.name - 1]), cnt);
      csh3.getRange(cfound.index, CC.text).setValue(cnt);
      if (p.priv === 'Y' || p.priv === 'N') csh3.getRange(cfound.index, CC.priv).setValue(p.priv);
      csh3.getRange(cfound.index, CC.edited).setValue(now_());
      if (cnr) {
        csh3.getRange(cfound.index, CC.status).setValue('검토대기');
        csh3.getRange(cfound.index, CC.reason).setValue(cnr);
      }
      cache.remove('clist');
      return json_({ ok: true, status: cnr ? '검토대기' : str_(cfound.row[CC.status - 1]) });
    }

    if (action === 'like') {
      var lf = findRow_(sh, String(p.id || ''));
      if (!lf || str_(lf.row[C.status - 1]).indexOf('삭제') >= 0) return json_({ ok: false, error: '글을 찾을 수 없습니다.' });
      var cur = Number(lf.row[C.likes - 1]) || 0;
      var next = Math.max(0, cur + (Number(p.delta) < 0 ? -1 : 1));
      sh.getRange(lf.index, C.likes).setValue(next);
      cache.remove('list');
      return json_({ ok: true, likes: next });
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
