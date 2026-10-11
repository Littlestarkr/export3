var sheetName = 'Sheet1';
var scriptProp = PropertiesService.getScriptProperties();

function intialSetup () {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  scriptProp.setProperty('key', activeSpreadsheet.getId());
}

function doPost (e) {
  // Honeypot: the "website" field is hidden from real users. If it's filled, it's a bot - drop silently.
  if (e.parameter.website) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    var sheet = doc.getSheetByName(sheetName);

    var dataset = [
        new Date(), // A열: Timestamp
        e.parameter.company, // B열: Company
        e.parameter.name, // C열: Name
        e.parameter.phone, // D열: Phone
        e.parameter.email, // E열: Email
        e.parameter.message, // F열: Message
        e.parameter.privacy_agreement // G열: 추가된 동의 여부 (Y) 
    ];

    sheet.appendRow(dataset);

    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  finally {
    lock.releaseLock();
  }
}

// 개인정보 처리방침과 실제 보관 기간을 맞추기 위한 정리 함수.
// "상담 완료 후 1년이 지난 문의 기록은 자동 파기"를 실제로 수행한다.
// 이 함수가 매일 실행되도록, Apps Script 편집기 좌측 "트리거" 메뉴에서
// cleanupOldEntries 함수에 대해 "시간 기반 > 일 타이머" 트리거를 한 번만 추가해야 동작한다.
function cleanupOldEntries () {
  var oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  var doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
  var sheet = doc.getSheetByName(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var timestamps = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  // 뒤에서부터 지워야 행 번호가 삭제 중에 밀리지 않는다.
  for (var i = timestamps.length - 1; i >= 0; i--) {
    var rowTimestamp = timestamps[i][0];
    if (rowTimestamp instanceof Date && rowTimestamp < oneYearAgo) {
      sheet.deleteRow(i + 2);
    }
  }
}
