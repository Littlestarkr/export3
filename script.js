document.addEventListener('DOMContentLoaded', () => {
    // Form Submission Handler
    const form = document.getElementById('consultingForm');

    if (form) {
        const statusEl = document.getElementById('formStatus');

        const setStatus = (type, text) => {
            if (!statusEl) return;
            statusEl.textContent = text;
            statusEl.className = 'form-status ' + type;
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Honeypot: real users never fill this hidden field. Bots that do are dropped silently.
            const honeypot = document.getElementById('website').value;
            if (honeypot) {
                return;
            }

            // Basic Validation Check
            const company = document.getElementById('company').value;
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;
            // 상담 요청 내용은 선택 항목이다(동의문 '상담 요청 내용 (선택)'과 같게).

            const privacyAgreement = document.getElementById('privacy-agreement').checked;

            // Google Apps Script Web App URL
            const scriptURL = 'https://script.google.com/macros/s/AKfycbwEGwrbz9cz7T5frNPEV5eaKwmNg-FONevt0blmIJfqow9apbYj7Mwi8NRWQGa_xSZb/exec';

            if (company.trim() && name.trim() && phone.trim() && email.trim() && privacyAgreement) {
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerText;

                // Loading State
                submitBtn.disabled = true;
                submitBtn.innerText = '전송 중...';
                setStatus('', '');

                // Use URLSearchParams for x-www-form-urlencoded (more reliable for Google Apps Script)
                const formData = new FormData(form);
                const data = new URLSearchParams(formData);
                data.set('privacy_agreement', 'Y');

                // Check if scriptURL is set (simple check)
                if (scriptURL === 'YOUR_GOOGLE_SCRIPT_URL_HERE' || !scriptURL.includes('script.google.com')) {
                    setStatus('error', '상담 신청을 접수할 수 없습니다. 카카오톡이나 이메일로 문의해 주세요.');
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                    return;
                }

                fetch(scriptURL, {
                    method: 'POST',
                    body: data
                })
                    .then(response => response.json())
                    .then(response => {
                        if (response.result === 'success') {
                            setStatus('success', `감사합니다, ${name}님. 상담 신청이 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.`);
                            form.reset();
                            // 방문 통계: 상담 신청 1건 기록 (개인정보는 전송하지 않음)
                            try { if (typeof gtag === 'function') { gtag('event', 'generate_lead', window.egLeadSource ? { form_name: 'consulting', lead_source: window.egLeadSource } : { form_name: 'consulting' }); } } catch (e) {}
                        } else {
                            throw new Error(response && response.error ? String(response.error) : 'unknown error');
                        }
                        submitBtn.disabled = false;
                        submitBtn.innerText = originalBtnText;
                    })
                    .catch(error => {
                        console.error('Consulting form submission failed:', error.message);
                        setStatus('error', '상담 신청 접수에 실패했습니다. 잠시 후 다시 시도하시거나 카카오톡/이메일로 문의해 주세요.');
                        submitBtn.disabled = false;
                        submitBtn.innerText = originalBtnText;
                    });
            } else {
                setStatus('error', '필수 정보(기업명, 담당자 성함, 연락처, 이메일)를 모두 입력하고 개인정보 수집·이용에 동의해 주세요.');
            }
        });
    }

    // Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                // Header height offset calculation (header is not fixed on mobile)
                const headerOffset = window.matchMedia('(max-width: 768px)').matches ? 0 : 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: prefersReducedMotion() ? "auto" : "smooth"
                });
                if (this.classList.contains('skip-link')) {
                    targetElement.focus({ preventScroll: true });
                }
            }
        });
    });

    // Scroll Animation Observer (Optional Enhancement)
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.about-card, .service-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add visible class styling dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        .visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
});

// '동작 줄이기' 설정이면 부드러운 스크롤을 쓰지 않는다
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// 이력서 모달 열기/닫기 (브라우저 뒤로가기 버튼으로도 닫히도록 history 항목을 하나 쌓는다)
let modalOpener = null;
function openResumeModal() {
    const modal = document.getElementById('resumeModal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.scrollTop = 0;
    modalOpener = document.activeElement;
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
    try { history.pushState({ resume: true }, ''); } catch (e) {}
}

function hideResumeModal() {
    const modal = document.getElementById('resumeModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (modalOpener && document.contains(modalOpener)) modalOpener.focus({ preventScroll: true });
    modalOpener = null;
}

function closeResumeModal() {
    const modal = document.getElementById('resumeModal');
    if (!modal.classList.contains('active')) return;
    if (history.state && history.state.resume) {
        history.back(); // popstate 핸들러가 모달을 닫는다
    } else {
        hideResumeModal();
    }
}

window.addEventListener('popstate', () => {
    const modal = document.getElementById('resumeModal');
    if (modal && modal.classList.contains('active') && !(history.state && history.state.resume)) {
        hideResumeModal();
    }
});

function closeResumeModalOnOverlay(event) {
    if (event.target.id === 'resumeModal') {
        closeResumeModal();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeResumeModal();
        return;
    }
    // 팝업이 열려 있는 동안 Tab 키가 팝업 밖으로 나가지 않게 한다
    if (e.key !== 'Tab') return;
    const modal = document.getElementById('resumeModal');
    if (!modal || !modal.classList.contains('active')) return;
    const items = modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
    }
});

// 개인정보 상세 보기 토글 함수
function togglePrivacy() {
    const detail = document.getElementById('privacy-detail');
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
    } else {
        detail.style.display = 'none';
    }
}
// 맨 위로 버튼: 300px 이상 내려가면 왼쪽 아래에 나타난다
(function () {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'to-top';
    btn.setAttribute('aria-label', '맨 위로');
    btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
    const toggle = () => btn.classList.toggle('show', window.scrollY > 300);
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
})();


// 상담 신청 양식 펼치기/접기 (PC·모바일 공통) (주소가 #contact 이거나 '상담 신청' 링크를 누르면 바로 펼친다)
(function () {
    var btn = document.getElementById('contactToggle');
    var wrap = document.getElementById('contactFormWrap');
    if (!btn || !wrap) return;
    function setOpen(open, scroll) {
        wrap.classList.toggle('is-collapsed', !open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? '신청 양식 접기' : '상담 신청하기';
        if (open && scroll) {
            btn.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        }
    }
    btn.addEventListener('click', function () {
        setOpen(wrap.classList.contains('is-collapsed'), true);
    });
    var closeBtn = document.getElementById('contactClose');
    if (closeBtn) closeBtn.addEventListener('click', function () {
        setOpen(false, false);
        btn.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
        btn.focus({ preventScroll: true });
    });
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href="#contact"]');
        if (a) setOpen(true, false);
    });
    if (location.hash === '#contact') setOpen(true, false);
    window.addEventListener('hashchange', function () {
        if (location.hash === '#contact') setOpen(true, false);
    });
})();

// 방문 통계: 카카오톡 문의(오픈채팅) 링크 클릭 1건 기록. 개인정보는 보내지 않는다.
// GA 이벤트 이름 'kakao_click', 매개변수 link_area = 'home_contact'(홈 상담 영역) / 'page_cta'(하위 페이지 하단 상담 안내).
(function () {
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href*="open.kakao.com"]');
        if (!a) return;
        try {
            if (typeof gtag === 'function') {
                gtag('event', 'kakao_click', {
                    link_area: a.closest('.eg-consult') ? 'export_guide' : a.closest('#contact') ? 'home_contact' : (a.closest('.pf-cta') ? 'page_cta' : 'other'),
                    transport_type: 'beacon'
                });
            }
        } catch (err) {}
    });
})();

// 수출 가이드(export-guide.html)에서 '상담 신청서로' 넘어오면 결과 요약을 '상담 요청 내용'에 채운다.
// sessionStorage 'egHandoff'는 읽자마자 지운다. 신청 성공 시 generate_lead 에 lead_source 'export_guide'가 붙는다.
(function () {
    var text = '';
    try { text = sessionStorage.getItem('egHandoff') || ''; sessionStorage.removeItem('egHandoff'); } catch (e) { return; }
    if (!text) return;
    var msg = document.getElementById('message');
    var wrap = document.getElementById('contactFormWrap');
    if (!msg || !wrap) return;
    window.egLeadSource = 'export_guide';
    // 요약 끝에 '(상담 요청 추가 내용): '을 붙여 이어서 적게 하고, 처음 칸을 누르면 커서를 맨 끝(그 문구 뒤)에 둔다(2026-11-22 작가님)
    var TAIL = '\n(상담 요청 추가 내용): ';
    if (!msg.value.trim()) {
        msg.value = text.slice(0, 1500 - TAIL.length) + TAIL;
        var placed = false;
        msg.addEventListener('focus', function () {
            if (placed) return;
            placed = true;
            setTimeout(function () {
                var end = msg.value.length;
                try { msg.setSelectionRange(end, end); } catch (e) {}
                msg.scrollTop = msg.scrollHeight;
            }, 0);
        });
    }
    var note = document.createElement('p');
    note.className = 'eg-handoff';
    note.setAttribute('role', 'status');
    note.textContent = '수출 가이드 결과 요약을 \'상담 요청 내용\'에 넣어 두었습니다. 맨 끝 \'(상담 요청 추가 내용):\' 뒤에 이어서 적어 주세요. 기업명·성함·연락처·이메일은 직접 입력해 주세요.';
    var form = document.getElementById('consultingForm');
    (form || wrap).insertBefore(note, (form || wrap).firstChild);
    // 양식을 펼친 채로 '상담 요청 내용'이 든 신청서 첫머리(이 안내 문구)로 바로 이동한다.
    // 예전에는 단추 클릭으로 펼친 뒤 브라우저가 주소의 #contact(Contact Info 맨 위)로 다시 끌어올려,
    // 카카오톡·이메일 단추부터 보이고 양식은 한참 아래에 있었다(2026-11-24 작가님).
    var toggle = document.getElementById('contactToggle');
    wrap.classList.remove('is-collapsed');
    if (toggle) {
        toggle.setAttribute('aria-expanded', 'true');
        toggle.textContent = '신청 양식 접기';
    }
    function goForm() {
        note.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    goForm();
    // 주소의 #contact 로 브라우저가 페이지를 다 불러온 뒤 다시 옮기므로, 불러오기가 끝난 뒤 한 번 더 맞춘다.
    // 그다음 '상담 요청 내용' 칸 맨 끝('(상담 요청 추가 내용): ' 뒤)에 입력 커서를 둔다(2026-11-24 작가님, 예전 형태).
    // 화면은 안내 문구 위치 그대로 두고(preventScroll), 휴대폰 키보드가 올라오면 브라우저가 칸을 보이게 올린다.
    function goCaret() {
        goForm();
        try { msg.focus({ preventScroll: true }); } catch (e) { msg.focus(); }
    }
    if (document.readyState === 'complete') setTimeout(goCaret, 0);
    else window.addEventListener('load', function () { setTimeout(goCaret, 0); });
})();
