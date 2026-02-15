# 구글 시트 연동 가이드 (Google Sheets Integration Guide)

이 가이드를 따라하면 랜딩 페이지의 상담 신청 폼을 구글 시트와 무료로 연동할 수 있습니다.

## 1단계: 구글 시트 만들기
1. [Google Sheets](https://docs.google.com/spreadsheets/)에 접속하여 **새 스프레드시트**를 만듭니다.
2. 시트 이름을 `Consulting Inquiries` (또는 원하는 이름)로 변경합니다.
3. 첫 번째 행(헤더)에 다음 내용을 각 셀에 입력합니다:
   - **A1**: `Timestamp`
   - **B1**: `Company`
   - **C1**: `Name`
   - **D1**: `Phone`
   - **E1**: `Email`
   - **F1**: `Message`

## 2단계: 앱스 스크립트 작성
1. 스프레드시트 메뉴에서 **확장 프로그램 (Extensions) > Apps Script**를 클릭합니다.
2. 코드 편집기가 열리면 기존 코드를 지우고 아래 코드를 복사해서 붙여넣습니다.

(아래 코드를 복사하거나, 함께 제공된 `Code.gs` 파일의 내용을 전체 복사해서 붙여넣으세요)

```javascript
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
        new Date(), // Timestamp
        e.parameter.company,
        e.parameter.name,
        e.parameter.phone,
        e.parameter.email,
        e.parameter.message
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
```

3. 저장 아이콘(💾)을 누르고 프로젝트 이름을 `FormHandler`로 저장합니다.
4. 함수 선택 드롭다운(상단)에서 **`intialSetup`**을 선택하고 **실행(Run)** 버튼을 누릅니다.
   - **권한 검토** 팝업이 뜨면: `권한 검토` > 계정 선택 > `고급` > `FormHandler(으)로 이동(안전하지 않음)` > `허용`을 순서대로 클릭합니다.
   - 실행 완료 로그가 뜨면 성공입니다.

## 3단계: 배포 및 URL 복사
1. 우측 상단 **배포 (Deploy) > 새 배포 (New deployment)**를 클릭합니다.
2. **유형 선택** 톱니바퀴(⚙️)를 누르고 **웹 앱 (Web App)**을 선택합니다.
3. 설정:
   - **설명**: `Form Submit V1`
   - **다음 사용자로 웹 앱 실행**: `나 (My Account)`
   - **액세스 권한이 있는 사용자**: **`모든 사용자 (Anyone)`** (중요!)
4. **배포 (Deploy)** 버튼을 클릭합니다.
5. **웹 앱 URL (Web App URL)**을 복사합니다. (`exec`로 끝나는 긴 주소입니다)

## 4단계: 랜딩 페이지에 적용
1. `script.js` 파일을 엽니다.
2. `const scriptURL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';` 부분을 찾습니다.
3. `'YOUR_GOOGLE_SCRIPT_URL_HERE'`를 **방금 복사한 URL**로 교체합니다.

> **예시:**
> `const scriptURL = 'https://script.google.com/macros/s/AKfycbz.../exec';`

이제 폼을 제출하면 구글 시트에 데이터가 자동으로 저장됩니다!
