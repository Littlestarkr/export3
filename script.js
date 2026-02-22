document.addEventListener('DOMContentLoaded', () => {
    // Form Submission Handler
    const form = document.getElementById('consultingForm');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

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

                // Use URLSearchParams for x-www-form-urlencoded (more reliable for Google Apps Script)
                const formData = new FormData(form);
                const data = new URLSearchParams(formData);
                data.set('privacy_agreement', 'Y');

                // Check if scriptURL is set (simple check)
                if (scriptURL === 'YOUR_GOOGLE_SCRIPT_URL_HERE' || !scriptURL.includes('script.google.com')) {
                    alert('오류: Google Apps Script URL이 설정되지 않았습니다.\nscript.js 파일을 열어 줄 19행의 scriptURL 변수에 배포된 웹 앱 URL을 입력해주세요.');
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
                            alert(`감사합니다, ${name}님. 상담 신청이 성공적으로 접수되었습니다.\n빠른 시일 내에 연락드리겠습니다.`);
                            form.reset();
                        } else {
                            throw new Error('Script Error: ' + JSON.stringify(response));
                        }
                        submitBtn.disabled = false;
                        submitBtn.innerText = originalBtnText;
                    })
                    .catch(error => {
                        console.error('Error!', error.message);
                        alert(`상담 신청 접수에 실패했습니다.\n\n[오류 내용]\n${error.message}\n\nGoogle Apps Script 배포 URL이 정확한지 확인해주세요.`);
                        submitBtn.disabled = false;
                        submitBtn.innerText = originalBtnText;
                    });
            } else {
                alert('필수 정보(기업명, 담당자 성함, 연락처, 이메일, 상담 내용)를 모두 입력해주세요.');
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

// 개인정보 상세 보기 토글 함수
function togglePrivacy() {
    const detail = document.getElementById('privacy-detail');
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
    } else {
        detail.style.display = 'none';
    }
}