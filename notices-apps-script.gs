/**
 * 알림 (notices.html) 용 Google Apps Script — 읽기 전용
 *
 * 글쓰기는 구글 시트에서 작가님만 합니다(시트를 다른 사람과 공유하지 않으면 작가님만 쓸 수 있음).
 * 이 스크립트는 시트의 '공개' 행을 홈페이지에 전달하기만 하며, 외부에서 시트에 쓰는 기능은 없습니다.
 *
 * [설치]
 * 1) 새 구글 시트를 만든다(이름 예: "홈페이지 알림"). 이 시트는 다른 사람과 공유하지 않는다.
 * 2) 시트 메뉴 확장 프로그램 > Apps Script 에 이 파일 내용을 통째로 붙여 넣고 저장한다.
 * 3) 함수 목록에서 setup 을 한 번 실행한다(권한 승인 필요). 'Notices' 탭과 머리글이 만들어진다.
 * 4) 배포 > 새 배포 > 유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자 → 배포 후 나오는 웹 앱 URL(…/exec)을 복사한다.
 * 5) notices.js 맨 위의 NOTICES_URL 에 그 URL을 넣고 올린다.
 * 6) 이 파일을 고치면 배포 관리에서 새 버전으로 다시 배포해야 반영된다(시트 내용만 바꿀 때는 다시 배포하지 않아도 된다).
 *
 * [열 설명] 'Notices' 탭, 1행은 머리글
 *   날짜     : 2026-11-04 형식 (그냥 날짜로 입력해도 됨)
 *   분류     : 예) 정책자금 / 수출지원 / 무역보험 / 세제·규제 / 기타 (분류가 2개 이상이면 홈페이지에 분류 버튼이 생긴다)
 *   제목     : 한 줄 제목
 *   내용     : 본문. 셀 안에서 줄바꿈 가능(Ctrl+Enter 또는 Alt+Enter)
 *   링크     : 원문 공고 주소(https:// 로 시작하는 것만 표시된다)
 *   링크이름 : 버튼 글자. 비우면 '원문 보기'
 *   상태     : '공개' 인 행만 홈페이지에 나온다. 그 외(비움·숨김·초안 등)는 나오지 않는다
 *   고정     : Y 로 적으면 목록 맨 위에 '고정'으로 표시된다
 * 최신 소식은 날짜 순으로 위에 나온다(시트 행 순서는 상관없음). 반영까지 최대 1분 걸린다.
 */

var SHEET_NAME = 'Notices';
var HEAD = ['날짜', '분류', '제목', '내용', '링크', '링크이름', '상태', '고정'];
var CACHE_SEC = 60;

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange('D:D').setWrap(true);
    sh.setColumnWidth(3, 300);
    sh.setColumnWidth(4, 420);
    sh.setColumnWidth(5, 260);
  }
}

function str_(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }

function dateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd');
  var s = str_(v);
  var m = s.match(/^(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'list';
  if (action !== 'list') return out_({ ok: false, error: 'unknown action' });
  var cache = CacheService.getScriptCache();
  var hit = cache.get('list');
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);

  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var items = [];
  if (sh) {
    var rows = sh.getDataRange().getValues();
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (str_(row[6]) !== '공개' || !str_(row[2])) continue;
      items.push({
        date: dateStr_(row[0]),
        cat: str_(row[1]),
        title: str_(row[2]),
        body: str_(row[3]),
        url: str_(row[4]),
        urlLabel: str_(row[5]),
        pin: str_(row[7]).toUpperCase() === 'Y'
      });
    }
  }
  items.sort(function (a, b) {
    if (a.pin !== b.pin) return a.pin ? -1 : 1;
    return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
  });
  var text = JSON.stringify({ ok: true, items: items.slice(0, 300) });
  cache.put('list', text, CACHE_SEC);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
