# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-page marketing/consulting site for 오주현 (Happy Oh), a Korean business consultant specializing in export financing, trade insurance, and government policy funding. Content and UI copy are in Korean (`lang="ko"`).

This is a static site with no build step, package manager, or test suite — just three files:

- `index.html` — all page content and markup
- `styles.css` — all styling (single file, no preprocessor)
- `script.js` — all behavior (vanilla JS, no framework/bundler)

Plus static assets: `favicon.svg`, `profile.jpg`, `testimage.webp` (book cover).

## Running locally

There is no dev server or build command. Open `index.html` directly in a browser, or serve the directory with any static file server (e.g. `python -m http.server` from this folder) to avoid `file://` quirks with fonts/CDN resources.

There is no linter or test suite configured for this repo.

## Architecture notes

**Single HTML file, section-anchored layout.** The page is one long document with `<section id="...">` blocks (`#home`, `#about`, `#book`, `#services`, `#writings`, `#contact`) that the header nav and in-page links scroll to. `script.js` intercepts `a[href^="#"]` clicks for smooth scrolling and adjusts for the fixed header's height — but only on viewports wider than 768px, since the header is not fixed on mobile (see the `headerOffset` logic in `script.js`).

**Resume modal.** The "소개" (about) section's title and a CTA button both call `openResumeModal()` (defined in `script.js`), which toggles `.active`/`aria-hidden` on `#resumeModal` and locks body scroll. The modal contains detailed career/resume tables hardcoded directly in `index.html`. Closing happens via the `&times;` button, clicking the overlay, or Escape — all wired to `closeResumeModal()`.

**Contact form submits to Google Apps Script, not a backend.** `#consultingForm` in `index.html` posts via `fetch` to a hardcoded Google Apps Script web app URL (`scriptURL` in `script.js`), using `URLSearchParams`/`FormData` as `x-www-form-urlencoded`. There is no server code in this repo for that endpoint — it lives in Google Apps Script outside this project. If the endpoint URL changes, update the `scriptURL` constant in `script.js`.

**Spam mitigation is a honeypot, not a CAPTCHA.** The form has a hidden `#website` field (`.hp-field`, `aria-hidden`, `tabindex="-1"`) that real users never see or fill. If it has a value on submit, `script.js` silently drops the submission. Keep this field present and hidden if editing the form markup.

**Privacy consent toggle.** `togglePrivacy()` is defined twice — once inline in `index.html` and once in `script.js` — both toggling the same `#privacy-detail` box. Keep both in sync (or consolidate) if changing this behavior.

**Responsive breakpoint.** The site uses a single breakpoint at `768px` throughout `styles.css` for mobile layout adjustments (hero spacing, footer spacing, about stats, services, book section, form).

**External dependencies loaded via CDN** (no local copies): Google Fonts (Noto Sans KR, Playfair Display) and Font Awesome 6.4.0 icons, both linked in `index.html`'s `<head>`.

**Scroll-in animations.** `script.js` uses an `IntersectionObserver` to add a `.visible` class to `.about-card` and `.service-item` elements as they enter the viewport (fading/translating in); the corresponding `.visible` CSS is injected dynamically into `<head>` by the script itself rather than living in `styles.css`.

**정책자금 및 수출금융 페이지 (`policy-finance.html`).** 서비스 카드 01에서 연결되는 별도 페이지로, `policy-finance.css`·`policy-finance.js`를 쓴다(`script.js`는 `#resumeModal`이 없어 로드하지 않는다). 1부는 탐색 사이트·보증기관 카드, 2부는 기관별 탭(소진공·중진공·신용보증기금·무보·aT·수출입은행·기보·무역협회·서울신보 — 서울신보는 상품별 링크만 연결)이며 각 기관의 자금 체계(성장단계 등)에 맞춰 표를 손으로 작성한 정적 HTML이다. 탭 전환만 JS가 맡고 `?org=kosmes` 같은 쿼리로 바로 열 수 있다. 기관을 추가하려면 `.pf-tab`(비활성 ‘준비 중’ 탭을 `data-org`로 바꾸기)와 `#panel-<org>`를 추가한다. 표는 모바일(768px 이하)에서 `data-label` 기반 카드로 바뀐다. 한도·금리는 기관 공식 안내를 옮긴 것이므로 수정 시 원문 링크(`.pf-source`)를 함께 확인한다.

**무역보험 및 수출 안전망 페이지 (`trade-insurance.html`).** 서비스 카드 02에서 연결되는 별도 페이지로 `policy-finance.css`를 함께 쓴다(JS 없음). 무역보험 전반(i-800), 국외기업 신용조사, 바이어 정보 검색(K-SIGHT), 단기성 보험, 신용보증, 환변동보험은 무보 홈페이지 안내를 옮긴 정적 HTML이고, K-SURE ON은 외부 링크만 연결한다. '단기성 보험' 바로 뒤에 '농수산물 특화'(단기수출보험 농수산물패키지, `#ksure-agri`) 섹션과 '보상절차 및 면책사례'(`#claim`, 칩은 '환변동보험' 다음, 무보 '보험금 지급 안내' 인용·절차도는 `.ti-steps`로 재구성) 섹션이 있다(원래 policy-finance의 무보 탭에 있던 것을 옮겼다). 이 섹션 안의 '면책사례'(`#claim-exempt`)는 무보 「16가지 사례로 배우는 단기수출보험 보상 가이드(2022.4.)」 인용분과 무보 홈페이지 면책사례를 저서 『수출 첫걸음』 7장 구성(10개 유형)으로 정리한 글이다. 단기수출보험 전반 내용이라 '중소중견Plus+' 표기를 쓰지 않고, 하단에 무보 면책사례 게시판(`ksure.or.kr/rh-kr/bbs/i-332/list.do`) 링크가 있다. 보험료율·한도는 수시로 바뀌므로 수정 시 원문(`.pf-source`)을 확인한다. '무역보험 Q&A'(`#qna`)는 질문마다 `<details class="qa-item">`(스타일은 `policy-finance.css` 끝)로, 질문만 보이고 '답변 보기'를 누르면 그 답만 펼쳐진다(JS 없음). 새 Q&A는 같은 구조(`summary.qa-q` + `div.qa-a`)로 더하고, 종목별로 `.pf-fund` 칸을 나눈다. 제목 아래 `.qa-jump`에 종목 바로가기 단추가 있으니 종목 칸(`.pf-fund`, id 필요)을 추가하면 단추도 함께 더한다. 지금은 '단기수출보험(중소중견Plus+)'(`#qna-f`, Q1~12)과 '환변동보험'(`#qna-fx`, Q1~15, 일반형 중심)이 있다. 칸마다 `.pf-foot` 면책 문구(무보 문의 안내)를 맨 끝에 둔다. 맨 끝 '무역보험 활용사례'(`#cases`, 칩은 '무역보험 유의사항' 다음)는 저서 『수출 첫걸음』 사례를 다듬어 옮긴 글이다(`.pf-case`·`.pf-quote`; 사례 속 H·I·J사는 가명).

**글로벌 진출 페이지 (`global-expansion.html`).** 서비스 카드 03에서 연결되는 별도 페이지로 `policy-finance.css`를 함께 쓴다(JS 없음). 1부는 KOTRA 서비스(AI 수출정보·트라이빅 링크, 해외시장조사·지사화·내수기업 수출기업화·바이어 트래킹·수출바우처는 KOTRA 안내 자료를 옮긴 표, 해외전시회·바이코리아 링크), 2부(`#buyer`, 번호 2)는 바이어 발굴로, K-SIGHT(`ksight.ksure.or.kr/find-buyer`)·트라이빅 링크 카드(우리 바이어 검색 길잡이 `Littlestarkr/lawsearch`의 `buyer/`는 만들어 두었으나 K-SIGHT와 같은 무보 데이터라 이 페이지에는 연결하지 않는다; 무보 데이터에는 HS코드가 없다)(`#b-search`), 무역데이터 기반 발굴(`#b-data`, Trade Map·트레이드잇 상세), 온라인 B2B 플랫폼(`#b-b2b`), KOTRA 바이어 지원 서비스 바로가기(`#b-kotra`)로 구성하고, 3부(`#b2c`, "B2C 역직구")는 초보 기업용 7단계 시작 순서(`#c-flow`)·플랫폼 선택(`#c-platform`)·국내 지원사업(`#c-support`)·물류·통관·결제(`#c-logi`)·판매 전 점검표(`#c-check`, 4번)·기관·민간 추가 지원(`#c-more`, 5번)이며 지원사업 한도·일정은 2026년 공고 기준이라 수정 시 최신 공고를 확인하고, 4부(`#others`, 번호 4~9)는 농산물·화장품·해외인증(`#cert`, 맨 앞에 해외인증 길잡이 `littlestarkr.github.io/lawsearch/cert/` 링크 카드, KOTRA 해외인증정보 API 기반으로 `Littlestarkr/lawsearch`의 `cert/` 폴더에 있다)·법령 지원(`#law`, 법령 길잡이 `littlestarkr.github.io/lawsearch` 링크)·무역통계·HS코드(`#stats`, 무역통계 길잡이 `littlestarkr.github.io/lawsearch/trade/` 링크, 번호 7)·기타(번호 8, 전시·관세) 외부 사이트 링크 카드다. 무역통계 길잡이는 별도 저장소 `Littlestarkr/lawsearch`의 `trade/` 폴더에 있다(이 저장소에는 없다). 수수료·지원금은 해마다 바뀌므로 수정 시 KOTRA 최신 공고를 확인한다. KOTRA 편 맨 끝 'KOTRA 활용사례'(`#k-cases`, 칩은 '바이코리아' 다음)는 KOTRA 『2025 내수기업 수출기업화 성공 사례집』 요약(1번)이며, 2번 '기업별 성공사례'(`#k-cases-2`, 14개 기업을 산업재·서비스·소비재 표로)가 이어진다. 출처 문구(`.pf-foot`)를 반드시 유지한다.

**정부지원사업 매칭 페이지 (`government-support.html`).** 서비스 카드 04에서 연결되는 별도 페이지로 `policy-finance.css`를 함께 쓴다(JS 없음). 수출바우처사업(개념·구성·메뉴판 14개 분야 표)과 소진공 희망리턴패키지사업(지원개요 표), 창업·R&D 지원사업(`#rnd`, 예비창업패키지 + 디딤돌·TIPS·딥테크 팁스 비교표, IRIS·K-Startup·창업진흥원·SMTECH 링크)을 각 사업 홈페이지 안내에서 옮긴 정적 HTML이며, 사업을 추가하려면 `#programs` 안에 `.pf-grp` 블록과 상단 칩을 더한다. 공고·한도는 해마다 바뀌므로 수정 시 원문을 확인한다.

**감사·응원 한마디 (`guestbook.html`).** 상단 메뉴 '상담 신청' 다음 항목으로 5개 페이지 메뉴에 연결되는 방명록이다(`guestbook.css`·`guestbook.js`, `policy-finance.css` 공유). 로그인 없이 누구나 읽고 쓰며, 글은 별도 구글 시트에 쌓인다. 백엔드는 저장소의 `guestbook-apps-script.gs`(시트에 붙여 쓰는 Apps Script 참고본; 상담 신청 스크립트와는 별개)이고, 배포 후 나온 웹 앱 URL을 `guestbook.js` 맨 위 `GUESTBOOK_URL`에 넣어야 열린다(비어 있으면 '곧 문을 엽니다'). 글은 기본 공개이고, 욕설·악담·스팸낱말·링크·전화번호·이메일·중복·너무 빠른 등록은 시트 '상태'가 '검토대기'로 자동 분류되어 작가님이 '공개'로 바꿔야 다른 사람이 본다. 시트에서 '숨김'·'삭제'로 바꾸거나 '답글' 열(화면에는 'Happy Oh 답글')을 쓸 수 있다. '비공개' 체크 글은 글쓴이 브라우저(localStorage의 글 id)에서만 보인다. 수정·삭제는 글쓴이가 정한 비밀번호(해시로 저장)로 한다. '공감해요' 버튼은 기기당 1회(localStorage `gbLiked`)로 막고 시트 '공감' 열에 합계를 쌓는다(조회수는 일부러 두지 않았다). 연락처는 받지 않는다. 스크립트를 고치면 새 버전으로 다시 배포해야 반영된다. 댓글: 글마다 '댓글' 버튼(공감해요는 원글에만)으로 펼치며 시트 'Comments' 탭(자동 생성)에 쌓인다. 기본 공개, '비공개 댓글'은 댓글 쓴 사람(localStorage `gbMineC`)과 원글 쓴 사람만 본다. 원글 쓴 사람 확인은 글 비밀번호로 받는 토큰(`gbTok`, 글 등록 시 자동 저장·다른 기기에서는 '비밀번호로 비공개 댓글 보기')을 서버가 검증한다. 댓글도 같은 자동 분류·수정·삭제·'답글' 열을 쓴다. 댓글 비밀번호는 선택이며 비우면 본인 수정·삭제가 안 된다(시트에서만 처리).

**고객사·협력사 (`showcase.html`).** 상단 메뉴 '감사·응원 한마디' 바로 앞 항목('고객사·협력사')으로 7개 페이지 메뉴에 연결된다(`showcase.css`·`showcase.js`, `policy-finance.css` 공유). 상단 [고객사]·[협력사] 탭(`.pf-tab`, `?tab=partner`로 바로 열기)으로 두 패널(`#panel-client`, `#panel-partner`)을 전환하며, 각 패널의 `.sc-grid` 안 주석에 카드(`.sc-card`) 템플릿이 있다. 카드를 넣으면 해당 패널의 `.sc-empty`(준비 중 안내)를 지운다. 고객사·협력사 이름, 이미지는 동의를 받은 것만 쓴다. sitemap은 8개 URL(privacy.html 포함).

**하위 페이지 내비게이션 (`back-nav.js`).** policy-finance·trade-insurance·global-expansion·government-support·showcase·guestbook·notices·privacy 8개 페이지가 공통으로 불러온다. 화면 왼쪽 아래에 ‘이전 화면’(같은 사이트에서 왔으면 `history.back()`, 아니면 `index.html#services`)과 ‘맨 위로’ 버튼을, 오른쪽 아래에 ‘홈’ 버튼(`index.html`, `.pf-floatnav-r`)을 띄우고(상단 소개 영역의 ‘돌아가기’ 링크는 모든 하위 페이지에서 없앴다), 각 `.pf-grp` 끝에 ‘목차로 돌아가기’ 링크(같은 패널·섹션의 `.pf-jump`로 이동)를 붙인다. 페이지 안 `#` 이동은 `replaceState`로 처리해 history 항목을 쌓지 않는다. 새 하위 페이지를 만들면 `</body>` 앞에 `<script src="back-nav.js?v=5"></script>`를 넣는다. 이력서 모달(`script.js`)은 열 때 history 항목을 하나 쌓아 브라우저 뒤로가기로도 닫히고, 상·하단에 ‘이전 화면으로 돌아가기’ 버튼이 있다.

**홈페이지 '맨 위로' 버튼.** `index.html`은 back-nav.js를 쓰지 않고, `script.js` 맨 끝이 왼쪽 아래 둥근 `.to-top` 버튼(스타일은 `styles.css` 끝)을 만든다. 300px 이상 내려가면 나타난다.

**로고의 반짝이는 별.** 9개 페이지 헤더 로고 `<h1>` 맨 앞에 인라인 SVG `.logo-star`(오각별 + 작은 반짝이 2개, 금색 그라데이션)가 있고, 반짝임(`logo-twinkle`, 3.6초)은 `styles.css` 끝에 있다. '동작 줄이기' 설정에서는 멈춘다. 새 페이지를 만들면 같은 SVG를 넣는다.

**블로그 기록 섹션 (`#writings`).** 홈페이지 `#services`와 `#contact` 사이의 카드 4개(칼럼 2종·컨설팅 사례·수출 이야기)로, 각각 네이버 블로그의 해당 분류 목록(`PostList.naver?blogId=happyojh&categoryNo=57/49/55/44` = 중소기업신문/무역신문/컨설팅/수출이야기)으로 새 탭 연결된다. 스타일은 `styles.css` 끝의 `.writing-*` 블록이며 4열→2열(1024px 이하)→1열(768px 이하)로 바뀐다. "4,000여 편"은 블로그 글 수(약 4,280편)를 반올림한 문구다. 잠금(🔒) 분류는 연결하지 않는다. `styles.css`는 `?v=2`로 캐시를 갱신한다.

**공유 미리보기·검색 등록.** `og-image.jpg`(1200×630, 2026-11 로고 이미지로 교체; 주소 뒤 `?v=3`으로 캐시 갱신, 카카오 공유 디버거에서 캐시 초기화)와 절대 주소 `og:*` 태그, `og:url`, `<link rel="canonical">`을 5개 페이지에 둔다. `robots.txt`(전체 허용 + Sitemap)와 `sitemap.xml`(8개 URL; 주소는 모두 https://www.littlestar.co.kr/ 기준)은 저장소 루트에 있고, 페이지를 추가하면 `sitemap.xml`에도 더한다. 구글 서치콘솔은 `index.html`의 `google-site-verification` 메타로 소유 확인하고 sitemap을 제출했다. 네이버 서치어드바이저는 호스트 단위(`https://littlestarkr.github.io`) 등록만 가능해서, 확인 파일과 메타는 별도 저장소 `Littlestarkr/Littlestarkr.github.io`에 있다(이 저장소에는 없다). 이 두 저장소의 확인 파일·메타는 지우지 않는다.

**구조화 데이터(JSON-LD).** 9개 페이지 모두 `</head>` 앞에 `application/ld+json` 블록이 있다. 홈은 Person(오주현) 중심이고, 하위 8개 페이지는 `WebPage` + `BreadcrumbList`(홈 > 페이지명)이며 `author`는 홈의 Person(`https://www.littlestar.co.kr/#person`)을 가리킨다. 새 페이지를 만들면 `<title>`·description·canonical과 같은 값으로 같은 블록을 넣는다.

**404 페이지 (`404.html`).** GitHub Pages가 없는 주소에 보여 주는 안내 페이지다. 어떤 깊이의 주소에서도 열리므로 CSS·링크를 모두 루트 기준 절대경로(`/styles.css`, `/index.html`)로 쓰고, `noindex`이며 canonical·og·JSON-LD·`back-nav.js`는 넣지 않는다(sitemap에도 없다). 헤더 메뉴가 바뀌면 이 파일의 메뉴도 함께 고친다.

**접근성.** 10개 페이지(404 포함) 모두 `<body>` 바로 뒤에 '본문 바로가기'(`.skip-link`)가 있고, 이동 대상은 첫 섹션(홈은 `#home`, 하위 페이지는 `#main-content`, 둘 다 `tabindex="-1"`)이다. `<nav>`에는 `aria-label="주 메뉴"`가, 메뉴에 있는 현재 페이지(고객사·협력사/응원 메시지/알림) 링크에는 `aria-current="page"`가 있다. 키보드 포커스 표시(`:focus-visible`), 건너뛰기 링크, '동작 줄이기' 설정 대응은 `styles.css` 맨 끝 블록에 있고, 부드러운 스크롤은 `prefersReducedMotion()`(script.js)·`reduceMotion()`(back-nav.js)이 설정을 따른다. 이력서 모달은 열면 닫기 버튼으로 포커스가 가고, Tab이 모달 밖으로 나가지 않으며, 닫으면 열었던 요소로 포커스가 돌아온다. 새 페이지를 만들면 같은 바로가기·`nav` 속성·`#main-content`를 넣는다.

**이미지.** 페이지에 쓰는 이미지는 WebP(`testimage.webp` 책 표지, `profile.webp` 이력서 사진, `images/*.webp`)이고, 모두 `width`·`height` 속성과 `loading="lazy"`·`decoding="async"`를 둔다(화면 크기는 CSS가 정하고 `height:auto`로 비율을 지킨다). `profile.jpg`는 JSON-LD(`image`)가 가리키므로 지우지 않는다. 공유 미리보기 `og-image.jpg`는 카카오·SNS 호환을 위해 JPG를 유지한다. 새 이미지는 WebP로 변환해(도표·글자 이미지는 무손실) 넣고, 첫 화면에 바로 보이는 이미지가 아니면 lazy를 건다.

**방문 통계(구글 애널리틱스).** 측정 ID `G-J15DSR7PZD`의 gtag 스니펫이 5개 페이지 `</head>` 앞에 있고, 각 페이지 하단에 쿠키 사용 안내 문구가 있다. 상담 신청이 성공하면 `script.js`가 `generate_lead` 이벤트를 보낸다(`form_name: 'consulting'`, 개인정보는 보내지 않는다). GA 관리 > 데이터 표시 > 이벤트에서 이 이벤트를 '주요 이벤트'로 켜 두어야 전환으로 집계된다. 새 페이지를 만들면 같은 스니펫과 안내 문구를 넣는다.

**상담 접수 후 처리(Apps Script, 저장소 밖).** `doPost`는 시트(`Sheet1` A–G열)에 행을 추가하고, 허니팟이 비어 있을 때만 ① 운영자(happyojh@gmail.com)에게 알림 메일, ② 신청자에게 접수 확인 메일(이메일 형식 검증, try/catch, 회신 주소는 운영자), ③ 8열(H, "Report")에 `Y` 표시를 한다. 스크립트를 고치면 배포 관리에서 새 버전으로 다시 배포해야 반영된다. 하루치 묶음 알림은 없다.

**개인정보 처리방침 (`privacy.html`).** 7개 페이지 하단의 쿠키 안내 문구 옆 링크와 상담 신청 동의 박스(`#privacy-detail`)에서 연결된다(`policy-finance.css` 공유). 상담 신청·방명록·구글 애널리틱스 수집 항목, 구글(국외 이전) 위탁, 보유 기간(상담 3년), 보호책임자(오주현, happyojh@gmail.com)를 담았다. 수집 항목이나 보관 방식을 바꾸면 이 페이지와 동의 문구를 함께 고친다. 시행일은 2026년 11월 2일이다.

**도메인.** 사이트 주소는 `https://www.littlestar.co.kr/`이다(저장소 루트 `CNAME` 파일 = `www.littlestar.co.kr`, GitHub Pages 브랜치 배포). DNS는 ibi.net의 DNS 설정(MY페이지 > 도메인 관리 > DNS 설정)에서 관리한다: `@` A 레코드 4개(185.199.108~111.153), `www` CNAME `littlestarkr.github.io`, `mail` A·MX는 기존 그대로. 옛 주소 `littlestarkr.github.io/export3`는 GitHub가 새 도메인으로 자동 연결한다. `CNAME` 파일을 지우면 도메인 연결이 끊긴다. og·canonical·sitemap·robots의 주소를 새 페이지에도 같은 도메인으로 쓴다.

**알림 (`notices.html`).** 상단 메뉴 '응원 메시지'(예전 '감사·응원 한마디') 다음 항목 '알림'으로 9개 페이지 메뉴에 연결된다(`notices.css`·`notices.js`, `policy-finance.css` 공유). 주요 정부 지원정책·수출 소식을 작가님이 구글 시트에 직접 적어 올리는 읽기 전용 게시판이다. 시트는 작가님만 접근하고, 저장소의 `notices-apps-script.gs`(시트에 붙여 쓰는 참고본)는 '공개' 행을 JSON으로 내려주는 `doGet`만 있다(외부에서 쓰는 기능 없음, 방명록·상담 스크립트와 별개). 배포 후 나온 웹 앱 URL을 `notices.js` 맨 위 `NOTICES_URL`에 넣어야 열린다(비어 있으면 '곧 문을 엽니다'). 시트 'Notices' 탭 열: 날짜·분류·제목·내용·링크·링크이름·상태('공개'만 표시)·고정(Y). 분류가 2개 이상이면 분류 버튼이 자동으로 생기고, 그 오른쪽에 주제어 검색칸(제목·내용·분류·날짜를 대상으로 띄어쓴 낱말을 모두 포함하는 글, 입력 즉시 필터)이 있고, 10건씩 '더 보기'로 나온다. 화면은 `textContent`로만 그리고 링크는 http(s)만 허용한다. 반영은 최대 1분(스크립트 캐시)이며 스크립트를 고치면 새 버전으로 다시 배포한다. 마지막으로 성공한 목록은 브라우저(localStorage `ntCache`)에 보관해 일시 오류 때 보여준다. 개인정보는 받지 않으므로 처리방침 변경은 없다. sitemap은 9개 URL이다.
