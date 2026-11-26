/* =========================================
   수출 가이드 (export-guide.html) — 질문·링크·추천 규칙 데이터
   문구·링크·점수만 고칠 때는 이 파일만 고친다. 고치면 MAP_VERSION 을 1 올린다(시트 '매핑 버전' 열).
   링크는 사이트 안 페이지·칸 id 기준(2026-11-22 확인). 페이지 칸 id 가 바뀌면 여기도 함께 고친다.
   설계: Claude Doc '수출 가이드 PRD'
   ========================================= */
(function () {
    'use strict';

    var MAP_VERSION = 55;

    // 수출실적 7단계(핵심 축). 순서 = 단계 번호(0~6)
    var STAGES = [
        { v: 's0', label: '없음', short: '실적 없음' },
        { v: 's1', label: '1천 달러 미만', short: '1천 달러 미만' },
        { v: 's2', label: '1천 달러 이상 ~ 1만 달러 미만', short: '1천~1만 달러' },
        { v: 's3', label: '1만 달러 이상 ~ 10만 달러 미만', short: '1만~10만 달러' },
        { v: 's4', label: '10만 달러 이상 ~ 100만 달러 미만', short: '10만~100만 달러' },
        { v: 's5', label: '100만 달러 이상 ~ 1천만 달러 미만', short: '100만~1천만 달러' },
        { v: 's6', label: '1천만 달러 이상', short: '1천만 달러 이상' }
    ];

    // 최근 1년(또는 전년도) 매출실적 6구간(매칭 5단계, 2026-11-23 작가님: 매출 없음과 1억 원 미만 구분)
    var REVENUES = [
        { v: 'r0', label: '매출 없음', short: '매출 없음', tier: 1 },
        { v: 'r1', label: '1억 원 미만', short: '1억 원 미만', tier: 1 },
        { v: 'r2', label: '1억 ~ 5억 원 미만', short: '1억~5억 원', tier: 2 },
        { v: 'r3', label: '5억 ~ 20억 원 미만', short: '5억~20억 원', tier: 3 },
        { v: 'r4', label: '20억 ~ 100억 원 미만', short: '20억~100억 원', tier: 4 },
        { v: 'r5', label: '100억 원 이상', short: '100억 원 이상', tier: 5 }
    ];

    // 진행 거래 계약금액 5구간(Q1 보조 질문의 꼬리 질문, 2026-11-24 작가님). 협상·샘플 진행 중이면 예상 금액
    var DEALS = [
        { v: 'd1', label: '1천 달러 미만', short: '1천 달러 미만' },
        { v: 'd2', label: '1천 달러 이상 ~ 1만 달러 미만', short: '1천~1만 달러' },
        { v: 'd3', label: '1만 달러 이상 ~ 10만 달러 미만', short: '1만~10만 달러' },
        { v: 'd4', label: '10만 달러 이상 ~ 50만 달러 미만', short: '10만~50만 달러' },
        { v: 'd5', label: '50만 달러 이상', short: '50만 달러 이상' }
    ];

    // 애로사항(Q6) 10개
    var ISSUES = {
        buyer:   '바이어를 못 찾겠다',
        docs:    '수출서류·계약서가 어렵다',
        collect: '대금을 못 받을까 걱정된다',
        fund:    '생산·선적 전 자금이 부족하다',
        factoring: '수출채권 유동화(선적 후 대금 조기 현금화)가 필요하다',
        fx:      '환율 변동이 부담된다',
        importer: '수입자 신용조사가 필요하다',
        cert:    '해외인증·규제를 모른다',
        hs:      'HS코드·관세·통관을 모른다',
        support: '받을 수 있는 정부지원사업을 모른다',
        fraud:   '계좌변경·무역사기가 걱정된다',
        market:  '어느 나라로 갈지 모르겠다',
        tclaim:  '무역클레임(품질·수량·납기 분쟁)이 걱정된다',
        etc:     '기타(찾는 서비스 직접 적기)'
    };
    // '기타'(2026-11-22 작가님): '더 보기' 목록 맨 끝에 있고(2026-11-24), 고르면 입력칸(100자)이 열린다. 전체 선택에는 넣지 않는다.
    // 적은 글은 아래 낱말과 맞춰 안내한다(소문자로 바꿔 '포함' 여부만 본다). 시트에는 글을 보내지 않고 '기타' 선택 여부만 저장한다.
    var ETC_KEYWORDS = [
        { k: ['전시', '박람회', '엑스포', '상담회', 'expo', 'fair'], ids: ['k-exhib', 'akei'] },
        { k: ['바이어', '거래처', '수입상', '판로', 'buyer'], ids: ['buyer', 'ksight', 'buykorea'] },
        { k: ['시장조사', '시장 조사', '유망시장', '유망 시장'], ids: ['k-market', 'trade-stats'] },
        { k: ['지사'], ids: ['k-branch'] },
        { k: ['보증', '대출', '융자', '자금', '정책자금', '운전자금', '시설자금'], ids: ['policy-fund', 'guarantee', 'kodit', 'kibo'] },
        { k: ['무역진흥자금', '무역협회'], ids: ['kita-fund'] },
        { k: ['수출입은행'], ids: ['exim'] },
        { k: ['보험', '미수', '대금', '떼일', '떼인', '못 받', '못받'], ids: ['ksure-plus', 'claim'] },
        { k: ['신용조사', '신용 조사', '신용도'], ids: ['credit'] },
        { k: ['환율', '환변동', '환리스크', '환 리스크'], ids: ['fx'] },
        { k: ['인증', '규격', '할랄', 'fda', 'ce마크', 'ce 마크'], ids: ['cert'] },
        { k: ['hs', '관세', '통관', 'fta', '원산지'], ids: ['trade-stats', 'customs'] },
        { k: ['법령', '법률', '대외무역법', '관세법'], ids: ['lawsearch'] },
        { k: ['계약'], ids: ['contract'] },
        { k: ['서류', '인보이스', 'invoice', '패킹', '오퍼', '선적통지'], ids: ['doc-builder', 'export-docs'] },
        { k: ['사기', '해킹', '계좌변경', '계좌 변경'], ids: ['fraud'] },
        { k: ['클레임', '분쟁', '중재', '조정'], ids: ['trade-claim', 'kcab'] },
        { k: ['바우처'], ids: ['voucher'] },
        { k: ['창업', 'r&d', '연구개발', '팁스', 'tips'], ids: ['rnd', 'kibo-rnd'] },
        { k: ['재기', '재도전', '재창업', '채무조정'], ids: ['kibo-retry', 'kodit-retry', 'kosmes-restart', 'semas-retry'] },
        { k: ['기보', '기술보증'], ids: ['kibo', 'kibo-rnd', 'kibo-retry'] },
        { k: ['온라인', '쇼핑몰', '아마존', '역직구', '이커머스', 'b2c'], ids: ['c-amazon', 'gm-kosmes', 'op-semas', 'b2c', 'c-more'] },
        { k: ['b2b', '플랫폼'], ids: ['b-b2b', 'buykorea'] },
        { k: ['물류', '배송', '운송', '포워딩', '포워더'], ids: ['c-logi', 'customs'] },
        { k: ['수입보험', '선급금', '원자재 수입'], ids: ['import-ins'] },
        { k: ['벤처', '이노비즈', 'innobiz', '기업부설연구소', '연구소', '기업인증'], ids: ['biz-cert'] },
        { k: ['메인비즈', 'mainbiz', '경영혁신'], ids: ['biz-cert-mainbiz'] },
        { k: ['iso', '품질경영', '환경경영', '안전보건', '식품안전'], ids: ['iso-cert'] },
        { k: ['공공조달', '조달', '수의계약', '나라장터', 'b2g'], ids: ['public-proc'] },
        { k: ['혁신제품', '혁신장터'], ids: ['pp-innov', 'iso-cert'] },
        { k: ['녹색제품', '환경표지', '저탄소', 'gr인증'], ids: ['pp-green', 'iso-cert'] },
        { k: ['우수조달', '우수제품'], ids: ['pp-excellent', 'iso-cert'] },
        { k: ['직접생산', '중소기업자간', '중소기업간'], ids: ['pp-sme-mfg'] },
        { k: ['벤처나라'], ids: ['pp-venture'] },
        { k: ['지방소재', '비수도권', '지방기업'], ids: ['pref-cond', 'seoul-shinbo', 'voucher'] },
        { k: ['여성기업', '액셀러레이팅', '엑셀러레이팅'], ids: ['women-accel', 'pp-women'] },
        { k: ['채권', '팩토링', '현금화', '유동화', '네고'], ids: ['ksure-postship'] },
        { k: ['농산물', '수산물', '식품', '농식품'], ids: ['agri', 'at'] },
        { k: ['화장품', '뷰티', '미용'], ids: ['cosmetic'] },
        { k: ['의료기기', '바이오', '헬스케어', '식약처'], ids: ['cert-medical', 'cert'] },
        { k: ['전략물자', 'yestrade', '수출통제', '전기전자', 'ul', 'fcc'], ids: ['cert-elec', 'customs'] },
        { k: ['상표', '특허', '지재권', '지식재산', 'ip-desk'], ids: ['ip-help'] },
        { k: ['내수기업', '첫 수출', '첫수출', '처음 수출', '소상공인'], ids: ['smb-strategy', 'k-domestic'] },
        { k: ['우대', '여성기업', '장애인기업', '사회적기업', '벤처', '이노비즈', '메인비즈', '청년기업', '기업부설연구소'], ids: ['pref-cond', 'policy-fund'] },
        { k: ['컨설팅', 'trade-sure', '트레이드슈어', '무료 자문', '무료자문'], ids: ['trade-sure'] },
        { k: ['고비즈', 'gobiz', '바이코리아', 'buykorea'], ids: ['gobizkorea', 'buykorea-portal'] },
        { k: ['트라이빅', 'tribig', '해외경제정보', 'dream'], ids: ['tribig', 'kotra-dream', 'kita-portal'] },
        { k: ['내국신용장', '구매확인서', '로컬', 'local'], ids: ['bok-local', 'bok-tf'] },
        { k: ['기업은행', 'ibk', '무역금융', '관세피해'], ids: ['bok-tf', 'ibk-export', 'ibk-smallbiz'] },
        { k: ['최신', '공고', '소식'], ids: ['notices'] }
    ];
    // Q2 '혁신·녹색·우수조달제품' 세부 선택(선택 안 하면 3종 모두 추천, 2026-11-26)
    var Q2_PROC_OPTS = [
        { v: 'innov', label: '혁신제품' },
        { v: 'green', label: '녹색제품' },
        { v: 'excellent', label: '우수조달물품' }
    ];
    // Q2 우대 조건 '기타' 입력 키워드 매칭(지방소재·비수도권·ESG·소부장·ISO·가족친화 등, 2026-11-26)
    var Q2_ETC_KEYWORDS = [
        { k: ['지방', '비수도권', '수도권 외', '수도권외', '지역', '글로컬', '지방소재', '지방기업', '지역특화'],
          flags: ['localBiz', 'esg'],
          ids: ['pref-cond', 'seoul-shinbo', 'voucher', 'policy-fund', 'exim-promo'],
          why: '지방소재·비수도권 기업 지역 우대·보증·수출지원 추천' },
        { k: ['소부장', '소재부품', '소재·부품', '뿌리', '부품장비'],
          flags: ['esg'],
          ids: ['pref-cond', 'import-ins', 'biz-cert', 'iso-cert'],
          why: '소부장·뿌리기업 우대 보증·공급망·인증 지원 추천' },
        { k: ['esg', '친환경', '탄소', 're100', '넷제로'],
          flags: ['esg'],
          ids: ['pref-cond', 'iso-cert', 'pp-green'],
          why: 'ESG·친환경 기업 우대 보증·ISO 14001·녹색조달 추천' },
        { k: ['스마트공장', '스마트제조', '자동화'],
          flags: ['esg'],
          ids: ['pref-cond', 'iso-cert', 'biz-cert'],
          why: '스마트공장·스마트제조 기업 정책자금·인증 우대 추천' },
        { k: ['iso', '9001', '14001', '45001', '22000', '13485', 'iatf', '품질경영', '환경경영', '안전보건', 'haccp', '해썹'],
          flags: ['q2EtcIso'],
          ids: ['iso-cert', 'cert', 'pref-cond'],
          why: 'ISO·품질·환경 경영시스템 인증 연계 정부지원·조달 가점 추천' },
        { k: ['혁신제품', '혁신장터', '혁신조달'],
          flags: ['procInnov'],
          ids: ['pp-innov', 'iso-cert'],
          why: '혁신제품 공공조달 3년 금액 제한 없는 수의계약·시범구매 추천' },
        { k: ['녹색', '환경표지', '저탄소', 'gr인증'],
          flags: ['procGreen', 'esg'],
          ids: ['pp-green', 'iso-cert'],
          why: '녹색제품 공공조달 의무구매·수의계약·ISO 14001 연계 추천' },
        { k: ['우수조달', '우수제품'],
          flags: ['procExcl'],
          ids: ['pp-excellent', 'iso-cert'],
          why: '우수조달물품 나라장터 종합쇼핑몰 직행·15% 의무구매 추천' },
        { k: ['벤처나라'],
          ids: ['pp-venture'],
          why: '조달청 벤처나라 전용 쇼핑몰 등록 추천' },
        { k: ['직접생산', '중소기업자간', '중소기업간'],
          ids: ['pp-sme-mfg'],
          why: '중소기업자 간 경쟁제품·직접생산확인 입찰 참여 추천' },
        { k: ['공공조달', '조달', '수의계약', '나라장터', 'b2g'],
          ids: ['public-proc'],
          why: '공공조달 우대지원·수의계약 특례 안내' },
        { k: ['가족친화', '일자리', '고용', '청년친화', '강소', '수출유망', '유망중소', '백년소공인', '백년가게', '선도기업', '명문장수'],
          ids: ['pref-cond', 'policy-fund', 'kodit-export', 'voucher', 'ksure-plus'],
          why: '우대 인증·선정기업 정책금융·보증·수출바우처 가점 추천' },
        { k: ['특허', '지재권', '지식재산', '실용신안', '디자인권', 'ip'],
          ids: ['kibo-rnd', 'ip-help', 'biz-cert', 'pref-cond'],
          why: '특허·지식재산 보유기업 기술보증·IP 지원·기업인증 추천' },
        { k: ['소공인', '소상공인'],
          ids: ['pp-small', 'smb-strategy'],
          why: '소상공인·소공인 공공조달 수의계약 우대·첫수출 전략 추천' }
    ];
    // 단계별로 먼저 보이는 애로(순서대로, 6~9개). 나머지는 '다른 어려움 더 보기'
    // 2026-11-22 작가님: 10만 달러 이상이어도 바이어·시장·인증은 필요 → 1만 달러 이상은 9개를 먼저 보인다
    var ISSUE_ORDER = {
        s0: ['market', 'buyer', 'support', 'cert', 'hs', 'docs'],
        s1: ['buyer', 'docs', 'hs', 'cert', 'support', 'fraud'],
        s2: ['buyer', 'docs', 'collect', 'fund', 'fraud', 'support', 'cert', 'hs'],
        s3: ['buyer', 'collect', 'importer', 'fund', 'market', 'cert', 'docs', 'factoring', 'tclaim'],
        s4: ['buyer', 'market', 'cert', 'collect', 'importer', 'fund', 'factoring', 'fx', 'tclaim'],
        s5: ['buyer', 'market', 'cert', 'fx', 'collect', 'importer', 'factoring', 'tclaim', 'fund'],
        s6: ['buyer', 'market', 'cert', 'fx', 'collect', 'importer', 'factoring', 'tclaim', 'fund']
    };
    var ISSUE_HELP = {
        s0: '어디서부터 시작할지 막막하신가요? 가장 가까운 것을 골라 주세요.',
        s1: '샘플·소량 거래를 정식 거래로 키우는 단계입니다.',
        s2: '거래를 늘리며 서류·대금을 다지는 단계입니다.',
        s3: '바이어가 늘고 외상·자금 문제가 생기는 단계입니다.',
        s4: '규모가 커지며 위험 관리가 필요한 단계입니다.',
        s5: '신시장·대형 거래를 다지는 단계입니다.',
        s6: '대형 거래·글로벌 확장을 관리하는 단계입니다.'
    };

    var PREF_VALS = ['youth', 'women', 'disabled', 'social', 'venture', 'innobiz', 'mainbiz', 'lab', 'mfg', 'restart', 'proc_cert', 'pref_etc'];

    // 질문. type: one(하나) | multi(여러 개). 모두 필수(2026-11-24 건너뛰기 없앰). when: 보일 조건
    var QUESTIONS = [
        {
            id: 'q1', type: 'one', title: '최근 1년(또는 전년도) 수출 및 매출실적은 얼마인가요?',
            help: '수출실적(직수출·로컬 수출·온라인 해외 판매 합산)과 최근 1년(또는 전년도) 매출실적을 각각 하나씩 골라 주세요. 정확히 모르면 대략적인 구간을 골라 주세요.',
            subLabel: '최근 1년(또는 전년도) 수출실적',
            options: STAGES.map(function (s) { return { v: s.v, label: s.label }; }),
            extraOne: {
                id: 'q1r',
                label: '최근 1년(또는 전년도) 매출실적',
                options: REVENUES.map(function (r) { return { v: r.v, label: r.label }; })
            }
        },
        {
            id: 'q1b', type: 'one', title: '지금 진행 중인 해외 거래가 있나요?',
            // 2026-11-24 작가님: 실적이 있어도 추가 계약이 있으니 모두에게 묻는다(질문 9개로 통일). 실적 있음이면 보기 글자만 바뀐다(labelExp)
            help: '최근 1년 수출실적과 별개로, 지금 진행 중인 거래를 알려 주세요.',
            options: [
                { v: 'prep', label: '아직 없음(준비 중)', labelExp: '지금 진행 중인 새 거래 없음' },
                { v: 'nego', label: '바이어와 협상·샘플 진행 중' },
                { v: 'order', label: '첫 주문을 받았음', labelExp: '새 주문(계약)을 받았음' }
            ],
            // 꼬리 질문(2026-11-24 작가님): 협상·샘플 진행 중이거나 첫 주문을 받았으면 같은 화면 아래에 계약금액을 묻는다(필수).
            // '아직 없음'으로 바꾸면 고른 금액은 지운다(export-guide.js pick).
            followOne: {
                id: 'q1c',
                label: '이번 건 계약금액은 얼마인가요?',
                help: '위 1번의 최근 1년 수출실적과 별개로, 지금 진행 중인 이번 거래 한 건의 금액입니다. 협상 중이면 예상 금액을 골라 주세요.',
                when: function (a) { return a.q1b === 'nego' || a.q1b === 'order'; },
                options: DEALS.map(function (d) { return { v: d.v, label: d.label }; })
            }
        },
        {
            id: 'q2', type: 'multi', title: '회사는 어느 쪽인가요? (복수 선택 가능)',
            help: '창업 연차와 기업 규모는 하나씩, 우대 조건은 해당하는 것을 모두 고를 수 있습니다. 해당하는 항목만 골라도 됩니다.',
            // 창업 연차·기업 규모는 같은 묶음 안에서 하나만(모순 조합 방지), 우대 조건(multi: true)은 복수 선택
            groups: [
                { label: '창업 연차', vs: ['pre', 'startup', 'y7', 'y7p'] },
                { label: '우대 조건 (복수 선택 가능)', multi: true, vs: PREF_VALS },
                { label: '기업 규모', vs: ['smallbiz', 'small', 'medium', 'mid', 'large', 'etc'] }
            ],
            options: [
                { v: 'pre', label: '예비창업자' },
                { v: 'startup', label: '창업 3년 이내' },
                { v: 'y7', label: '3년 초과~7년 이내' },
                { v: 'y7p', label: '7년 초과' },
                { v: 'youth', label: '청년기업(대표자 만 39세 이하)' },
                { v: 'women', label: '여성기업' },
                { v: 'disabled', label: '장애인기업' },
                { v: 'social', label: '사회적기업' },
                { v: 'venture', label: '벤처기업' },
                { v: 'innobiz', label: '이노비즈' },
                { v: 'mainbiz', label: '메인비즈' },
                { v: 'lab', label: '기업부설연구소·전담부서' },
                { v: 'mfg', label: '제조업' },
                { v: 'restart', label: '재창업·중장년 기업' },
                { v: 'proc_cert', label: '혁신·녹색·우수조달제품' },
                { v: 'pref_etc', label: '기타' },
                { v: 'smallbiz', label: '소상공인' },
                { v: 'small', label: '소기업(소상공인 제외)' },
                { v: 'medium', label: '중기업' },
                { v: 'mid', label: '중견기업' },
                { v: 'large', label: '대기업' },
                { v: 'etc', label: '기타' }
            ]
        },
        {
            id: 'q3', type: 'multi', grid2: true, title: '어떤 품목인가요?', help: '여러 개를 고를 수 있습니다.',
            options: [
                { v: 'cosmetic', label: '화장품·뷰티', sub: '스킨케어·미용기기' },
                { v: 'agri', label: '농수산·가공식품', sub: 'K-푸드·건강기능식품' },
                { v: 'consumer', label: '생활·패션·일반소비재', sub: '의류·잡화·유아·반려동물' },
                { v: 'medical', label: '의료기기·바이오·헬스케어', sub: '의료기기·진단·건강관리' },
                { v: 'electronics', label: '전기·전자·IT기기', sub: '가전·스마트기기·부품' },
                { v: 'industrial', label: '기계·장비·소재·부품', sub: '산업용·소부장·금속·화학' },
                { v: 'service', label: '서비스·SW·콘텐츠', sub: '앱·게임·디자인·용역' },
                { v: 'etc', label: '기타', sub: '복합·특수 품목' }
            ]
        },
        {
            id: 'q4', type: 'multi', title: '(희망하는) 무역 거래 형태는?', help: '여러 개를 고를 수 있습니다. 원자재·상품을 들여오는 경우 \'수입\'도 골라 주세요.',
            options: [
                { v: 'local', label: '로컬 수출' },
                { v: 'b2c', label: 'B2C 온라인 판매' },
                { v: 'b2b', label: '일반수출(B2B)' },
                { v: 'relay', label: '중계무역' },
                { v: 'import', label: '수입' },
                { v: 'other', label: '기타' }
            ]
        },
        {
            id: 'q5', type: 'multi', title: '목표 시장은 어디인가요?', help: '여러 개를 고를 수 있습니다.', exclusive: ['undecided'],
            options: [
                { v: 'undecided', label: '아직 미정' },
                { v: 'cnjp', label: '중국·일본' },
                { v: 'sea', label: '동남아' },
                { v: 'na', label: '미국·캐나다' },
                { v: 'eu', label: '유럽' },
                { v: 'mea', label: '중동·아프리카' },
                { v: 'other', label: '그 밖의 지역' }
            ]
        },
        {
            id: 'q6', type: 'multi', title: '지금 어려운 점은 무엇인가요? (복수 선택 가능)', help: '해당하는 것을 모두 골라 주세요.', selectAll: true,
            options: Object.keys(ISSUES).map(function (k) { return { v: k, label: ISSUES[k] }; })
        },
        {
            id: 'q7', type: 'multi', title: '대금은 어떤 방식으로 받나요?', titlePlan: '계획 중인 대금 결제 방식은 무엇인가요?',
            help: '여러 개를 고를 수 있습니다.', exclusive: ['unknown'],
            options: [
                { v: 'prepay', label: '선수금' },
                { v: 'lc', label: '신용장(L/C)' },
                { v: 'collection', label: '추심방식(D/P, D/A)' },
                { v: 'deferred', label: '외상거래(선적 후 결제)' },
                { v: 'other', label: '기타' },
                { v: 'unknown', label: '아직 모름', planOnly: true }
            ]
        },
        {
            // 2026-11-24 작가님: 질문 삭제(상담 신청은 결과 화면에 이미 있음). 화면에는 안 나오고(retired),
            // 이전에 저장된 결과·기록의 글자를 읽으려고 정의만 남긴다. 추천 규칙의 'need:*'는 Q6 어려운 점과 겹쳐 따로 옮기지 않았다.
            id: 'q8', type: 'multi', retired: true, title: '지금 가장 필요한 것은 무엇인가요?', help: '여러 개를 고를 수 있습니다.',
            options: [
                { v: 'info', label: '수출 자료·도구' },
                { v: 'market', label: '시장개척·바이어 발굴' },
                { v: 'fund', label: '자금·무역보험·지원사업' },
                { v: 'consult', label: '전문가 상담' }
            ]
        }
    ];

    // 안내할 곳. ext: 새 탭
    var LINKS = {
        'smb-strategy':{ t: '소상공인 첫수출 전략 (6단계 실전 로드맵)', u: 'global-expansion.html#smb-export-lecture', d: '하이브리드 진출 전략·HS Code/인코텀즈/적재이행등록·지재권/무역사기 차단·트라이빅/공공 B2B·범부처 5대 기관 지원사업·단계별 마스터 로드맵까지 소상공인·소기업의 첫 수출을 6단계로 정리했습니다.' },
        'c-amazon':    { t: '아마존 입점전략 (아마존 통해서 첫 수출하기)', u: 'global-expansion.html#c-amazon', d: '아마존 글로벌 셀링 4단계 핵심 프로세스(계정 생성·카테고리 승인·FBA 물류 세팅·브랜드 레지스트리), 초기 비용·B2B 도약 전략과 정부 지원사업 연계를 정리했습니다.' },
        'gm-kosmes':   { t: '글로벌 쇼핑몰 판매지원(중진공)', u: 'global-mall.html', d: '아마존·쇼피 등 글로벌 쇼핑몰 입점과 마케팅을 수행기관을 통해 지원하는 중기부·중진공 사업입니다(중소기업 대상). 2026년 모집은 마감되었으니 다음 모집 시기는 공고 확인이 필요합니다.' },
        'op-semas':    { t: '해외 온라인 플랫폼 판로지원(소진공)', u: 'overseas-platform.html', d: '소상공인의 해외 온라인 플랫폼 입점·활용(마케팅)·물류를 단계별로 지원하는 중기부·소진공 사업입니다(소상공인 대상). 모집 시기·기업당 금액은 공고 확인이 필요합니다.' },
        'k-domestic':  { t: 'KOTRA 내수기업 수출기업화', u: 'global-expansion.html#k-domestic', d: '전년도 통관 실적 10만 달러 미만 기업의 첫 수출을 돕는 사업입니다(로컬 수취액은 실적에서 제외).' },
        'semas-innov': { t: '소진공 혁신성장촉진자금(혁신형)', u: 'policy-finance.html?org=semas#semas-direct', d: "'수출 소상공인'(최근 1년 이내 직·간접 수출실적 1,000달러 이상인 소상공인)이 대상인 정책자금입니다. 한도·금리·업종 등 세부 요건은 소진공 공고를 확인하세요." },
        'trade-stats': { t: '무역통계·HS코드 길잡이', u: 'https://www.littlestar.co.kr/lawsearch/trade/', ext: true, d: '품목(HS코드)별 수출 통계와 유망 시장을 찾아봅니다.' },
        'buyer':       { t: '바이어 발굴 안내', u: 'global-expansion.html#buyer', d: 'K-SIGHT·트라이빅·Trade Map·B2B 플랫폼 등 바이어 찾는 길을 모았습니다.' },
        'b2c':         { t: 'B2C 온라인 판매(역직구) 시작 순서', u: 'global-expansion.html#c-flow', d: '플랫폼 선택부터 물류·결제까지 7단계로 정리했습니다.' },
        'cert':        { t: '해외인증 조회 가이드', u: 'cert-guide.html', d: '수출 단계와 품목에 맞는 해외인증 공식 조회 포털을 안내합니다.' },
        'cert-medical':{ t: '의료기기·바이오 해외인증·인허가 안내', u: 'cert-guide.html#item-medical', d: '한국의료기기안전정보원(NIDS) 등 의료기기 등급 분류·인허가 조회 포털과 해외규격인증획득지원사업(지정 인증 최대 1억 5천만 원, 2026년 공고 기준)을 안내합니다.' },
        'cert-elec':   { t: '전기·전자·공산품 해외인증 안내(CE·FCC·UL 등)', u: 'cert-guide.html#item-industrial', d: 'CE·FCC·UL·PSE 등 전기·전자·IT기기·기계류 필수 규격인증 조회 경로와 트레이드내비 교차 검증 방법을 안내합니다.' },
        'ip-help':     { t: '해외지식재산센터(IP-DESK)·상표권·수출애로 상담', u: 'global-expansion.html#ip-help', d: '해외 상표·특허 출원, 위조품·지재권 분쟁 대응 상담(IP-DESK)과 무역 전문가 1:1 상담(TradePro)을 안내합니다.' },
        'voucher':     { t: '수출바우처', u: 'government-support.html#voucher', d: '시장조사·인증·홍보 등 수출 서비스를 골라 쓰는 지원사업입니다. 신청 자격은 해마다 공고를 확인하세요.' },
        'doc-builder': { t: '수출서류 작성기', u: 'doc-builder.html', d: '오퍼시트·PI·CI·P/L·선적통지 초안을 한 번의 입력으로 만듭니다.' },
        'contract':    { t: '계약서 작성기', u: 'contract-builder.html', d: '거래 조건에 맞는 매매계약서 초안과 추천 조항을 만듭니다.' },
        'export-docs': { t: '수출서류 점검·작성', u: 'export-docs.html', d: '샘플 계약서·체크리스트로 서류의 빠진 곳과 위험 조항을 점검합니다.' },
        'fraud':       { t: '무역사기(계좌변경) 주의', u: 'export-docs.html#fraud', d: '이메일 계좌변경 사기 예방 수칙과 계약서에 넣을 경고 문구입니다.' },
        'ksure-dplus': { t: '단기수출보험(다이렉트-중소Plus+)', u: 'trade-insurance.html#ksure-dplus', d: '소액 외상 수출의 대금 미회수에 대비하는 비대면 무역보험 상품입니다.' },
        'ksure-plus':  { t: '단기수출보험(중소중견Plus+)', u: 'trade-insurance.html#ksure-plus', d: '외상·추심 수출의 대금 미회수에 대비하는 무역보험 상품입니다(중계무역 포함).' },
        'credit':      { t: '국외기업 신용조사', u: 'trade-insurance.html#credit', d: '거래 전에 해외 바이어의 신용을 확인합니다.' },
        'ksure-postship': { t: '무보 수출신용보증(선적 후·매입·포괄매입)', u: 'trade-insurance.html#ksure-guarantee', d: '선적을 마친 수출채권을 금융기관에서 미리 현금화할 때 무보가 보증합니다. 선적후 보증은 단기수출보험과 연계해야 합니다.' },
        'ksure-after': { t: '무보 선적 후·대금 회수 상품 한눈에', u: 'policy-finance.html?org=ksure#ksure-after', d: '대금 미회수에 대비하는 보험과 채권 조기 현금화 보증을 함께 정리했습니다.' },
        'trade-claim': { t: '무역클레임 대응 가이드', u: 'trade-claim.html#matrix', d: '클레임 접수 직후의 무료 자문부터 알선·조정, 미수채권 추심, 회수불능 확인까지 상황별로 찾아갈 곳을 정리했습니다.' },
        'kcab':        { t: '대한상사중재원(중재·조정)', u: 'https://www.kcab.or.kr/', d: '무역클레임이 당사자 합의로 풀리지 않을 때 상사중재·조정을 신청하는 기관입니다. 절차·비용은 공식 사이트에서 확인하세요.', ext: true },
        'law-adr':     { t: '중재·분쟁해결 법령·규칙', u: 'export-docs.html#law-adr', d: '무역클레임이 분쟁으로 번질 때 참고할 중재법·국제 중재 규칙 링크를 모았습니다.' },
        'claim':       { t: '보상절차·면책사례', u: 'trade-insurance.html#claim', d: '사고가 났을 때의 절차와 보험금을 못 받는 사례를 정리했습니다.' },
        'claim-exempt':{ t: '면책사례(중계무역 조달 차질 등)', u: 'trade-insurance.html#claim-exempt', d: '중계무역 등에서 자주 생기는 면책 사례를 정리했습니다.' },
        'kosmes-dom':  { t: '중진공 신시장진출지원자금(내수기업 수출기업화)', u: 'policy-finance.html?org=kosmes#kosmes-export', d: '최근 1년 직·간접 수출실적 1달러~10만 달러 미만 수출 초보 중소기업(소상공인 포함) 대상 직접대출(운전 연 10억 원 이내). 세부 요건은 중진공 공고를 확인하세요.' },
        'kosmes-glb':  { t: '중진공 신시장진출지원자금(수출기업 글로벌화)', u: 'policy-finance.html?org=kosmes#kosmes-export', d: '최근 1년 직·간접 수출실적 10만 달러 이상 수출 유망 중소기업(소상공인 포함) 대상(연 30억 원·운전 10억·고성장기업 60억 이내). 세부 요건은 중진공 공고를 확인하세요.' },
        'kosmes-youth':{ t: '중진공 청년전용창업자금', u: 'policy-finance.html?org=kosmes#kosmes-startup', d: '대표자 만 39세 이하·업력 3년 미만(일부 우수기업 7년 미만) 청년창업기업 대상 직접대출. 고정금리 연 2.5%, 최대 1억 원(제조·중점 2억 원). 세부 요건은 중진공 공고를 확인하세요.' },
        'kosmes-startup':{ t: '중진공 혁신창업사업화자금(창업기반지원자금)', u: 'policy-finance.html?org=kosmes#kosmes-startup', d: '업력 7년 미만(신산업 10년) 창업 중소기업 대상. 기준금리-0.3%p, 연 60억 원(운전 5억 원) 이내. 세부 요건은 중진공 공고를 확인하세요.' },
        'kosmes-devtech':{ t: '중진공 개발기술사업화자금', u: 'policy-finance.html?org=kosmes#kosmes-startup', d: '우수 기술·특허·R&D 성과를 사업화하려는 중소기업 대상 직접대출(연 30억~60억 원 이내). 세부 요건은 중진공 공고를 확인하세요.' },
        'kosmes-growth':{ t: '중진공 신성장기반자금(혁신성장지원자금)', u: 'policy-finance.html?org=kosmes#kosmes-growth', d: '업력 7년 이상 중소기업의 생산성 향상·고부가가치화를 돕는 자금(연 60억 원·운전 5억 원 이내, 스케일업금융 포함). 세부 요건은 중진공 공고를 확인하세요.' },
        'kosmes-smart':{ t: '중진공 신성장기반자금(제조현장스마트화·Net-Zero)', u: 'policy-finance.html?org=kosmes#kosmes-growth', d: '스마트공장·ICT 자동화(연 100억 원 이내) 및 저탄소·친환경 전환 Net-Zero 유망기업(연 60억 원 이내) 자금입니다.' },
        'kosmes-restart':{ t: '중진공 재도약지원자금(재창업자금)', u: 'policy-finance.html?org=kosmes#kosmes-restart', d: '폐업 이력이 있는 성실 경영 재창업자 대상 운전·시설자금(성실경영 심층평가 통과 시 금리 -0.3%p 우대·운전 연 10억 원). 세부 요건은 중진공 공고를 확인하세요.' },
        'kosmes-urgent':{ t: '중진공 긴급경영안정자금', u: 'policy-finance.html?org=kosmes#kosmes-urgent', d: '환율 피해·주요 거래처 도산·원자재 급등 등 일시적 경영애로(매출·영업이익 10% 이상 감소 등) 중소기업 대상 최대 10억 원.' },
        'semas-disabled':{ t: '소진공 장애인기업지원자금', u: 'policy-finance.html?org=semas#semas-proxy', d: '장애인기업확인서·장애인복지카드 소지 소상공인 대상 저금리 고정금리 자금(한도 1억 원, 7년·거치 2년). 최신 금리·요건은 소진공 공고를 확인하세요.' },
        'semas-youth': { t: '소진공 청년고용연계자금', u: 'policy-finance.html?org=semas#semas-proxy', d: '업력 3년 미만 만 39세 이하 청년 소상공인(또는 청년 고용 소상공인) 대상. 한도 7천만 원, 5년(거치 2년, 기준금리+0.0%p).' },
        'semas-general':{ t: '소진공 일반경영안정자금', u: 'policy-finance.html?org=semas#semas-proxy', d: '업력과 무관하게 모든 소상공인이 이용할 수 있는 대리대출. 한도 7천만 원, 5년(거치 2년, 기준금리+0.6%p).' },
        'semas-maker': { t: '소진공 소공인특화자금', u: 'policy-finance.html?org=semas#semas-proxy', d: '제조업을 영위하는 상시근로자 10인 미만 소공인 대상. 운전 1억 원·시설 5억 원 한도.' },
        'semas-retry': { t: '소진공 재도전특별자금', u: 'policy-finance.html?org=semas#semas-direct', d: '희망리턴패키지 수료·재창업 초기·성실상환 재도전 소상공인 대상 직접대출(일반형 7천만·희망형 1억·도약형 2억 원).' },
        'semas-online':{ t: '소진공 상생성장지원자금', u: 'policy-finance.html?org=semas#semas-direct', d: '온라인 플랫폼 입점·TOPS·브랜드 소상공인 대상 운전·시설 직접대출.' },
        'semas-temp':  { t: '소진공 일시적경영애로자금', u: 'policy-finance.html?org=semas#semas-direct', d: '연매출 1억 4백만 원 미만·업력 7년 미만 일시적 경영애로 소상공인 대상(한도 7천만 원, 기준금리+0.0%p).' },
        'policy-fund': { t: '정책자금 안내', u: 'policy-finance.html?org=kosmes', d: '기관별 정책자금의 대상·한도·금리를 정리했습니다.' },
        'pref-lab':    { t: '기업부설연구소·전담부서 우대지원', u: 'policy-finance.html#pref-lab', d: '중진공 개발기술사업화자금 연계, 기보 R&D보증, 연구인력 채용 지원, R&D 세액공제 등 기업부설연구소·연구개발전담부서 보유 기업의 금융·비금융 우대를 정리한 카드입니다.' },
        'pref-mfg':    { t: '제조업 · 수출 제조기업 우대지원', u: 'policy-finance.html#pref-mfg', d: '무보 수출패키지 우대금융·인증기업 우대, 기보·신보·수출입은행 제조·수출기업 보증, 중진공 제조업 중점지원, 소진공 소공인특화자금, KOTRA·조달청 등 제조업 우대 제도를 한 카드에 모았습니다. 수치는 기관 공고를 확인하세요.' },
        'pref-cond':   { t: '기업 금융 우대조건·지원제도 매칭', u: 'policy-finance.html#preferential-conditions', d: '창업·청년·여성·장애인·사회적기업·벤처·이노비즈·메인비즈·연구소 등 우대조건별 금리 인하·보증료 감면·한도 확대와 공공조달·세제·R&D 혜택을 한눈에 비교합니다.' },
        // 핵심 기업인증 · ISO 인증 (2026-11-26 작가님: 제조업에는 벤처·이노비즈·메인비즈 및 ISO 인증 추천, 비제조업에는 메인비즈 추천)
        'biz-cert':    { t: '벤처/이노비즈/메인비즈 기업인증 가이드', u: 'biz-cert.html', d: '제조·기술 중소기업이 세제 감면, 정책자금 한도·금리 우대, R&D·수출·공공입찰 가점을 확보하는 3대 핵심 기업인증(벤처·이노비즈·메인비즈)과 기업부설연구소 요건을 한눈에 비교합니다.' },
        'biz-cert-mainbiz': { t: '메인비즈(Main-Biz) 경영혁신형 중소기업 인증', u: 'biz-cert.html?tab=mainbiz#detail', d: '비제조업(유통·무역·서비스 등)도 기술 특허나 연구소 없이 마케팅·조직·경영혁신 역량으로 취득할 수 있는 인증입니다. 보증·금리 우대, 정기 세무조사 유예, 수출바우처·공공입찰 가점 혜택을 정리했습니다(업력 3년 이상 중소기업 대상).' },
        'iso-cert':    { t: 'ISO 인증 안내 및 정부 지원사업 연계', u: 'government-support.html#iso-certification', d: 'ISO 9001·14001·45001·22000·13485·37001 6대 핵심 경영시스템 규격, 5단계 취득 절차, 수출바우처·중진공 ESG 통합플랫폼 등 인증비 지원사업 연계 방법을 정리했습니다.' },
        // 공공조달 우대지원 · 여성기업 글로벌 액셀러레이팅 (2026-11-26 작가님)
        'public-proc': { t: '공공조달 우대지원 (B2G 수의계약·우선구매)', u: 'government-support.html#public-procurement', d: '연간 약 200조 원 공공조달(B2G) 시장에서 여성·장애인·청년창업·사회적배려기업과 녹색·혁신·우수조달물품에 주어지는 수의계약 특례·우선구매·적격심사 가점을 정리했습니다.' },
        'pp-women':    { t: '공공조달 우대지원 (여성기업 특례)', u: 'government-support.html#public-procurement', d: '추정가격 5,000만 원 이하(부가세 포함 5,500만 원) 1인 견적 수의계약 특례, 공공기관 물품·용역 5%·공사 3% 이상 의무 구매, 적격심사 신인도 가점 등 여성기업 공공조달 우대 혜택을 정리했습니다.' },
        'pp-disabled': { t: '공공조달 우대지원 (장애인기업·중증장애인·표준사업장 특례)', u: 'government-support.html#public-procurement', d: '장애인기업 5,000만 원 이하 1인 견적 수의계약 및 1% 우선구매 목표, 중증장애인생산품(1.1% 강제 의무)·장애인 표준사업장 금액 제한 없는 직접 수의계약 혜택을 정리했습니다.' },
        'pp-social':   { t: '공공조달 우대지원 (사회적배려기업 특례)', u: 'government-support.html#public-procurement', d: '일정 요건 충족 시 5,000만 원 이하 1인 견적 수의계약 특례, 공공기관 우선구매 권장 대상 및 입찰 시 사회적 가치 기여도 평가 가점 혜택을 정리했습니다.' },
        'pp-youth':    { t: '공공조달 우대지원 (청년창업기업 특례 · 벤처나라)', u: 'government-support.html#public-procurement', d: '대표자 만 39세 이하·창업 7년 이내 청년창업기업에 5,000만 원 이하 1인 견적 수의계약 법정 특례와 조달청 벤처나라 등록·초기 납품 실적 확보 지원을 안내합니다.' },
        'pp-venture':  { t: '공공조달 벤처나라 (벤처·창업기업 전용 쇼핑몰)', u: 'government-support.html#public-procurement', d: '조달청 벤처나라(venture.g2b.go.kr) 등록을 통해 기술·품질이 우수한 벤처·창업기업이 전국 공공기관에 제품을 홍보하고 초기 공공 납품 실적을 확보할 수 있습니다(하단 벤처나라 공식 링크 연결).' },
        'pp-small':    { t: '공공조달 우대지원 (소기업·소상공인 우선조달 쿼터 · 수의계약 우대)', u: 'government-support.html#public-procurement', d: '추정가격 2,000만 원 초과 ~ 1억 원 이하 구간의 소액수의계약(2인 이상 전자견적)은 대기업·중견기업 참여가 제한되고 소기업·소상공인 간 경쟁으로만 진행되는 공공조달 우선조달 우대제도입니다.' },
        'pp-sme-mfg':  { t: '공공조달 우대지원 (중소기업자 간 경쟁제품 · 직접생산확인)', u: 'government-support.html#public-procurement', d: '대기업의 공공시장 독점을 막기 위해 지정된 품목(지정 유효기간 3년)은 직접생산확인증명서를 보유한 중소 제조기업만 입찰에 참여할 수 있는 공공조달 보호제도입니다.' },
        'pp-innov':    { t: '공공조달 우대지원 (혁신제품 — 3년 금액 제한 없는 수의계약 · 시범구매)', u: 'government-support.html#public-procurement', d: '혁신장터 등록 혁신제품은 지정 유효기간 3년 동안 금액 제한 없이 공공기관과 직접 수의계약이 가능하며, 조달청 예산으로 초기 납품 실적을 쌓는 혁신제품 시범구매 사업에 참여할 수 있습니다.' },
        'pp-green':    { t: '공공조달 우대지원 (녹색제품 — 공공기관 의무구매 · 수의계약)', u: 'government-support.html#public-procurement', d: '환경표지·GR인증·저탄소인증 등을 받은 녹색제품은 「녹색제품 구매촉진에 관한 법률」에 따라 공공기관 의무구매 대상이며, 조달 입찰 가점 및 수의계약 우대 혜택을 받습니다.' },
        'pp-excellent':{ t: '공공조달 우대지원 (우수조달물품 — 나라장터 종합쇼핑몰 직행 · 15% 의무구매)', u: 'government-support.html#public-procurement', d: '우수조달물품으로 지정되면 나라장터 종합쇼핑몰에 제3자 단가계약으로 직행 등록되어 별도 입찰 없이 수의계약 납품이 가능하며, 공공기관 기술개발제품 15% 의무구매 품목에 포함됩니다.' },
        'women-accel': { t: '여성기업 글로벌 액셀러레이팅 (여성기업종합지원센터)', u: 'government-support.html#women-accel', d: '창업 7년 미만 여성기업을 대상으로 수출 교육(5회차 이상 이수 필수)·전문가 컨설팅, 사업화 지원금(최대 1,000만 원, 20개사 내외) 또는 해외 전시회 공동관 참가(10개사 내외)를 지원하는 사업입니다.' },
        'guarantee':   { t: '무보 수출신용보증(선적 전)', u: 'policy-finance.html?org=ksure#ksure-presh', d: '수출 계약·신용장을 근거로 생산·선적 전 자금을 빌릴 때 무보가 보증합니다(모든 수출기업 대상). 보증 한도·요건은 무보 안내를 확인하세요.' },
        'fx':          { t: '환변동보험', u: 'trade-insurance.html#fx', d: '환율 하락으로 생기는 손실에 대비하는 무역보험 상품입니다.' },
        'qna-fx':      { t: '환변동보험 Q&A', u: 'trade-insurance.html#qna-fx', d: '로컬 수출만 하는 경우 가입 여부 등 자주 묻는 질문 15개입니다.' },
        'k-market':    { t: 'KOTRA 해외시장조사', u: 'global-expansion.html#k-market', d: '목표 시장의 바이어·경쟁 동향을 KOTRA 무역관이 조사해 줍니다.' },
        'k-branch':    { t: 'KOTRA 지사화사업', u: 'global-expansion.html#k-branch', d: '해외 무역관이 현지 지사 역할을 대신해 줍니다.' },
        'nationgrade': { t: '국가등급·국별인수방침', u: 'trade-insurance.html#nationgrade', d: '나라별 위험도와 무역보험 인수 방침을 확인합니다.' },
        'exim':        { t: '수출입은행 수출금융', u: 'policy-finance.html?org=exim', d: '수출 실적·계약을 바탕으로 한 수출입은행 대출을 정리했습니다.' },
        'exim-promo':  { t: '수출입은행 수출촉진자금', u: 'policy-finance.html?org=exim#exim-promo', d: '내수기업 수출 전환·수출 확대를 위한 시설투자·기술개발·해외시장개척 자금(소요자금 90% 이내, 해외시장개척 중소 30억 원 한도).' },
        'exim-growth': { t: '수출입은행 수출성장자금', u: 'policy-finance.html?org=exim#exim-growth', d: '과거 수출실적(또는 원부자재 공급실적) 범위 내 수출 운전자금 일괄 지원(중소 350억~500억, 중견 500억~800억 원 이내).' },
        'exim-perform':{ t: '수출입은행 수출이행자금', u: 'policy-finance.html?org=exim#exim-perform', d: '수출계약별 제작이행~대금회수 자금((계약금액-기수령액)×90% 이내). 대·중견·중소기업 모두 이용 가능.' },
        'lawsearch':   { t: '법령 길잡이', u: 'https://www.littlestar.co.kr/lawsearch/', ext: true, d: '대외무역법·관세법 등 수출 관련 법령을 쉽게 찾아봅니다.' },
        'customs':     { t: '통관·FTA·전략물자(YesTrade) 안내', u: 'global-expansion.html#customs', d: '관세청 유니패스·FTA·Trade NAVI·구매확인서와 전략물자 사전판정(YesTrade)·무역안보관리원(KOSTI)을 안내합니다.' },
        'rnd':         { t: '창업·R&D 지원사업', u: 'government-support.html#rnd', d: '예비창업패키지·TIPS 등 창업 기업용 지원사업입니다.' },
        'hope':        { t: '소진공 희망리턴패키지', u: 'government-support.html#hope', d: '폐업·재창업·재도전 소상공인의 재기·전환을 돕는 소진공 사업입니다.' },
        'agri':        { t: '농산물 수출 지원', u: 'global-expansion.html#agri', d: '농식품 수출 지원사업과 기관을 정리했습니다.' },
        'ksure-agri':  { t: '농수산물 패키지 보험', u: 'trade-insurance.html#ksure-agri', d: '농수산물 수출에 특화된 단기수출보험입니다. 대금미회수·수입국 검역·무역클레임비용 위험을 보험증권 하나로 보장합니다.' },
        // 2026-11-26 작가님: 농식품기업에 aT 지원제도(수출보험료 지원 포함) 소개. 비율·대상 종목은 무보 보험료지원 게시판 2026년 aT 안내(i-671, ntt_sn=290)로 확인
        'at-ins':      { t: 'aT 농식품글로벌성장패키지(수출보험료 지원)', u: 'trade-insurance.html#ksure-agri-at', d: 'aT 패키지 지원업체로 선정되어 약정한 농식품 수출 중소·중견기업에 단기수출보험(농수산물패키지 등)·환변동보험·수출신용보증 보험료(보증료)를 국고로 지원합니다(중소 90%·중견 80%, 무보 2026년 안내 기준). 모집 시기·한도는 공고 확인.' },
        'at':          { t: 'aT 농식품 수출자금', u: 'policy-finance.html?org=at', d: '농식품 수출업체용 운영·시설 자금입니다.' },
        'at-ops':      { t: 'aT 농식품 글로벌육성지원자금(운영자금)', u: 'policy-finance.html?org=at#at-ops', d: '농식품 수출용 원료·부자재 구입·저장·가공 운영자금. 고정금리 2.5%(농업경영체)·3.0%(일반) 또는 변동, 업체당 200억 원 이내(1년).' },
        'at-facility': { t: 'aT 농식품 글로벌육성지원자금(시설자금)', u: 'policy-finance.html?org=at#at-facility', d: '농식품 저장·가공·부대시설·물류장비 현대화 시설자금. 고정금리 2.0%(농업경영체)·3.0%(일반) 또는 변동, 30억 원 이내(10년·거치 3년).' },
        // '먼저 찾아볼 정보 사이트'(결과 맨 앞, 2026-11-24). 사이트에 이미 걸려 있는 주소만 쓴다.
        'kotra-ai':    { t: 'KOTRA AI수출정보 서비스', u: 'https://www.kotra.or.kr/mutugpt/export-assistant/main', ext: true, d: 'KOTRA의 AI수출정보 서비스에서 우리 품목의 수출 정보를 먼저 살펴보세요.' },
        'kati':        { t: 'AI 농산물 수출정보(KATI)', u: 'https://www.kati.net/searchGpt.do', ext: true, d: 'aT KATI의 AI 농산물 수출정보에서 농식품 수출 정보를 찾아보세요.' },
        'kocei':       { t: '화장품수출가이드북', u: 'https://www.kcii.re.kr/kocei/', ext: true, d: '대한화장품산업연구원의 화장품 수출 가이드북 사이트에서 수출 정보를 확인하세요.' },
        'kcii':        { t: '대한화장품산업연구원', u: 'https://www.kcii.re.kr/', ext: true, d: '대한화장품산업연구원 사이트로 연결됩니다.' },
        'cosmetic':    { t: '화장품 수출 지원', u: 'global-expansion.html#cosmetic', d: '화장품 수출 규제·지원 기관을 정리했습니다.' },
        'ksure-service': { t: '서비스보험(일시결제방식)', u: 'trade-insurance.html#ksure-service', d: '서비스·콘텐츠 수출 대금 미회수에 대비하는 무역보험입니다.' },
        // 신용보증기금 상품별(2026-11-23)
        'kodit':       { t: '신용보증기금 보증', u: 'policy-finance.html?org=kodit#kodit-grow', d: '성장단계별 보증 중 수출중소기업 종합지원(희망·진입·확장·주력·스타 단계) 등 수출 우대 보증이 있습니다. 단계 기준·한도는 신보 공고를 확인하세요.' },
        'kodit-export':{ t: '신보 수출중소기업 종합지원보증', u: 'policy-finance.html?org=kodit#kodit-grow', d: '수출 역량 단계별(희망·진입·확장·주력·스타) 모든 수출 중소기업 우대 보증입니다. 세부 한도·요건은 신보 공고를 확인하세요.' },
        'kodit-startup':{ t: '신보 창업기업 대상 보증(창업단계 프로그램)', u: 'policy-finance.html?org=kodit#kodit-start', d: '예비창업·창업 7년 이내 기업 대상 창업보증(Start-up Nest·유망창업·고용안전 등)입니다.' },
        'kodit-youth': { t: '신보 청년희망드림보증', u: 'policy-finance.html?org=kodit#kodit-start', d: '창업 7년 이내·대표자 만 17~39세 청년창업기업 우대 보증(한도 3억 원, 보증비율 95%, 보증료 연 0.3% 고정, 신보 공고 확인).' },
        'kodit-senior':{ t: '신보 신중년행복드림보증', u: 'policy-finance.html?org=kodit#kodit-start', d: '만 49세 이상 중장년 기업가 대상 우대 보증(한도 3억 원, 보증비율 95%·보증료 차감, 세부 업력·요건은 신보 공고 확인).' },
        'kodit-mature':{ t: '신보 성숙단계 지속성장 지원보증', u: 'policy-finance.html?org=kodit#kodit-mature', d: '성장 궤도에 오른 기업의 중견기업 도약·안정 고용을 지원하는 유동화회사보증·혁신리딩기업·고용의 질 우수기업 보증입니다.' },
        'kodit-retry': { t: '신보 재도전·재창업 지원보증', u: 'policy-finance.html?org=kodit#kodit-retry', d: '실패기업의 재도전·재창업 지원 프로그램 및 재창업지원특례보증입니다.' },
        'kodit-service':{ t: '신보 유망서비스·신한류 해외진출 지원보증', u: 'policy-finance.html?org=kodit#kodit-grow', d: '유망·특화 서비스기업 보증 및 문화콘텐츠 해외진출(신한류) 지원 보증입니다.' },
        'kodit-esg':   { t: '신보 소부장·스마트공장 특화보증', u: 'policy-finance.html?org=kodit#kodit-grow', d: '소재·부품·장비 경쟁력 강화 보증, 스마트공장 특화지원 및 신성장동력산업 보증입니다.' },
        'kodit-mainbiz':{ t: '신보 경영혁신형(메인비즈) 우대보증', u: 'policy-finance.html?org=kodit#kodit-grow', d: '메인비즈 인증 기업 보증료율 0.1~0.2%p 차감·보증비율 85~90% 우대 및 매출채권보험 할인입니다.' },
        // 후순위 '더 찾아볼 곳' 및 기보·지역신보·무역협회·무보 다이렉트
        'kibo':        { t: '기술보증기금 수출기업보증', u: 'policy-finance.html?org=kibo#kibo-export', d: '수출예상·실적·주력·선정 기술혁신선도형기업 대상 보증비율 90~95%·보증료 0.2~0.4%p 감면 및 심사 완화 우대 보증입니다.' },
        'kibo-rnd':    { t: '기술보증기금 R&D보증', u: 'policy-finance.html?org=kibo#kibo-rnd', d: '아이디어·개발 단계(연구개발·디자인·시제품 등 개발완성자금)부터 사업화 단계(개발 종료 후 3년 이내 운전·시설자금)까지 전주기 R&D 금융을 지원하는 보증입니다.' },
        'kibo-retry':  { t: '기술보증기금 재도전 재기지원보증', u: 'policy-finance.html?org=kibo#kibo-retry', d: '기술력을 갖춘 실패 경영자(기보 단독채무자)의 재기·재창업 기업에 최대 75~90% 채무조정(또는 회생지원보증)과 재기자금 신규보증을 함께 지원합니다(기술평가료 무료).' },
        'kibo-pre':    { t: '기술보증기금 예비창업자 사전보증', u: 'policy-finance.html?org=kibo#kibo-menu', d: '창업 전 예비창업자의 기술사업성을 사전 평가해 창업 후 보증 지원으로 연계하는 기보 성장단계별 창업 프로그램입니다(세부 요건은 기보 원문 확인).' },
        'kibo-youth':  { t: '기술보증기금 청년창업기업 우대 프로그램', u: 'policy-finance.html?org=kibo#kibo-menu', d: '청년 기술창업기업을 위한 기보 성장단계별 창업 우대 보증 프로그램입니다(세부 요건은 기보 원문 확인).' },
        'kibo-social': { t: '기술보증기금 소셜벤처 임팩트 보증', u: 'policy-finance.html?org=kibo#kibo-menu', d: '사회적 가치와 혁신성을 갖춘 사회적기업·소셜벤처 대상 기보 우대 보증입니다(세부 요건은 기보 원문 확인).' },
        'seoul-shinbo':{ t: '지역신용보증재단(서울신용보증재단) 보증', u: 'policy-finance.html?org=seoul#seoul-products', d: '창업·장애인·일자리/사회적·ESG·미래성장·모바일 자동심사 보증상품 안내(서울 외 지역은 소재지 신용보증재단 공고 확인).' },
        'kita-fund':   { t: '무역협회 무역진흥자금', u: 'policy-finance.html?org=kita#kita-fund', d: '회비를 완납한 무역협회 회원사(전년도 수출실적 2천만 달러 이하) 대상 수출마케팅·수출이행 자금(최고 3억 원, 연 2.5~3.0% 고정금리).' },
        'ksure-direct':{ t: '무보 수출신용보증(다이렉트-선적전)', u: 'policy-finance.html?org=ksure#ksure-direct', d: '매출 1억~100억 원·직수출 1만~200만 달러 미만(1만 달러 미만 시 간접수출 인정) 수출초보 중소기업용 비대면 100% 보증(한도 5천만~1억 원).' },
        'trade-sure':  { t: '무역보험공사 TRADE-SURE 컨설팅(무료)', u: 'https://ksure.or.kr/rh-kr/cntnts/i-287/web.do', ext: true, d: '연간 수출실적 US$1천만 미만 수출(예정) 중소기업에 무역·법무·회계·관세 등 1:1 맞춤형 무료 컨설팅을 기업당 총 6회 제공합니다. 신청 절차는 무보 안내를 확인하세요.' },
        // 한국은행 무역금융(2026-11-26 작가님: 모든 수출기업에 기업은행보다 앞에서 추천, 로컬 수출기업에는 내국신용장·구매확인서 안내)
        'bok-tf':      { t: '한국은행 무역금융(시중은행 창구)', u: 'policy-finance.html?org=bok#bok-overview', d: '수출신용장·수출계약서·수출실적을 근거로 시중은행이 원자재 구매·생산·완제품 구매 자금을 저금리로 지원하는 선적 전 금융입니다. 2026.7.23 한국은행 개편으로 단계적 축소·폐지 예정(언론 보도 기준)이니 신규 지원 여부는 거래 은행에서 꼭 확인하세요.' },
        'bok-local':   { t: '무역금융 · 내국신용장(Local L/C)과 구매확인서', u: 'policy-finance.html?org=bok#bok-local', d: '국내 수출기업에 수출용 물품을 납품(간접수출)할 때 쓰는 내국신용장(은행 지급보증 있음)과 구매확인서(지급보증 없음)의 차이, 부가세 영세율·간접수출 실적 인정, 내국신용장 필수 기한 규정을 정리했습니다.' },
        // IBK기업은행 기업대출(2026-11-23)
        'ibk-export':  { t: 'IBK기업은행 무역금융·관세피해 지원대출', u: 'policy-finance.html?org=ibk#ibk-export', d: '외화획득 단계별 무역금융, 통상환경 변화 대응 IBK관세피해기업 지원대출, 철강산업 수출공급 활성화 지원대출(무보 보증 연계) 등 수출기업 전용 대출입니다.' },
        'ibk-youth':   { t: 'IBK기업은행 IBK유망청년창업대출', u: 'policy-finance.html?org=ibk#ibk-innov', d: '신용보증기금·기술보증기금과 업무협약으로 유망 청년창업기업에 운전자금을 지원하는 전용 상품입니다(고정·변동·혼합).' },
        'ibk-startup': { t: 'IBK기업은행 창업·스타트업 대출(혁신창업·스텝업·스타트업)', u: 'policy-finance.html?org=ibk#ibk-innov', d: '신보·기보 보증서 협약 창업전용 대출(IBK혁신창업대출·IBK스텝업대출·IBK스타트업대출)입니다.' },
        'ibk-venture': { t: 'IBK기업은행 벤처·첨단혁신 대출', u: 'policy-finance.html?org=ibk#ibk-innov', d: 'IBK벤처기업대출·벤처투자매칭대출·첨단혁신 성장유망기업대출·AI 대전환 도약대출(운전·시설자금, 영업점)입니다.' },
        'ibk-esg':     { t: 'IBK기업은행 ESG경영 성공지원 시설자금 대출', u: 'policy-finance.html?org=ibk#ibk-innov', d: '환경(E)·사회(S)·지배구조(G) 우수 중소기업의 운전·시설자금을 지원하는 대출입니다(고정·변동·혼합).' },
        'ibk-smallbiz':{ t: 'IBK기업은행 소상공인 대출(가치성장·경영안정·희망Dream·골목상권)', u: 'policy-finance.html?org=ibk#ibk-smallbiz', d: '수출혁신·기술 소상공인 가치성장대출, 경영안정대출, 희망Dream대출, 골목상권 활성화 보증부대출(영업점)입니다.' },
        'ksight':      { t: 'K-SIGHT·트라이빅 바이어 검색', u: 'global-expansion.html#b-search', d: '무보 K-SIGHT와 KOTRA 트라이빅으로 해외 바이어 정보를 찾아봅니다.' },
        'b-data':      { t: '무역데이터로 바이어 찾기(Trade Map·트레이드잇)', u: 'global-expansion.html#b-data', d: '실제 수입 실적·수입국 통계로 바이어와 시장을 찾습니다.' },
        'b-b2b':       { t: '온라인 B2B 플랫폼', u: 'global-expansion.html#b-b2b', d: '해외 바이어를 만나는 온라인 B2B 플랫폼을 모았습니다.' },
        'buykorea':    { t: 'KOTRA 바이코리아', u: 'global-expansion.html#k-buykorea', d: '전 세계 바이어와 한국 수출업체를 연결하는 글로벌 B2B e-커머스 플랫폼입니다. 상품 해외홍보, 바이어 구매정보(인콰이어리) 검색·등록, 거래대금 온라인 결제, 국제 배송(EMS·DHL)까지 지원합니다.' },
        // 낮은 순위(후순위) B2B·B2C·소상공인·소기업·중소기업 수출 플랫폼·정보 포털(2026-11-24)
        'gobizkorea':  { t: '고비즈코리아 (kr.gobizkorea.com)', u: 'https://kr.gobizkorea.com', ext: true, d: '해외 바이어 거래알선(BMS)·수출계약대응지원 등 B2B 온라인 수출과 의류·패션 등 브랜드에 유리한 글로벌쇼핑몰 판매지원·K-브랜드 수출 플랫폼 육성·홍보 동영상 콘텐츠 제작·온라인 수출 공동물류 및 물류할인서비스를 지원합니다.' },
        'buykorea-portal': { t: '바이코리아 (www.buykorea.org)', u: 'https://www.buykorea.org', ext: true, d: '전 세계 바이어와 한국 수출업체를 연결하는 글로벌 B2B e-커머스 플랫폼입니다. 상품 해외홍보, 바이어 구매정보(인콰이어리) 검색 및 등록, 거래대금 온라인 결제, 국제 배송(EMS, DHL)까지 수출 거래 전 단계를 지원합니다.' },
        'tribig':      { t: '트라이빅 (www.kotra.or.kr/bigdata)', u: 'https://www.kotra.or.kr/bigdata', ext: true, d: '1.3억 건의 수출통계와 600만 해외기업 DB를 바탕으로 AI가 품목별 유망 시장과 잠재 파트너 리스트를 추천하고, 무역투자통계와 국가별 시장정보를 시각화된 자료로 제공합니다.' },
        'kotra-dream': { t: '해외경제정보Dream (dream.kotra.or.kr)', u: 'https://dream.kotra.or.kr/', ext: true, d: '각 부처와 기관에 흩어져 있는 해외 진출 정보를 시장별·단계별로 통합 제공하는 범정부 플랫폼입니다.' },
        'kita-portal': { t: '한국무역협회 무역정보포털 (www.kita.net)', u: 'https://www.kita.net', ext: true, d: '무역 통계, 수출 실무 가이드, 관련 법령 및 해외 인증 정보를 종합적으로 확인할 수 있습니다.' },
        'voucher-portal': { t: '수출바우처 포털 (www.exportvoucher.com)', u: 'https://www.exportvoucher.com', ext: true, d: '해외 진출 및 마케팅에 필요한 서비스를 지원하는 수출바우처 사업과 해외지사화 사업 등을 신청할 수 있습니다.' },
        'k-exhib':     { t: 'KOTRA 해외전시회', u: 'global-expansion.html#k-exhib', d: '해외전시회 참가 지원 사이트로 연결합니다. 모집 일정은 공고를 확인하세요.' },
        'akei':        { t: '한국전시산업진흥원', u: 'global-expansion.html#exhibit', d: '국내외 전시회 정보를 찾아봅니다.' },
        'b-potential': { t: 'KOTRA 잠재바이어 발굴', u: 'global-expansion.html#b-potential', d: 'KOTRA 해외무역관이 잠재 바이어를 대신 찾아 주는 유료 대행 서비스입니다.' },
        'k-bts':       { t: 'KOTRA 바이어 트래킹', u: 'global-expansion.html#k-bts', d: 'KOTRA로 알게 된 바이어와의 교신을 무역관이 대신 도와줍니다(KOTRA 기업 회원 대상).' },
        'k-aitc':      { t: 'KOTRA AI무역지원센터', u: 'global-expansion.html#k-aitc', d: 'AI 수출상품 콘텐츠 제작·바이코리아 등록·수출 상담을 무료로 지원하는 전국 센터입니다.' },
        'c-more':      { t: 'B2C 역직구 기관·민간 추가 지원', u: 'global-expansion.html#c-more', d: 'KOTRA·중진공·aT·무역협회·지자체의 온라인 판매 지원을 모았습니다. 사업 내용은 해마다 공고를 확인하세요.' },
        'ksure-group': { t: '단기수출보험(단체보험)', u: 'trade-insurance.html#ksure-group', d: '지자체·협회 등이 단체로 가입하고 보험료를 대신 내 주는 수출대금 미회수 보험입니다. 가입 여부·보상 한도는 지자체마다 다릅니다.' },
        'ins-support': { t: '무역보험 보험료 지원사업', u: 'trade-insurance.html#support', d: '보험료 지원사업 공고는 무보 홈페이지 게시판에서 확인합니다.' },
        'kon':         { t: 'K-SURE ON(온라인 무역보험)', u: 'trade-insurance.html#kon', d: '무역보험 신청과 조회를 온라인으로 합니다.' },
        'qna-f':       { t: '단기수출보험 Q&A', u: 'trade-insurance.html#qna-f', d: '보험 한도·수출 통지 등 자주 묻는 질문입니다.' },
        'import-ins':  { t: '수입보험', u: 'trade-insurance.html#import', d: '주요 자원·시설재 등을 수입하며 선급금을 먼저 낼 때(수입자용)나 수입자금을 빌릴 때(금융기관용) 대비하는 무보 보험입니다. 대상 품목이 정해져 있으니 지원물품을 확인하세요.' },
        'c-logi':      { t: 'B2C 물류·통관·결제', u: 'global-expansion.html#c-logi', d: '해외 배송·통관·결제 방법을 정리했습니다.' },
        'fxinfo':      { t: '환율 정보', u: 'trade-insurance.html#fxinfo', d: '무보 환변동보험 홈페이지의 환율 정보로 연결합니다.' },
        'roadmap':     { t: '수출 5단계 로드맵', u: 'export-roadmap.html', d: '' },
        'notices':     { t: '핫이슈(최신 공고·수출 소식)', u: 'notices.html', d: '' },
        'ins-cases':   { t: '무역보험 활용사례', u: 'trade-insurance.html#cases', d: '' },
        'k-cases':     { t: 'KOTRA 활용사례', u: 'global-expansion.html#k-cases', d: '' }
    };

    // 단계 × 서비스 표(PRD). 2 = 단계 기본 추천(●), 1 = 애로·조건과 겹칠 때 추천(○), 0 = 이 단계 기본 추천 없음
    // 'hard' 는 자격 기준이라 0 인 단계에서는 어떤 경우에도 띄우지 않는다.
    var STAGE_MAP = {
        'k-domestic':  { s: [2, 2, 2, 2, 0, 0, 0], hard: true },
        'semas-innov': { s: [0, 0, 2, 2, 2, 2, 2], hard: true, size: 'smallbiz' },
        'trade-stats': { s: [2, 2, 1, 1, 1, 1, 1] },
        'buyer':       { s: [2, 2, 2, 1, 1, 1, 1] },
        'b2c':         { s: [1, 1, 1, 1, 0, 0, 0] },
        'cert':        { s: [1, 1, 1, 1, 1, 1, 1] },
        'voucher':     { s: [1, 2, 2, 2, 1, 1, 1] },
        'doc-builder': { s: [1, 2, 2, 2, 1, 1, 1] },
        'fraud':       { s: [1, 2, 2, 2, 1, 1, 1] },
        'ksure-dplus': { s: [0, 1, 1, 1, 0, 0, 0] },
        'ksure-plus':  { s: [0, 0, 1, 2, 2, 2, 2] },
        'credit':      { s: [0, 0, 1, 1, 2, 2, 2] },
        'policy-fund': { s: [1, 1, 1, 1, 2, 2, 2] },
        'guarantee':   { s: [0, 0, 1, 1, 2, 2, 2] },
        'fx':          { s: [0, 0, 0, 1, 2, 2, 2] },
        'k-market':    { s: [1, 1, 1, 1, 2, 2, 2] },
        'k-branch':    { s: [0, 0, 1, 1, 2, 2, 2] },
        // 수은(exim)은 문턱이 높아 '먼저 볼 곳' 자동 가점에서 제외하고 PROGRAMS 맨 끝(pri: 5)에 배치한다
        'exim':        { s: [0, 0, 0, 0, 0, 0, 0] },
        'claim':       { s: [0, 0, 1, 1, 1, 1, 1] }
    };

    // 조건에 맞는 정책금융·지원사업 전체 매칭(2026-11-23 작가님):
    // 8가지 질문 중 어느 하나의 조건이라도 해당하면 지원 가능한 금융·지원사업을 빠짐없이 추천한다.
    // pri: 1 = 최우선 추천(먼저 볼 곳 상단 가점 + 최우선 배지), 2 = 조건 직접 해당, 3 = 함께 검토할 수출금융·지원, 4 = 한국은행 무역금융(기은보다 앞)·IBK기업은행, 5 = 한국수출입은행(문턱이 높아 기은 다음 맨 마지막)
    var PROGRAMS = [
        // ── 최우선 추천 (pri: 1) ──
        { id: 'semas-disabled', pri: 1, match: function (c) {
            return (c.disabled && !c.has2('medium') && !c.has2('mid') && !c.has2('large'))
                ? '장애인기업이라서(최우선 추천 · 저금리 고정금리)' : '';
        }},
        { id: 'kosmes-youth', pri: 1, match: function (c) {
            return (c.youth && c.under7 && c.sme)
                ? '청년·창업기업이라서(최우선 추천 · 연 2.5% 고정금리)' : '';
        }},
        { id: 'kita-fund', pri: 1, match: function (c) {
            return c.sme
                ? '수출 2천만 달러 이하 무역협회 회원사 대상(최우선 추천 · 연평균 2.75% 고정금리)' : '';
        }},

        // ── 소상공인시장진흥공단 (소진공) ──
        { id: 'semas-innov', pri: 2, match: function (c) {
            return (c.smallbiz && c.st >= 2) ? '최근 1년 수출실적 1천 달러 이상 소상공인이라서' : '';
        }},
        { id: 'semas-youth', pri: 2, match: function (c) {
            return (c.smallbiz && c.youth) ? '청년 소상공인이라서' : '';
        }},
        { id: 'semas-general', pri: 2, match: function (c) {
            if (c.smallbiz) return c.mfg ? '' : '소상공인(제조업 아님)이라서'; // 제조업 소상공인은 소공인특화자금(2026-11-25 작가님)
            if (c.rev === 2 && c.sme) return '매출 1억~5억 원 미만 소상공인·소기업 대상이라서';
            return '';
        }},
        { id: 'semas-retry', pri: 2, match: function (c) {
            return (c.restart && (c.smallbiz || (!c.has2('medium') && !c.has2('mid') && !c.has2('large'))))
                ? '재도전·재창업 소상공인이라서' : '';
        }},
        { id: 'hope', pri: 2, match: function (c) {
            if (c.restart) return '재도전·재창업 기업이라서';
            if (c.rev === 2 && c.sme) return '매출 1억~5억 원 미만 소상공인·소기업 재기·전환 지원 대상이라서';
            if (c.smallbiz && c.wantsFund) return '소상공인 재기·전환 지원 대상이라서';
            return '';
        }},
        { id: 'semas-online', pri: 2, match: function (c) {
            return (c.smallbiz && c.b2c) ? 'B2C 온라인 판매 소상공인이라서' : '';
        }},
        { id: 'semas-maker', pri: 3, match: function (c) {
            return (c.smallbiz && c.mfg) ? '제조업 소상공인(상시근로자 10인 미만 소공인)이라서' : '';
        }},
        { id: 'semas-temp', pri: 3, match: function (c) {
            return (c.smallbiz && c.under7 && !c.pre && c.wantsFund && (c.rev === 0 || c.rev <= 2))
                ? '업력 7년 미만 소상공인 경영애로 자금 검토 대상이라서' : '';
        }},

        // ── 중소벤처기업진흥공단 (중진공, 소상공인 포함 중소기업) ──
        { id: 'kosmes-dom', pri: 2, match: function (c) {
            return (c.st >= 1 && c.st <= 3 && c.sme) ? '수출실적 1달러~10만 달러 미만 중소기업(소상공인 포함)이라서' : '';
        }},
        { id: 'kosmes-glb', pri: 2, match: function (c) {
            return (c.st >= 4 && c.sme) ? '수출실적 10만 달러 이상 중소기업(소상공인 포함)이라서' : '';
        }},
        { id: 'kosmes-startup', pri: 2, match: function (c) {
            if (!c.under7 || !c.sme) return '';
            return c.pre ? '예비창업자(창업기반지원자금) 대상이라서' : '창업 7년 미만 중소기업이라서';
        }},
        { id: 'kosmes-devtech', pri: 2, match: function (c) {
            return ((c.lab || c.venture || c.innobiz) && c.sme) ? '기술·연구소·혁신인증 보유 중소기업이라서' : '';
        }},
        { id: 'kosmes-growth', pri: 2, match: function (c) {
            return (c.over7 && c.sme) ? '창업 7년 이상 중소기업이라서' : '';
        }},
        { id: 'kosmes-smart', pri: 2, match: function (c) {
            return (c.esg && c.sme) ? '소부장·스마트공장·ESG 우대조건이라서' : '';
        }},
        { id: 'kosmes-restart', pri: 2, match: function (c) {
            return (c.restart && c.sme) ? '재도전·재창업 중소기업이라서' : '';
        }},
        { id: 'kosmes-urgent', pri: 3, match: function (c) {
            return ((c.issues.indexOf('fx') >= 0 || c.wantsFund) && c.sme && c.st >= 1)
                ? '환율 피해·일시적 경영애로 긴급자금 검토 대상이라서' : '';
        }},

        // ── 기업 금융 우대조건 종합 매칭 ──
        { id: 'pref-lab', pri: 2, match: function (c) {
            return c.lab ? "우대 조건('기업부설연구소·전담부서')을 골라서" : '';
        }},
        { id: 'pref-mfg', pri: 2, match: function (c) {
            return c.mfg ? "우대 조건('제조업')을 골라서" : '';
        }},
        { id: 'pref-cond', pri: 2, match: function (c) {
            return c.pref.length ? "우대 조건('" + c.prefLabels + "')을 골라서" : '';
        }},

        // ── 핵심 기업인증 · ISO 인증 (2026-11-26 작가님) ──
        { id: 'biz-cert', pri: 2, match: function (c) {
            if (c.mfg && c.smeOrMid) return '제조업 기업이라서(벤처·이노비즈·메인비즈 3대 기업인증 및 기업부설연구소 추천)';
            if (c.procCert && c.smeOrMid) return '혁신·녹색·우수조달제품 기업이라서(벤처·이노비즈·기업부설연구소 등 기술인증 연계로 공공조달 가점 확대 추천)';
            return '';
        }},
        { id: 'iso-cert', pri: 2, match: function (c) {
            if (c.mfg && c.procCert) return '제조업 · 혁신·녹색·우수조달제품 기업이라서(ISO 9001 품질·ISO 14001 환경 등 인증으로 조달 평가 가점 및 정부 지원사업 연계 추천)';
            if (c.mfg) return '제조업 기업이라서(ISO 품질·환경·안전 등 경영시스템 인증 및 정부 지원사업 연계 추천)';
            if (c.procGreen) return '녹색제품 기업이라서(ISO 14001 환경경영시스템 등 인증 취득 및 정부 지원사업 연계 추천)';
            if (c.procCert) return '혁신·우수조달제품 기업이라서(ISO 9001 품질경영 등 경영시스템 인증으로 공공조달 가점 및 정부 지원사업 연계 추천)';
            return '';
        }},
        { id: 'biz-cert-mainbiz', pri: 2, match: function (c) {
            if (c.mfg || !c.sme) return '';
            if (c.mainbiz) return '비제조업 중소기업(메인비즈 보유 · 연장 및 우대 혜택 확인)이라서';
            return c.under3
                ? '비제조업 중소기업이라서(경영혁신형 메인비즈 인증 추천 · 업력 3년 이상 취득 가능)'
                : '비제조업 중소기업이라서(경영혁신형 메인비즈 인증 추천)';
        }},

        // ── 공공조달 우대지원 · 여성기업 글로벌 액셀러레이팅 (2026-11-26 작가님) ──
        { id: 'women-accel', pri: 2, match: function (c) {
            return (c.women && !c.over7)
                ? '여성기업(창업 7년 미만)이라서(수출 교육·컨설팅·사업화 지원금 최대 1,000만 원 또는 해외 전시회 지원)' : '';
        }},
        { id: 'pp-women', pri: 2, match: function (c) {
            return c.women
                ? '여성기업이라서(공공조달 5,000만 원 이하 수의계약 · 의무구매 5%/3% · 신인도 가점)' : '';
        }},
        { id: 'pp-disabled', pri: 2, match: function (c) {
            return c.disabled
                ? '장애인기업이라서(공공조달 5,000만 원 이하 수의계약 · 우선구매 · 신인도 가점)' : '';
        }},
        { id: 'pp-social', pri: 2, match: function (c) {
            return c.social
                ? '사회적기업이라서(공공조달 5,000만 원 이하 수의계약 · 우선구매 권장 · 사회적 가치 가점)' : '';
        }},
        { id: 'pp-youth', pri: 2, match: function (c) {
            if (!c.youth) return '';
            return c.over7
                ? '청년기업이라서(공공조달 청년창업 특례는 창업 7년 이내 대상 · 세부 요건 확인)'
                : '청년기업이라서(공공조달 5,000만 원 이하 수의계약 특례 · 벤처나라 연계)';
        }},
        { id: 'pp-venture', pri: 2, match: function (c) {
            return c.venture
                ? '벤처기업이라서(조달청 공공조달 벤처나라 전용 쇼핑몰 등록 및 초기 판로 확보 추천)' : '';
        }},
        { id: 'pp-innov', pri: 2, match: function (c) {
            return c.procInnov
                ? '혁신제품 해당 기업이라서(공공조달 3년 금액 제한 없는 수의계약 · 조달청 혁신제품 시범구매 추천)' : '';
        }},
        { id: 'pp-green', pri: 2, match: function (c) {
            return c.procGreen
                ? '녹색제품(환경표지·GR·저탄소인증) 해당 기업이라서(공공기관 의무구매 · 조달 입찰 가점 · 수의계약 우대)' : '';
        }},
        { id: 'pp-excellent', pri: 2, match: function (c) {
            return c.procExcl
                ? '우수조달물품 해당 기업이라서(나라장터 종합쇼핑몰 제3자 단가계약 직행 · 기술개발제품 15% 의무구매)' : '';
        }},
        { id: 'pp-small', pri: 2, match: function (c) {
            if (c.smallbiz && c.mfg) return '소공인(제조업 소상공인)이라서(공공조달 2,000만 원 초과~1억 원 이하 소기업·소상공인 우선조달 수의계약 우대)';
            if (c.smallbiz) return '소상공인이라서(공공조달 2,000만 원 초과~1억 원 이하 소기업·소상공인 우선조달 수의계약 우대)';
            if (c.has2('small')) return '소기업이라서(공공조달 2,000만 원 초과~1억 원 이하 소기업·소상공인 우선조달 수의계약 우대)';
            return '';
        }},
        { id: 'pp-sme-mfg', pri: 2, match: function (c) {
            return (c.sme && c.mfg)
                ? '중소 제조기업이라서(공공조달 중소기업자 간 경쟁제품 · 직접생산확인증명서 기반 입찰 참여 추천)' : '';
        }},

        // ── 한국농수산식품유통공사 (aT) ──
        { id: 'at-ops', pri: 2, match: function (c) {
            return c.agri ? '농수산식품 수출(예정)기업이라서' : '';
        }},
        { id: 'at-facility', pri: 2, match: function (c) {
            return c.agri ? '농수산식품 수출(예정)기업이라서' : '';
        }},
        { id: 'at-ins', pri: 2, match: function (c) {
            // 중소·중견기업 대상 제도
            return (c.agri && c.smeOrMid) ? '농수산식품 수출(예정) 중소·중견기업이라서' : '';
        }},
        { id: 'ksure-agri', pri: 2, match: function (c) {
            // 중소·중견기업 대상 제도
            return (c.agri && c.smeOrMid) ? '농수산식품 수출(예정) 중소·중견기업이라서' : '';
        }},

        // ── 한국무역보험공사 (무보) ──
        { id: 'guarantee', pri: 2, match: function (c) {
            if (c.rev === 4) return '매출 20억~100억 원 미만 본격 성장 중소기업(무보 선적 전 신용보증)이라서';
            return '모든 수출기업 대상(선적 전 제작·조달 자금 보증)이라서';
        }},
        { id: 'ksure-postship', pri: 2, match: function (c) {
            if (c.rev === 5) return '매출 100억 원 이상 중기업·강소기업(포괄보증·선적 후 보증) 대상이라서';
            return '모든 수출기업 대상(선적 후 수출채권 조기 현금화·포괄매입 보증)이라서';
        }},
        { id: 'ksure-direct', pri: 2, match: function (c) {
            return (c.st >= 3 && c.st <= 5 && c.sme && (c.rev === 0 || (c.rev >= 2 && c.rev <= 4)))
                ? '매출 1억~100억 원·수출실적 1만~200만 달러 미만 수출초보 중소기업 대상이라서' : '';
        }},
        { id: 'ksure-plus', pri: 2, match: function (c) {
            // 2026-11-26 작가님: 로컬 수출·신용장·선수금 외의 거래면 대금 미회수 담보 보험 추천(중소·중견기업 대상 상품)
            if (c.unpaidRisk && c.smeOrMid) return '선수금·신용장 외 결제 방식(' + c.unpaidRisk + ')이 있어 대금 미회수 위험을 담보하는 무보 보험이라서';
            return (c.rev === 4 && c.smeOrMid) ? '매출 20억~100억 원 미만 본격 성장 중소기업(단기수출보험)이라서' : '';
        }},
        { id: 'ksure-dplus', pri: 2, match: function (c) {
            // 다이렉트-중소Plus+는 중소기업 전용(K-SURE ON 비대면)
            return (c.unpaidRisk && c.sme) ? '선수금·신용장 외 결제 방식(' + c.unpaidRisk + ')이 있어 대금 미회수 위험을 담보하는 무보 비대면 보험(중소기업 전용)이라서' : '';
        }},
        { id: 'fx', pri: 2, match: function (c) {
            return (c.rev === 5) ? '매출 100억 원 이상 중기업·강소기업(환변동보험 설계)이라서' : '';
        }},
        { id: 'trade-sure', pri: 2, match: function (c) {
            if (!(c.st <= 5 && c.sme)) return '';
            return c.dealFund
                ? '수출실적이 아직 없는 계약·협상 중소기업도 이용 가능(무보 무료 1:1 컨설팅 총 6회)이라서'
                : '연간 수출실적 1천만 달러 미만 수출(예정) 중소기업 대상(무료 1:1 컨설팅 총 6회)이라서';
        }},
        { id: 'credit', pri: 2, match: function (c) {
            return c.dealFund ? '수출실적이 없어도 계약·협상 바이어의 신용을 미리 확인할 수 있는 무보 서비스라서' : '';
        }},
        { id: 'ksight', pri: 2, match: function (c) {
            return c.dealFund ? '수출실적이 없어도 바이어·거래처 정보를 조회할 수 있는 무보 K-SIGHT·트라이빅이라서' : '';
        }},

        // ── 신용보증기금 (신보) ──
        { id: 'kodit-export', pri: 2, match: function (c) {
            return c.sme ? '모든 수출 중소기업 대상(수출 역량 단계별 종합지원)이라서' : '';
        }},
        { id: 'kodit-startup', pri: 2, match: function (c) {
            if (!c.under7 || !c.sme) return '';
            return c.pre ? '예비창업자(예비창업·창업단계 보증) 대상이라서' : '창업 7년 미만 중소기업이라서';
        }},
        { id: 'kodit-youth', pri: 2, match: function (c) {
            return (c.youth && c.under7 && c.sme) ? '청년·창업 7년 이내 기업이라서' : '';
        }},
        { id: 'kodit-senior', pri: 2, match: function (c) {
            if (c.restart && c.sme) return '재창업·중장년 기업이라서';
            if (c.over7 && c.sme) return '창업 7년 이상·중장년 기업 검토 대상이라서';
            return '';
        }},
        { id: 'kodit-retry', pri: 2, match: function (c) {
            return (c.restart && c.sme) ? '재도전·재창업 중소기업이라서' : '';
        }},
        { id: 'kodit-mainbiz', pri: 2, match: function (c) {
            return (c.mainbiz && c.sme) ? '메인비즈 인증 중소기업이라서' : '';
        }},
        { id: 'kodit-service', pri: 2, match: function (c) {
            return (c.service && c.sme) ? '서비스·콘텐츠 수출기업이라서' : '';
        }},
        { id: 'kodit-esg', pri: 2, match: function (c) {
            if (c.esg && c.sme) return '소부장·스마트공장·ESG 우대조건이라서';
            if ((c.industrial || c.electronics || c.medical) && c.sme) return '기계·장비·소재·부품·전기전자·의료기기 중소기업이라서';
            return '';
        }},
        { id: 'kodit-mature', pri: 3, match: function (c) {
            if (c.rev === 5 && c.smeOrMid) return '매출 100억 원 이상 중기업·강소기업 지속성장·중견 도약 보증 대상이라서';
            return ((c.over7 || c.st >= 5 || c.has2('mid')) && c.smeOrMid)
                ? '업력 7년 이상·100만 달러 이상·중견 도약 기업이라서' : '';
        }},

        // ── 기술보증기금 (기보) ──
        { id: 'kibo', pri: 2, match: function (c) {
            if (c.venture || c.innobiz || c.lab) return '벤처·이노비즈·연구소 보유 기술수출기업이라서';
            if (c.rev === 3 && c.sme) return '매출 5억~20억 원 미만 성장 초입 소기업(기보 진입·수출기업보증)이라서';
            return '모든 수출(예정)기업 대상(기보 수출기업보증)이라서';
        }},
        { id: 'kibo-rnd', pri: 2, match: function (c) {
            if ((c.lab || c.venture || c.innobiz) && c.sme) return '기업부설연구소·벤처·이노비즈 보유 중소기업(기보 R&D보증)이라서';
            if (c.rev === 3 && c.sme) return '매출 5억~20억 원 미만 성장 초입 소기업(기보 R&D 개발·사업화 보증)이라서';
            if (c.under3 && c.sme && (c.industrial || c.electronics || c.medical || c.service)) return '초기 창업 기술·개발기업(기보 R&D 개발·사업화 보증)이라서';
            return '';
        }},
        { id: 'kibo-retry', pri: 2, match: function (c) {
            return (c.restart && c.sme) ? '재도전·재창업 중소기업(기보 재도전 재기지원보증)이라서' : '';
        }},
        { id: 'kibo-pre', pri: 2, match: function (c) {
            return (c.pre && c.sme) ? '예비창업자(기보 예비창업자 사전보증)라서' : '';
        }},
        { id: 'kibo-youth', pri: 2, match: function (c) {
            return (c.youth && c.under7 && c.sme) ? '청년·창업 7년 이내 기업(기보 청년창업기업 우대 프로그램)이라서' : '';
        }},
        { id: 'kibo-social', pri: 2, match: function (c) {
            return (c.social && c.sme) ? '사회적기업·소셜벤처 우대조건(기보 소셜벤처 임팩트 보증)이라서' : '';
        }},

        // ── 지역신용보증재단 (서울신용보증재단) ──
        { id: 'seoul-shinbo', pri: 2, match: function (c) {
            if (c.smallbiz || c.disabled || c.social) return '소상공인·장애인·사회적기업 보증 대상이라서';
            if (c.rev === 2 && c.sme) return '매출 1억~5억 원 미만 소상공인·소기업 지역신용보증 대상이라서';
            if (c.has2('small') || c.under7 || c.esg) return '소기업·창업·ESG 기업 지역신용보증 검토 대상이라서';
            return '';
        }},

        // ── 비금융 수출·창업 지원사업 ──
        { id: 'k-aitc', pri: 2, match: function (c) {
            if (c.rev !== 1) return '';
            return c.noRev ? '매출 없음 초기 기업(KOTRA AI무역지원센터 무료 지원)이라서' : '매출 1억 원 미만 초기 기업(KOTRA AI무역지원센터 무료 지원)이라서';
        }},
        { id: 'k-domestic', pri: 2, match: function (c) {
            if (c.st <= 3 && c.hasAny(['buyer', 'market', 'support', 'need:market', 'need:fund', 'form:local']))
                return c.whyTags(['buyer', 'market', 'support', 'need:market', 'need:fund', 'form:local']);
            if (c.rev === 1 && c.st <= 3) return c.noRev ? '매출 없음 초기 기업(기초 수출 준비)이라서' : '매출 1억 원 미만 초기 기업(기초 수출 준비)이라서';
            return '';
        }},
        { id: 'voucher', pri: 2, match: function (c) {
            if (c.hasAny(['support', 'buyer', 'market', 'cert', 'need:market', 'need:fund']))
                return c.whyTags(['support', 'buyer', 'market', 'cert', 'need:market', 'need:fund']);
            if (c.rev === 2) return '매출 1억~5억 원 미만 초보 수출바우처 대상이라서';
            return '';
        }},
        { id: 'k-market', pri: 3, match: function (c) {
            if (c.hasAny(['buyer', 'market', 'need:market'])) return c.whyTags(['buyer', 'market', 'need:market']);
            if (c.rev === 3) return '매출 5억~20억 원 미만 본격 바이어 발굴·시장조사 대상이라서';
            return '';
        }},
        { id: 'k-branch', pri: 3, match: function (c) {
            if (c.hasAny(['buyer', 'market', 'need:market'])) return c.whyTags(['buyer', 'market', 'need:market']);
            if (c.rev === 4) return '매출 20억~100억 원 미만 본격 성장 중소기업(KOTRA 지사화사업)이라서';
            return '';
        }},
        { id: 'rnd', pri: 2, match: function (c) {
            if (c.pre) return '예비창업자(예비창업패키지·창업지원사업)라서';
            if (c.rev === 1) return c.noRev ? '매출 없음 초기 기업(창업지원사업)이라서' : '매출 1억 원 미만 초기 기업(창업지원사업)이라서';
            if (c.rev === 3 && c.sme) return '매출 5억~20억 원 미만 성장 초입 소기업(디딤돌 R&D 자격 구간)이라서';
            if (!c.under7) return '';
            if (c.hasAny(['support', 'fund', 'need:fund'])) return c.whyTags(['support', 'fund', 'need:fund']);
            if (c.venture || c.lab || c.youth) return '창업 7년 이내·기술/청년 기업이라서';
            return '';
        }},

        // ── 한국은행 무역금융 (pri: 4, 기업은행보다 앞 · 2026-11-26 작가님) ──
        { id: 'bok-tf', pri: 4, match: function () {
            return '모든 수출기업 대상(한국은행 무역금융 · 개편 예정, 은행 확인)이라서';
        }},
        { id: 'bok-local', pri: 4, match: function (c) {
            return c.hasAny(['form:local']) ? '로컬 수출(국내 수출기업 납품) 기업이라서(내국신용장·구매확인서)' : '';
        }},

        // ── IBK기업은행 (pri: 4) ──
        { id: 'ibk-export', pri: 4, match: function () {
            return '모든 수출기업 대상(IBK 무역금융·관세피해 지원대출)이라서';
        }},
        { id: 'ibk-youth', pri: 4, match: function (c) {
            return (c.youth && c.under7 && c.sme) ? '청년·창업기업 대상(IBK유망청년창업대출)이라서' : '';
        }},
        { id: 'ibk-startup', pri: 4, match: function (c) {
            return (c.under7 && c.sme) ? '창업 7년 미만 중소기업 대상(IBK혁신창업·스텝업·스타트업대출)이라서' : '';
        }},
        { id: 'ibk-venture', pri: 4, match: function (c) {
            return ((c.venture || c.innobiz || c.lab) && c.sme) ? '벤처·이노비즈·연구소 보유 중소기업 대상(IBK벤처·첨단혁신 대출)이라서' : '';
        }},
        { id: 'ibk-esg', pri: 4, match: function (c) {
            return (c.esg && c.sme) ? '소부장·ESG 우대조건(ESG경영 성공지원 대출)이라서' : '';
        }},
        { id: 'ibk-smallbiz', pri: 4, match: function (c) {
            return c.smallbiz ? '소상공인 대상(가치성장·경영안정·희망Dream·골목상권 대출)이라서' : '';
        }},

        // ── 한국수출입은행 (수은 · 문턱이 높아 기은 다음 맨 마지막 · pri: 5) ──
        { id: 'exim-growth', pri: 5, match: function (c) {
            return (c.st >= 1 && c.smeOrMid) ? '수출실적 보유 중소·중견기업 운전자금 대상이라서' : '';
        }},
        { id: 'exim-perform', pri: 5, match: function (c) {
            return (c.st >= 1 || (c.st === 0 && c.a.q1b === 'order')) ? '수출계약 이행 자금 대상이라서' : '';
        }},
        { id: 'exim-promo', pri: 5, match: function (c) {
            if (c.rev === 5) return '매출 100억 원 이상 중기업·강소기업(해외투자·중장기 수출금융) 대상이라서';
            return (c.smeOrMid || c.service || c.esg) ? '수출 전환·확대 설비·기술개발·시장개척 자금 대상이라서' : '';
        }}
    ];

    // ── 수출실적 0 + 수출계약 보유(협상 중 포함) 기업 전용 자금 안내 (2026-11-24 작가님: 가장 중요한 고객, 친절하고 자세하게) ──
    // 대상: Q1 수출실적 '없음'(s0) + 진행 거래 '협상·샘플 진행 중'(nego) 또는 '첫 주문을 받았음'(order).
    // 계약금액 10만 달러 미만(d1~d3)이 정확히 맞는 구간이고, 10만 달러 이상(d4·d5)은 같은 안내에 '한도가 달라질 수 있음' 문구를 덧붙인다.
    // 이 구간에서는 무보(한국무역보험공사) 금융·보험 상품을 추천에서 뺀다(작가님 지시: 실무상 승인 문턱이 높음). excludeIds·excludeUrl 참고.
    // pts 의 chk: true 는 최신 공고 원문으로 다시 확인하지 못한 내용 → 화면에 '공고 확인' 표시. 수치를 고치면 출처도 함께 확인한다.
    // 확인 출처(2026-11-24): 사이트 policy-finance.html 의 신보·기보·중진공·소진공·수은·IBK 안내(기관 원문을 옮긴 것),
    //   광주신용보증재단 '수출유망 중소기업 지원 특례보증' 공고(일반 수출기업 트랙 = 당기 또는 최근 1년 이내 수출실적 보유),
    //   신보 울산영업본부 2017 공지(수출희망 = 수출을 희망 또는 준비 중인 기업, 평가 점수 80점 이상), 중기부 2024 지원사업 책자 수은 편(수출초보 60점·신용등급평가 생략·최대 0.3%p).
    var DEAL_FUND = {
        when: function (a) { return a.q1 === 's0' && (a.q1b === 'nego' || a.q1b === 'order'); },
        bigDeal: ['d4', 'd5'],
        title: '수출계약을 준비 중인 기업을 위한 자금 안내',
        // 위 안내와 겹쳐서 아래 '조건에 맞는 정책금융' 등에서 빼는 항목
        coveredIds: ['kodit-export', 'kodit', 'kibo', 'kosmes-dom', 'kosmes-startup', 'kosmes-growth', 'semas-general', 'semas-maker', 'semas-youth', 'semas-innov', 'seoul-shinbo', 'exim-perform', 'ibk-export'],
        // 무보 금융·보험 상품(이 구간에서 추천 제외). TRADE-SURE 무료 컨설팅·K-SIGHT 바이어 검색·국외기업 신용조사는 계약만 있는 기업에도 계속 추천한다(2026-11-24 작가님 확정).
        excludeIds: ['guarantee', 'claim', 'claim-exempt', 'ksure-direct', 'ksure-postship', 'ksure-after', 'ksure-plus', 'ksure-dplus', 'ksure-group', 'ksure-agri', 'ksure-service', 'ins-support', 'kon', 'qna-f', 'fx', 'qna-fx', 'import-ins'],
        excludeUrl: ['trade-insurance.html#ksure', 'org=ksure'],
        statusLabel: { ok: '가능', cond: '조건부 가능', alt: '수출 전용은 아직 불가 · 일반자금', deal: '계약서가 있으면' },
        rows: [
            { org: '신용보증기금(신보)', st: 'ok', product: '수출중소기업 종합지원보증 — 수출희망 단계', link: 'kodit-export',
              pts: [
                  { t: '수출을 희망하거나 준비 중인 중소기업이 들어가는 첫 단계입니다. 수출실적이 아직 없어도 이 단계로 상담을 시작할 수 있습니다.', chk: true },
                  { t: '수출 단계별로 보증비율 90~100%, 보증료 0.2~0.3%p 차감 우대가 있습니다(신보 안내 기준).' },
                  { t: '희망 단계는 별도 평가(평가 점수 80점 이상)를 거친다고 안내된 적이 있습니다.', chk: true }
              ],
              where: '가까운 신보 영업점 상담 → 보증 심사 → 보증서를 받아 은행 대출' },
            { org: '기술보증기금(기보)', st: 'ok', stText: '가능(기술기업)', product: '수출기업보증 — 수출예상기업', link: 'kibo', tech: true,
              pts: [
                  { t: '향후 수출이 생길 것으로 예상되는 기술혁신선도형기업(수출실적이 당기매출액 등의 10% 미만인 기업 포함)이 대상입니다. 수출계약서·주문서처럼 수출이 예상된다는 근거를 함께 내면 설명하기 쉽습니다.' },
                  { t: '보증비율 85% → 90~95%로 올려 주고, 보증료 0.2~0.4%p 감면과 심사 완화가 있습니다(기보 안내 기준).' },
                  { t: '수출바우처·신규수출기업화사업·K-Global 300 등에 선정되면 \'수출선정기업\'으로 구분됩니다.' }
              ],
              where: '가까운 기보 영업점 상담 → 기술평가 → 보증서를 받아 은행 대출' },
            { org: '중소벤처기업진흥공단(중진공)', st: 'cond', product: '신시장진출지원자금(내수기업 수출기업화)', link: 'kosmes-dom',
              pts: [
                  { t: '원칙은 최근 1년 수출실적 1달러~10만 달러 미만 기업이지만, 실적이 없어도 ① 정부·지자체 수출지원사업 참여기업(수출 관련 지정제도 선정기업 포함)이나 ② 기술 수출 실적 또는 계약을 가진 기업이면 대상이 됩니다(중진공 융자계획 기준).' },
                  { t: '어떤 수출지원사업(수출바우처 등)이 인정되는지는 그해 공고로 확인하세요.', chk: true },
                  { t: '직접대출로 운전자금 연 10억 원 이내, 최대 5년(거치 2년)입니다.' },
                  { t: '위 조건에 해당하지 않으면 일반 자금을 씁니다: 업력 7년 미만은 혁신창업사업화자금(창업기반지원자금, 운전 5억 원 이내), 7년 이상은 신성장기반자금(혁신성장지원자금, 운전 5억 원 이내).', age: true },
                  { t: '소상공인도 신시장진출지원자금은 신청할 수 있지만, 그 밖의 중진공 자금은 제조업 등 예외 업종이어야 합니다.', chk: true, small: true }
              ],
              where: '중진공 누리집 온라인 신청 → 지역본부 상담·평가 → 직접대출' },
            { org: '소상공인시장진흥공단(소진공)', st: 'alt', product: '소공인특화자금 · 일반경영안정자금', link: 'semas-general', small: true,
              pts: [
                  { t: '수출 소상공인 전용인 혁신성장촉진자금(혁신형)은 최근 1년 이내 직·간접 수출실적 1,000달러 이상이 있어야 합니다. 첫 수출 뒤에 다시 확인하세요.' },
                  { t: '제조업 상시근로자 10인 미만 소공인: 소공인특화자금(운전 1억 원·시설 5억 원 한도).' },
                  { t: '그 밖의 소상공인: 일반경영안정자금(한도 7천만 원, 5년·거치 2년, 기준금리+0.6%p).' },
                  { t: '청년 대표이거나 청년을 고용했다면 청년고용연계자금(한도 7천만 원)도 볼 수 있습니다.', youth: true }
              ],
              where: '소상공인정책자금 누리집 신청 → 대리대출은 은행 창구' },
            { org: '지역신용보증재단(지역신보)', st: 'alt', stText: '수출 특례는 아직 불가 · 일반보증', product: '일반 신용보증 · 소기업·소상공인 협약보증', link: 'seoul-shinbo',
              pts: [
                  { t: '수출유망 중소기업 지원 특례보증의 일반 수출기업 트랙은 당기 또는 최근 1년 이내 수출실적이 있어야 합니다(광주신용보증재단 공고 기준, 지역마다 다를 수 있음).' },
                  { t: '지금은 사업장 소재지 재단의 일반 신용보증이나 소기업·소상공인 협약보증으로 운전자금을 마련하세요. 한도와 신용평점 기준은 재단 공고를 확인하세요.', chk: true }
              ],
              where: '사업장 소재지 신용보증재단 지점 또는 앱' },
            { org: '시중은행', st: 'deal', product: '무역금융(수출신용장·수출계약서 기준)', link: 'ibk-export', contract: true,
              pts: [
                  { t: '수출신용장이나 수출계약서를 근거로 원자재 구매, 제조·가공, 완제품 구매에 드는 자금을 단계별로 빌리는 은행 대출입니다.' },
                  { t: '과거 실적이 아니라 계약서를 기준으로 신청할 수 있고, 한국은행 지원과 연계돼 금리 부담이 낮은 편입니다. 금리·한도는 은행마다 다릅니다.', chk: true },
                  { t: '담보가 부족하면 신보·기보·지역신보 보증서를 붙여 쓰는 경우가 많습니다. 그래서 보증기관 상담을 먼저 권합니다.' }
              ],
              where: '거래 은행 기업금융 창구' },
            { org: '한국수출입은행(수은)', st: 'deal', product: '수출이행자금 대출', link: 'exim-perform', contract: true,
              pts: [
                  { t: '수출계약 한 건의 제작부터 대금 회수까지 드는 자금입니다. (수출계약금액 − 이미 받은 금액) × 90% 이내, 최종 수출대금 결제기일에 30일을 더한 기간 이내로 빌립니다(수은 안내 기준).' },
                  { t: '수출초보 중소기업은 수출거래 안전성 평가 기준 완화(60점 이상)·신용등급평가 생략·우대금리(최대 0.3%p)가 안내된 적이 있습니다.', chk: true },
                  { t: '지원 대상 물품과 계약 조건은 수은 지점에서 먼저 확인하세요.' }
              ],
              where: '수은 본점·지점 상담' }
        ],
        // 추천 순서(왜 이 순서인지). 일반 중소기업 / 소상공인
        paths: {
            sme: {
                t: '일반 중소기업이라면 이 순서를 권합니다',
                steps: [
                    { h: '신보(수출희망) 또는 기보(수출예상) 보증 상담부터', why: '실적이 없어도 열려 있는 \'수출 전용\' 보증이 이 두 곳입니다. 보증서가 있어야 은행이 담보 없이 빌려 주기 쉽습니다. 특허·기술력이 강점이면 기보, 아니면 신보를 먼저 찾아가세요. 두 곳을 동시에 쓰기는 어려울 수 있으니 한 곳을 정해 상담하세요.' },
                    { h: '계약서(또는 신용장)를 들고 은행 무역금융 신청', why: '이번 계약 건의 원자재·생산 자금에 딱 맞춘 대출이고, 1단계 보증서를 붙이면 금리와 담보 부담이 줄어듭니다.', contract: true },
                    { h: '계약 금액이 크거나 제작 기간이 길면 수은 수출이행자금도 검토', why: '계약 한 건을 기준으로 받은 돈을 뺀 금액의 90%까지 볼 수 있어, 큰 계약이나 긴 제작 기간에 맞습니다.', contract: true },
                    { h: '수출바우처 등 수출지원사업에 미리 신청해 두기', why: '선정되면 중진공 신시장진출지원자금(내수기업 수출기업화)의 대상이 되고, 해외 마케팅 비용도 지원받습니다. 다음 해 자금까지 미리 준비하는 셈입니다.' }
                ]
            },
            small: {
                t: '소상공인이라면 이 순서를 권합니다',
                steps: [
                    { h: '급한 운전자금은 지역신보 일반보증이나 소진공 자금으로', why: '수출 전용 상품은 아직 실적이 필요하지만, 지역신보 일반보증·협약보증과 소진공 일반경영안정자금·소공인특화자금은 실적 없이도 소상공인이 바로 쓸 수 있습니다.' },
                    { h: '계약서가 있으면 은행 무역금융도 함께 상담', why: '지역신보 보증서를 붙여 계약 건의 생산 자금을 마련할 수 있습니다.', contract: true },
                    { h: '수출바우처(내수기업 트랙) 등 수출지원사업 신청', why: '선정되면 중진공 신시장진출지원자금의 예외 조건이 열리고, 해외 마케팅 비용도 지원받습니다.' },
                    { h: '선정 뒤 중진공 신시장진출지원자금(내수기업 수출기업화)으로', why: '운전자금 연 10억 원 이내 직접대출이라, 소진공·지역신보보다 큰 수출 자금을 마련할 수 있습니다.' },
                    { h: '첫 수출 실적(1,000달러 이상)이 생기면 수출 전용 상품으로', why: '소진공 혁신성장촉진자금과 지역신보 수출유망 특례보증이 그때부터 열립니다.' }
                ]
            }
        },
        docs: [
            { t: '수출계약서(또는 서명한 PO·PI, 신용장)', nego: '협상 중이면 견적서·PI·바이어와 주고받은 이메일 등 진행 자료' },
            { t: '사업자등록증, 최근 재무제표(없으면 부가가치세 과세표준증명)' },
            { t: '국세·지방세 납세증명서' },
            { t: '회사·제품 소개서와 바이어 정보(나라·회사명·거래 조건)' },
            { t: '(있으면) 수출바우처 등 선정 확인서, 특허·벤처·이노비즈 등 기술 서류' }
        ],
        ksureNote: '무역보험공사(무보) 보증 상품은 기본적으로 수출실적 근거로 보증한도가 산출되니 수출실적이 어느 정도 쌓이면 그때 무보 보증서 활용을 고려해보세요. 다만 TRADE-SURE 무료 컨설팅·K-SIGHT 바이어 검색·국외기업 신용조사는 실적이 없어도 바로 이용할 수 있어 아래 추천에 포함했습니다.',
        bigNote: '이번 건 계약금액이 10만 달러 이상이면 기관마다 한도·심사 방식이 달라질 수 있습니다. 아래 안내를 출발점으로 보시고, 금액에 맞춘 조합은 상담에서 함께 짜 드립니다.',
        negoNote: '아직 계약 전이라면, ‘계약서가 있으면’ 표시가 붙은 자금지원은 양 당사자의 서명이 완료된 뒤 신청할 수 있습니다. 보증 상담은 지금 바로 시작하셔도 됩니다.',
        disclaimer: '이 안내는 각 기관이 공개한 자료를 바탕으로 정리한 참고용이며, 보증·대출 승인을 보장하지 않습니다. \'공고 확인\' 표시가 붙은 내용은 최신 공고 원문으로 아직 확인하지 못한 것이니, 신청 전에 해당 기관에 꼭 확인하세요.'
    };

    // 후순위 '더 찾아볼 곳'(2026-11-22 작가님): 묶음의 on 과 고른 항목이 겹치면 묶음 안 기관을 모두 아래쪽에 보여 준다(위에서 이미 나온 곳은 뺀다).
    // 항목별 on 이 있으면 그 항목은 그 조건일 때만, st 가 있으면 그 수출실적 단계에서만, skipIf 가 있으면 해당 세부 상품이 이미 노출됐을 때 생략한다.
    var EXTRA = [
        { t: '자금·보증 기관', on: ['fund', 'need:fund'],
          items: [
              { id: 'policy-fund' }, { id: 'guarantee' },
              { id: 'kodit', skipIf: ['kodit-export', 'kodit-startup', 'kodit-youth', 'kodit-senior', 'kodit-retry'] },
              { id: 'kibo', skipIf: ['kibo-rnd', 'kibo-retry', 'kibo-pre', 'kibo-youth', 'kibo-social'] }, { id: 'seoul-shinbo' }, { id: 'kita-fund' },
              { id: 'ksure-direct', st: [3, 4, 5] },
              { id: 'exim', skipIf: ['exim-promo', 'exim-growth', 'exim-perform'] }
          ] },
        { t: '바이어 발굴·판로', on: ['buyer', 'market', 'need:market', 'form:b2b', 'form:b2c'],
          items: [{ id: 'buyer' }, { id: 'ksight' }, { id: 'b-data' }, { id: 'k-exhib' }, { id: 'akei' }, { id: 'b-b2b' }, { id: 'b-potential' }, { id: 'k-bts' }, { id: 'k-aitc' }, { id: 'c-amazon' }, { id: 'b2c' }, { id: 'c-more' }] },
        { t: '무역보험 이용', on: ['collect', 'importer', 'factoring', 'tclaim', 'need:fund', 'pay:deferred', 'pay:collection', 'form:relay', 'form:import'],
          items: [{ id: 'ksure-group', st: [0, 1, 2] }, { id: 'ins-support' }, { id: 'kon' }, { id: 'qna-f' }, { id: 'import-ins', on: ['form:relay', 'form:import'] }] },
        { t: '환율', on: ['fx'], items: [{ id: 'fxinfo' }] },
        // 낮은 순위(후순위) B2B·B2C·소상공인·소기업·중소기업 대상 주요 수출 플랫폼·정보·바우처 포털(2026-11-24)
        { t: '바이어 매칭·온라인 수출 플랫폼 (B2B·B2C)', on: ['buyer', 'market', 'need:market', 'form:b2b', 'form:b2c', 'size:smallbiz', 'size:small', 'size:medium', 'size:sme'],
          items: [{ id: 'gobizkorea' }, { id: 'buykorea-portal', skipIf: ['buykorea'] }] },
        { t: '시장 분석·수출 정보 포털', on: ['form:b2b', 'form:b2c', 'size:smallbiz', 'size:small', 'size:medium', 'size:sme'],
          items: [{ id: 'tribig' }, { id: 'kotra-dream' }, { id: 'kita-portal' }] },
        { t: '수출 지원사업·바우처 포털', on: ['form:b2b', 'form:b2c', 'size:smallbiz', 'size:small', 'size:medium', 'size:sme'],
          items: [{ id: 'voucher-portal' }] }
    ];
    // 결과 맨 아래 고정 줄
    var FOOT_LINKS = ['roadmap', 'notices', 'ins-cases', 'k-cases'];

    // 수출 5단계 로드맵(export-roadmap.html) 연결 (2026-11-22, PRD '5단계 수출 실행 로드맵 페이지 PRD' 6장)
    // 실적 구간은 '규모', 로드맵 단계는 '거래 순서'라 1:1이 아니다. 먼저 볼 단계만 추천하고, 고른 어려움의 단계를 함께 보여 준다.
    var ROADMAP = {
        url: 'export-roadmap.html',
        names: ['', '수출 준비도 점검', '바이어 발굴', '거래조건 검토', '금융·보험 설계', '선적·대금 회수·사후관리'],
        // 실적 구간 → 먼저 볼 단계. s0 은 진행 거래(q1b)가 협상·첫 주문이면 3단계
        stage: { s0: 1, s1: 2, s2: 2, s3: 3, s4: 4, s5: 4, s6: 4 },
        s0Deal: { nego: 3, order: 3 },
        // 어려운 점(Q6) → 관련 단계
        issue: { market: 1, cert: 1, hs: 1, support: 1, buyer: 2, docs: 3, importer: 3, fraud: 3, tclaim: 3, fund: 4, collect: 4, factoring: 4, fx: 4 }
    };

    // 결과 맨 앞 '먼저 찾아볼 정보 사이트'(2026-11-24 작가님). 조건은 '또는', 이 순서대로 보인다.
    // c: { st(실적 구간 번호 0~6), item(품목 코드) }
    // 수출경험이 많지 않음 = 최근 1년 수출실적 10만 달러 미만(s0~s3, KOTRA 내수기업 수출기업화 기준과 같음)
    var AI_PICKS = [
        // 옛 Q8 '전문가 상담' 조건은 질문 삭제(2026-11-24)로 뺐다
        { id: 'kotra-ai', when: function (c) { return c.st <= 3; },
          why: function () { return '수출을 시작하거나 경험을 쌓는 단계라서'; } },
        { id: 'kati', when: function (c) { return c.item('agri'); }, why: function () { return '농수산식품 수출(예정)기업이라서'; } },
        { id: 'kocei', when: function (c) { return c.item('cosmetic'); }, why: function () { return '화장품 수출(예정)기업이라서'; } },
        { id: 'kcii', when: function (c) { return c.item('cosmetic'); }, why: function () { return '화장품 수출(예정)기업이라서'; } }
    ];

    // 수출 형태별 참고(결과 화면 아래 작은 묶음)
    var FORM_LINKS = {
        local: ['bok-local', 'k-domestic', 'qna-fx'],
        b2c:   ['c-amazon', 'gm-kosmes', 'op-semas', 'b2c'],
        b2b:   ['buyer', 'doc-builder'],
        relay: ['ksure-plus', 'claim-exempt'],
        import: ['import-ins', 'customs', 'trade-stats'],
        other: []
    };

    var SHORT = {
        q2: { pre: '예비창업', startup: '창업 3년 이내', y7: '창업 3년 초과~7년 이내', y7p: '창업 7년 초과', youth: '청년', women: '여성', disabled: '장애인', social: '사회적', venture: '벤처', innobiz: '이노비즈', mainbiz: '메인비즈', lab: '연구소 보유', mfg: '제조업', restart: '재창업·중장년', proc_cert: '혁신·녹색·우수조달제품', pref_etc: '', esg_local: '소부장·ESG·비수도권', smallbiz: '소상공인', small: '소기업(소상공인 제외)', medium: '중기업', mid: '중견기업', large: '대기업', etc: '' },
        q1b: { prep: '준비 중', nego: '협상·샘플 진행 중', order: '첫 주문 받음' }
    };

    // 품목별 핵심 체크·추천 기관·교차 조건 안내(2026-11-24, 8개 품목 세분화)
    // 복수 품목 선택 시 결과 화면(#egItemGuide)에서 URL 기준으로 중복 제거한다.
    // 지원 비율·한도 등 해마다 바뀌는 수치는 최신 공고 확인 안내를 함께 적는다.
    var ITEM_GUIDES = {
        cosmetic: {
            priorityTip: 'EU CPNP(현지 책임자 RP·PIF 준비), 미국 FDA, 중국 NMPA 등 국가별 화장품 등록 및 라벨링 규제를 먼저 확인하세요.',
            programs: [
                { name: '해외규격인증획득지원센터', url: 'https://www.smes.go.kr/globalcerti/main.do', ext: true, desc: 'CPNP·할랄(패스트트랙) 및 NMPA 등 화장품 해외인증 비용 지원(지원 비율·한도는 최신 공고 확인)' },
                { name: '해외지식재산센터 (IP-DESK)', url: 'https://www.ip-navi.or.kr', ext: true, desc: '해외 상표 출원 비용 지원 및 K-뷰티 브랜드 무단선점·위조품 대응' },
                { name: 'KOTRA 한류박람회·유통망 협력', url: 'https://www.kotra.or.kr', ext: true, desc: 'K-뷰티 특화 해외 판촉전 및 현지 온·오프라인 유통망 입점 연계' }
            ],
            crossRule: { issues: ['cert', 'hs'], pinTop: ['해외규격인증획득지원센터', '해외지식재산센터 (IP-DESK)'] }
        },
        agri: {
            priorityTip: '수출국 검역·성분규제·라벨링 현지화가 핵심입니다. aT 농식품글로벌성장패키지는 수출바우처와 중복 불가하므로 유리한 쪽을 선택하세요.',
            programs: [
                { name: 'aT 수출종합지원시스템', url: 'https://global.at.or.kr', ext: true, desc: '농식품글로벌성장패키지 및 현지화(라벨링·FDA·할랄 등) 지원(지원 비율·한도는 최신 공고 확인)' },
                { name: '수산물 수출정보포털 (K-Seafood)', url: 'https://www.kfishinfo.co.kr', ext: true, desc: '수산가공식품 수출 통계, 해외시장 정보 및 수산물 특화 수출지원사업' },
                { name: '해외규격인증획득지원센터', url: 'https://www.smes.go.kr/globalcerti/main.do', ext: true, desc: '할랄(패스트트랙) 및 식품 안전·규격 해외인증 비용 지원(지원 비율·한도는 최신 공고 확인)' }
            ],
            crossRule: { issues: ['support', 'buyer', 'market'], tip: '농식품 기업은 KOTRA 수출바우처와 aT 농식품글로벌성장패키지 중복 지원이 불가하니 조건을 비교하세요.' }
        },
        consumer: {
            priorityTip: 'B2C 역직구(아마존·쇼피 등)나 해외 유통망 입점 전에 진출국 상표권 출원(IP-DESK)을 먼저 챙기세요.',
            programs: [
                { name: 'KOTRA 파워셀러·1무역관 1유통망', url: 'https://www.kotra.or.kr', ext: true, desc: '글로벌 이커머스 파워셀러 육성 및 해외 현지 유력 유통망 입점·판촉 지원' },
                { name: '고비즈코리아 (글로벌쇼핑몰 지원)', url: 'https://kr.gobizkorea.com', ext: true, desc: '아마존·쇼피·큐텐 등 글로벌 온라인몰 입점, 상세페이지 제작 및 공동물류 연계' },
                { name: '해외지식재산센터 (IP-DESK)', url: 'https://www.ip-navi.or.kr', ext: true, desc: '해외 상표·디자인 출원 비용 지원 및 현지 지재권 침해 예방' }
            ],
            crossRule: { issues: ['buyer', 'market'], pinTop: ['KOTRA 파워셀러·1무역관 1유통망', '고비즈코리아 (글로벌쇼핑몰 지원)'] }
        },
        medical: {
            priorityTip: '수출국 인허가(FDA·CE·PMDA) 및 품질인증 요건 확인이 최우선입니다. 인허가 기간과 비용을 고려해 지원사업을 먼저 확보하세요.',
            programs: [
                { name: '해외규격인증획득지원센터', url: 'https://www.smes.go.kr/globalcerti/main.do', ext: true, desc: 'CE·ISO 13485 등 시험·인증·컨설팅비 지원(세부 비율·한도는 최신 공고 확인)' },
                { name: '해외인증정보시스템 (KTL)', url: 'https://www.certinfo.kr/index.do', ext: true, desc: '국가별 강제·임의 시험인증제도 사전 조회 및 상담' },
                { name: '수출바우처 포털', url: 'https://www.exportvoucher.com', ext: true, desc: '해외규격인증 신규 취득 및 기존 인증 갱신비·연회비 바우처 활용' }
            ],
            crossRule: { stageZero: true, alert: '인허가 완료 전 선적·계약 리스크 주의 — 1:1 사전 상담을 권장합니다.' }
        },
        electronics: {
            priorityTip: '국가별 안전·전파 강제인증(CE·UL·PSE 등)과 전략물자 사전 판정, HS코드 확정을 선적 전에 반드시 마쳐야 합니다.',
            programs: [
                { name: '해외규격인증획득지원센터', url: 'https://www.smes.go.kr/globalcerti/main.do', ext: true, desc: 'EU CE, 미국 NRTL(UL) 등 500여 개 해외인증 비용 지원(세부 비율·한도는 최신 공고 확인)' },
                { name: '전략물자관리시스템 (YesTrade)', url: 'https://www.yestrade.go.kr', ext: true, desc: '전략물자 온라인 자가판정·전문판정, 수출허가 및 부적격거래자 사전 검색' },
                { name: '해외기술규제포털 (KnowTBT)', url: 'https://www.knowtbt.kr/', ext: true, desc: '국가별 전기·전자 기술규제(TBT) 동향 및 강제인증 변화 모니터링' },
                { name: '관세청 UNI-PASS', url: 'https://unipass.customs.go.kr/csp/index.do', ext: true, desc: '복합 전자기기 HS코드 품목분류 사전심사 및 수출신고필증 조회' }
            ],
            crossRule: { issues: ['cert', 'hs'], pinTop: ['해외규격인증획득지원센터', '전략물자관리시스템 (YesTrade)'] }
        },
        industrial: {
            priorityTip: 'B2B 거래 특성상 전략물자 여부, FTA 원산지 기준, 간접수출 시 구매확인서 발급과 선적전 금융·보증 설계가 중요합니다.',
            programs: [
                { name: 'KOTRA 글로벌 파트너링 (GP)', url: 'https://www.kotra.or.kr', ext: true, desc: '글로벌 제조 대기업 조달 수요 맞춤 1:1 수출상담 및 공급망 진입 지원' },
                { name: '전략물자관리시스템 (YesTrade)', url: 'https://www.yestrade.go.kr', ext: true, desc: '기계·소재·부품의 전략물자 해당 여부 사전 판정 및 수출통제 대응' },
                { name: 'KTNET uTradeHub', url: 'https://www.utradehub.or.kr', ext: true, desc: '간접수출 시 구매확인서·내국신용장 발급 및 간접수출실적증명 처리' },
                { name: 'Trade NAVI', url: 'https://www.tradenavi.or.kr/', ext: true, desc: '국가·품목별 관세율, FTA 원산지 결정기준 및 비관세장벽 통합 조회' }
            ],
            crossRule: { issues: ['fund', 'collect', 'factoring'], tip: '기계·장비 등 고액·장기 제작 건은 선적전 수출신용보증과 단계별 대금결제 조건을 함께 설계하세요.' }
        },
        service: {
            priorityTip: '무형 서비스는 일반 통관(수출신고필증)이 없으므로 용역 계약서와 외화입금증명 등 무체물 수출실적 인정 절차를 챙겨야 합니다.',
            programs: [
                { name: '콘텐츠수출플랫폼 (WelCon)', url: 'https://welcon.kocca.kr', ext: true, desc: '한국콘텐츠진흥원 운영, 캐릭터·SW·콘텐츠 등 무형 서비스 해외 진출 지원' },
                { name: 'KOTRA 서비스 거점 지원', url: 'https://www.kotra.or.kr', ext: true, desc: '콘텐츠·SW·프랜차이즈 등 서비스업 해외 거점 및 브랜드 마케팅 지원' },
                { name: '무역협회 TradePro', url: 'https://kita.net/tradePro/tradeProMain/tradeProMain.do', ext: true, desc: '용역 계약·세무·무체물 수출실적 인정 등 분야별 전문가 온라인 무료 상담' }
            ],
            crossRule: {
                issues: ['docs'],
                extraPrograms: [{ name: '계약서 작성기', url: 'contract-builder.html', ext: false, desc: '서비스·용역 거래 조건에 맞는 계약서 초안과 추천 조항을 만듭니다.' }],
                pinTop: ['계약서 작성기', '무역협회 TradePro']
            }
        },
        etc: {
            priorityTip: '품목의 정확한 HS코드 확정과 수출국 규제 여부를 먼저 확인한 뒤 맞춤 지원사업을 매칭하는 것이 안전합니다.',
            programs: [
                { name: '원스톱 수출·수주지원단', url: 'https://www.export119.go.kr', ext: true, desc: '통관·물류·금융·인증 등 범부처 수출 현장 애로사항 원스톱 접수 및 해결' },
                { name: '무역협회 TradePro', url: 'https://kita.net/tradePro/tradeProMain/tradeProMain.do', ext: true, desc: '관세·물류·계약·마케팅 등 무역 현장 전문가 온라인 무료 상담' },
                { name: 'Happy Oh 1:1 수출 컨설팅', url: 'index.html#contact', ext: false, desc: '품목·수출단계·자금 상황에 맞춘 1:1 무료 맞춤 설계 상담 신청' }
            ]
        }
    };

    window.EG_MAP = {
        version: MAP_VERSION,
        stages: STAGES,
        revenues: REVENUES,
        deals: DEALS,
        issues: ISSUES,
        issueOrder: ISSUE_ORDER,
        issueHelp: ISSUE_HELP,
        prefVals: PREF_VALS,
        questions: QUESTIONS,
        links: LINKS,
        programs: PROGRAMS,
        etcKeywords: ETC_KEYWORDS,
        q2ProcOpts: Q2_PROC_OPTS,
        q2EtcKeywords: Q2_ETC_KEYWORDS,
        extra: EXTRA,
        footLinks: FOOT_LINKS,
        aiPicks: AI_PICKS,
        roadmap: ROADMAP,
        stageMap: STAGE_MAP,
        formLinks: FORM_LINKS,
        dealFund: DEAL_FUND,
        itemGuides: ITEM_GUIDES,
        short: SHORT
    };
})();
