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

**정책자금 및 수출금융 페이지 (`policy-finance.html`).** 서비스 카드 01에서 연결되는 별도 페이지로, `policy-finance.css`·`policy-finance.js`를 쓴다(`script.js`는 `#resumeModal`이 없어 로드하지 않는다). 1부는 탐색 사이트·보증기관 카드, 2부는 기관별 탭(소진공·중진공·신용보증기금·무보·aT·수출입은행)이며 각 기관의 자금 체계(성장단계 등)에 맞춰 표를 손으로 작성한 정적 HTML이다. 탭 전환만 JS가 맡고 `?org=kosmes` 같은 쿼리로 바로 열 수 있다. 기관을 추가하려면 `.pf-tab`(비활성 ‘준비 중’ 탭을 `data-org`로 바꾸기)와 `#panel-<org>`를 추가한다. 표는 모바일(768px 이하)에서 `data-label` 기반 카드로 바뀐다. 한도·금리는 기관 공식 안내를 옮긴 것이므로 수정 시 원문 링크(`.pf-source`)를 함께 확인한다.
