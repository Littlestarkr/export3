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
                setStatus('error', '필수 정보(기업명, 담당자 성함, 연락처, 이메일, 상담 내용)를 모두 입력해 주세요.');
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
                // Header height offset calculation
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
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

// 이력서 모달 열기/닫기
function openResumeModal() {
    const modal = document.getElementById('resumeModal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeResumeModal() {
    const modal = document.getElementById('resumeModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function closeResumeModalOnOverlay(event) {
    if (event.target.id === 'resumeModal') {
        closeResumeModal();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeResumeModal();
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