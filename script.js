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
            const message = document.getElementById('message').value;

            const privacyAgreement = document.getElementById('privacy-agreement').checked;

            // Google Apps Script Web App URL
            const scriptURL = 'https://script.google.com/macros/s/AKfycbwEGwrbz9cz7T5frNPEV5eaKwmNg-FONevt0blmIJfqow9apbYj7Mwi8NRWQGa_xSZb/exec';

            if (company && name && phone && email && message && privacyAgreement) {
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
                            try { if (typeof gtag === 'function') { gtag('event', 'generate_lead', { form_name: 'consulting' }); } } catch (e) {}
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
                setStatus('error', '필수 정보(기업명, 담당자 성함, 연락처, 이메일, 상담 요청 내용)를 모두 입력해 주세요.');
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
