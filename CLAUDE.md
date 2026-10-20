# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-page marketing/consulting site for 오주현 (Happy Oh), a Korean business consultant specializing in export financing, trade insurance, and government policy funding. Content and UI copy are in Korean (`lang="ko"`).

This is a static site with no build step, package manager, or test suite — just three files:

- `index.html` — all page content and markup
- `styles.css` — all styling (single file, no preprocessor)
- `script.js` — all behavior (vanilla JS, no framework/bundler)

Plus static assets: `favicon.svg`, `profile.jpg`, `testimage.png` (book cover).

## Running locally

There is no dev server or build command. Open `index.html` directly in a browser, or serve the directory with any static file server (e.g. `python -m http.server` from this folder) to avoid `file://` quirks with fonts/CDN resources.

There is no linter or test suite configured for this repo.

## Architecture notes

**Single HTML file, section-anchored layout.** The page is one long document with `<section id="...">` blocks (`#home`, `#about`, `#book`, `#services`, `#community`, `#contact`) that the header nav and in-page links scroll to. `script.js` intercepts `a[href^="#"]` clicks for smooth scrolling and adjusts for the fixed header's height — but only on viewports wider than 768px, since the header is not fixed on mobile (see the `headerOffset` logic in `script.js`).

**Resume modal.** The "소개" (about) section's title and a CTA button both call `openResumeModal()` (defined in `script.js`), which toggles `.active`/`aria-hidden` on `#resumeModal` and locks body scroll. The modal contains detailed career/resume tables hardcoded directly in `index.html`. Closing happens via the `&times;` button, clicking the overlay, or Escape — all wired to `closeResumeModal()`.

**Contact form submits to Google Apps Script, not a backend.** `#consultingForm` in `index.html` posts via `fetch` to a hardcoded Google Apps Script web app URL (`scriptURL` in `script.js`), using `URLSearchParams`/`FormData` as `x-www-form-urlencoded`. There is no server code in this repo for that endpoint — it lives in Google Apps Script outside this project. If the endpoint URL changes, update the `scriptURL` constant in `script.js`.

**Spam mitigation is a honeypot, not a CAPTCHA.** The form has a hidden `#website` field (`.hp-field`, `aria-hidden`, `tabindex="-1"`) that real users never see or fill. If it has a value on submit, `script.js` silently drops the submission. Keep this field present and hidden if editing the form markup.

**Privacy consent toggle.** `togglePrivacy()` is defined twice — once inline in `index.html` and once in `script.js` — both toggling the same `#privacy-detail` box. Keep both in sync (or consolidate) if changing this behavior.

**Responsive breakpoint.** The site uses a single breakpoint at `768px` throughout `styles.css` for mobile layout adjustments (hero spacing, footer spacing, about stats, services, book section, naver community section, form).

**External dependencies loaded via CDN** (no local copies): Google Fonts (Noto Sans KR, Playfair Display) and Font Awesome 6.4.0 icons, both linked in `index.html`'s `<head>`.

**Scroll-in animations.** `script.js` uses an `IntersectionObserver` to add a `.visible` class to `.about-card` and `.service-item` elements as they enter the viewport (fading/translating in); the corresponding `.visible` CSS is injected dynamically into `<head>` by the script itself rather than living in `styles.css`.

**정책자금 및 수출금융 페이지 (`policy-finance.html`).** 서비스 카드 01에서 연결되는 별도 페이지로, `policy-finance.css`·`policy-finance.js`를 쓴다(`script.js`는 `#resumeModal`이 없어 로드하지 않는다). 1부는 탐색 사이트·보증기관 카드, 2부는 기관별 탭(소진공·중진공·신용보증기금·무보·aT·수출입은행·기보·무역협회·서울신보 — 서울신보는 상품별 링크만 연결)이며 각 기관의 자금 체계(성장단계 등)에 맞춰 표를 손으로 작성한 정적 HTML이다. 탭 전환만 JS가 맡고 `?org=kosmes` 같은 쿼리로 바로 열 수 있다. 기관을 추가하려면 `.pf-tab`(비활성 ‘준비 중’ 탭을 `data-org`로 바꾸기)와 `#panel-<org>`를 추가한다. 표는 모바일(768px 이하)에서 `data-label` 기반 카드로 바뀐다. 한도·금리는 기관 공식 안내를 옮긴 것이므로 수정 시 원문 링크(`.pf-source`)를 함께 확인한다.

**무역보험 및 수출 안전망 페이지 (`trade-insurance.html`).** 서비스 카드 02에서 연결되는 별도 페이지로 `policy-finance.css`를 함께 쓴다(JS 없음). 무역보험 전반(i-800), 국외기업 신용조사, 바이어 정보 검색(K-SIGHT), 단기성 보험, 신용보증, 환변동보험은 무보 홈페이지 안내를 옮긴 정적 HTML이고, K-SURE ON은 외부 링크만 연결한다. '단기성 보험' 바로 뒤에 '농수산물 특화'(단기수출보험 농수산물패키지, `#ksure-agri`) 섹션이 있다(원래 policy-finance의 무보 탭에 있던 것을 옮겼다). 보험료율·한도는 수시로 바뀌므로 수정 시 원문(`.pf-source`)을 확인한다.

**글로벌 진출 페이지 (`global-expansion.html`).** 서비스 카드 03에서 연결되는 별도 페이지로 `policy-finance.css`를 함께 쓴다(JS 없음). 1부는 KOTRA 서비스(AI 수출정보·트라이빅 링크, 해외시장조사·지사화·내수기업 수출기업화·바이어 트래킹·수출바우처는 KOTRA 안내 자료를 옮긴 표, 해외전시회·바이코리아 링크), 2부는 농산물·화장품·해외인증·법령 지원(`#law`, 법령 길잡이 `littlestarkr.github.io/lawsearch` 링크)·무역통계·HS코드(`#stats`, 무역통계 길잡이 `littlestarkr.github.io/lawsearch/trade/` 링크, 번호 6)·기타(번호 7) 외부 사이트 링크 카드다. 무역통계 길잡이는 별도 저장소 `Littlestarkr/lawsearch`의 `trade/` 폴더에 있다(이 저장소에는 없다). 수수료·지원금은 해마다 바뀌므로 수정 시 KOTRA 최신 공고를 확인한다.

**정부지원사업 매칭 페이지 (`government-support.html`).** 서비스 카드 04에서 연결되는 별도 페이지로 `policy-finance.css`를 함께 쓴다(JS 없음). 수출바우처사업(개념·구성·메뉴판 14개 분야 표)과 소진공 희망리턴패키지사업(지원개요 표)을 각 사업 홈페이지 안내에서 옮긴 정적 HTML이며, 사업을 추가하려면 `#programs` 안에 `.pf-grp` 블록과 상단 칩을 더한다. 공고·한도는 해마다 바뀌므로 수정 시 원문을 확인한다.

**하위 페이지 내비게이션 (`back-nav.js`).** policy-finance·trade-insurance·global-expansion·government-support 4개 페이지가 공통으로 불러온다. 화면 왼쪽 아래에 ‘이전 화면’(같은 사이트에서 왔으면 `history.back()`, 아니면 `index.html#services`)과 ‘맨 위로’ 버튼을 띄우고, 각 `.pf-grp` 끝에 ‘목차로 돌아가기’ 링크(같은 패널·섹션의 `.pf-jump`로 이동)를 붙인다. 페이지 안 `#` 이동은 `replaceState`로 처리해 history 항목을 쌓지 않는다. 새 하위 페이지를 만들면 `</body>` 앞에 `<script src="back-nav.js?v=1"></script>`를 넣는다. 이력서 모달(`script.js`)은 열 때 history 항목을 하나 쌓아 브라우저 뒤로가기로도 닫히고, 상·하단에 ‘이전 화면으로 돌아가기’ 버튼이 있다.

**블로그 기록 섹션 (`#writings`).** 홈페이지 `#services`와 `#community` 사이의 카드 4개(칼럼 2종·컨설팅 사례·수출 이야기)로, 각각 네이버 블로그의 해당 분류 목록(`PostList.naver?blogId=happyojh&categoryNo=57/49/55/44` = 중소기업신문/무역신문/컨설팅/수출이야기)으로 새 탭 연결된다. 스타일은 `styles.css` 끝의 `.writing-*` 블록이며 4열→2열(1024px 이하)→1열(768px 이하)로 바뀐다. "4,000여 편"은 블로그 글 수(약 4,280편)를 반올림한 문구다. 잠금(🔒) 분류는 연결하지 않는다. `styles.css`는 `?v=2`로 캐시를 갱신한다.

**공유 미리보기·검색 등록.** `og-image.jpg`(1200×630)와 절대 주소 `og:*` 태그, `og:url`, `<link rel="canonical">`을 5개 페이지에 둔다. `robots.txt`(전체 허용 + Sitemap)와 `sitemap.xml`(5개 URL)은 저장소 루트에 있고, 페이지를 추가하면 `sitemap.xml`에도 더한다. 구글 서치콘솔은 `index.html`의 `google-site-verification` 메타로 소유 확인하고 sitemap을 제출했다. 네이버 서치어드바이저는 호스트 단위(`https://littlestarkr.github.io`) 등록만 가능해서, 확인 파일과 메타는 별도 저장소 `Littlestarkr/Littlestarkr.github.io`에 있다(이 저장소에는 없다). 이 두 저장소의 확인 파일·메타는 지우지 않는다.

**방문 통계(구글 애널리틱스).** 측정 ID `G-J15DSR7PZD`의 gtag 스니펫이 5개 페이지 `</head>` 앞에 있고, 각 페이지 하단에 쿠키 사용 안내 문구가 있다. 상담 신청이 성공하면 `script.js`가 `generate_lead` 이벤트를 보낸다(`form_name: 'consulting'`, 개인정보는 보내지 않는다). GA 관리 > 데이터 표시 > 이벤트에서 이 이벤트를 '주요 이벤트'로 켜 두어야 전환으로 집계된다. 새 페이지를 만들면 같은 스니펫과 안내 문구를 넣는다.

**상담 접수 후 처리(Apps Script, 저장소 밖).** `doPost`는 시트(`Sheet1` A–G열)에 행을 추가하고, 허니팟이 비어 있을 때만 ① 운영자(happyojh@gmail.com)에게 알림 메일, ② 신청자에게 접수 확인 메일(이메일 형식 검증, try/catch, 회신 주소는 운영자), ③ 8열(H, "Report")에 `Y` 표시를 한다. 스크립트를 고치면 배포 관리에서 새 버전으로 다시 배포해야 반영된다. 하루치 묶음 알림은 없다.
