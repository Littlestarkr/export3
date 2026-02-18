var sheetName = 'Sheet1';
var scriptProp = PropertiesService.getScriptProperties();

function intialSetup () {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  scriptProp.setProperty('key', activeSpreadsheet.getId());
}

function doPost (e) {
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
