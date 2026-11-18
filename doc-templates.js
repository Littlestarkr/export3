/* 수출서류 초안 작성기(doc-builder.html)의 서류별 문구·항목 모음
   ─────────────────────────────────────────────
   · 문구를 고치려면 이 파일의 en(영문)·ko(국문)만 바꾸면 됩니다.
   · {buyer} 같은 중괄호는 입력값이 들어가는 자리입니다. 비어 있으면 PH의 [자리표시]가 대신 들어갑니다.
   · 모든 문구는 이 사이트에서 새로 쓴 예시입니다. 기관 서식 원문을 옮기지 않습니다.
   · 실제 회사명·은행·계좌 정보를 여기에 적지 마세요(자리표시만). */
(function () {
    'use strict';

    // 입력하지 않은 값 대신 들어가는 자리표시 [영문, 국문]
    var PH = {
        seller: ['[Seller name]', '[수출자 상호]'],
        sellerAddr: ['[Seller address]', '[수출자 주소]'],
        sellerCountry: ['[Seller country]', '[수출자 국가]'],
        sellerTel: ['[Tel.]', '[전화]'],
        sellerEmail: ['[E-mail]', '[이메일]'],
        sellerRep: ['[Name / Title]', '[성명·직위]'],
        buyer: ['[Buyer name]', '[바이어 상호]'],
        buyerAddr: ['[Buyer address]', '[바이어 주소]'],
        buyerCountry: ['[Buyer country]', '[바이어 국가]'],
        buyerRep: ['[Name / Title]', '[성명·직위]'],
        notify: ['Same as consignee', '수하인과 같음'],
        origin: ['[Country of origin]', '[원산지]'],
        place: ['[Named place]', '[지정 장소]'],
        pol: ['[Port/place of loading]', '[선적항·출발지]'],
        pod: ['[Port/place of destination]', '[도착항·목적지]'],
        shipDate: ['[Latest shipment date]', '[최종 선적일]'],
        shipDays: ['[ ]', '[ ]'],
        marks: ['[Shipping marks]', '[화인]'],
        offerNo: ['[Offer No.]', '[오퍼 번호]'],
        offerDate: ['[Date]', '[날짜]'],
        offerValid: ['[Validity date]', '[유효기간]'],
        piNo: ['[PI No.]', '[PI 번호]'],
        piDate: ['[Date]', '[날짜]'],
        piValid: ['[Validity date]', '[유효기간]'],
        poNo: ['[PO No.]', '[PO 번호]'],
        poDate: ['[Date]', '[날짜]'],
        ciNo: ['[Invoice No.]', '[송장번호]'],
        ciDate: ['[Date]', '[날짜]'],
        adviceDate: ['[Date]', '[날짜]'],
        vessel: ['[Vessel / Flight]', '[선박명·편명]'],
        voyage: ['[Voyage No.]', '[항차]'],
        blNo: ['[B/L No.]', '[B/L 번호]'],
        etd: ['[ETD / On-board date]', '[출항일·선적일]'],
        eta: ['[ETA]', '[도착 예정일]'],
        container: ['[Container No. / Seal No.]', '[컨테이너·봉인 번호]'],
        courier: ['[Courier & tracking No.]', '[특송사·운송장 번호]'],
        beneficiary: ['[Beneficiary name]', '[수취인]'],
        bank: ['[Bank name]', '[은행명]'],
        bankAddr: ['[Bank address]', '[은행 주소]'],
        swift: ['[SWIFT code]', '[SWIFT 코드]'],
        account: ['[Account number]', '[계좌번호]'],
        total: ['[Total amount]', '[총액]'],
        advAmt: ['[ ]', '[ ]'],
        balAmt: ['[ ]', '[ ]'],
        balDue: ['[Due date]', '[지급 기한]'],
        _: ['[ ]', '[ ]']
    };

    // 서류 이름·순서
    var DOCS = {
        offer: { n: 1, short: '오퍼시트', en: 'OFFER SHEET', ko: '오퍼시트(물품 매도 청약서)', file: 'offer-sheet' },
        pi: { n: 2, short: 'PI', en: 'PROFORMA INVOICE', ko: '견적송장(Proforma Invoice)', file: 'proforma-invoice' },
        po: { n: 4, short: 'PO', en: 'PURCHASE ORDER', ko: '구매주문서(Purchase Order)', file: 'purchase-order' },
        ci: { n: 5, short: 'CI', en: 'COMMERCIAL INVOICE', ko: '상업송장(Commercial Invoice)', file: 'commercial-invoice' },
        pl: { n: 6, short: 'P/L', en: 'PACKING LIST', ko: '포장명세서(Packing List)', file: 'packing-list' },
        advice: { n: 7, short: '선적통지', en: 'SHIPPING ADVICE', ko: '선적통지(Shipping Advice)', file: 'shipping-advice' }
    };

    // 결제조건 한 줄(서류용 요약)
    var PAY = {
        adv_copybl: {
            label: 'T/T 선금 + 잔금(선적서류 사본 받고 N일 안)',
            en: 'T/T {adv}% in advance within {advDays} days after order confirmation; balance {bal}% by T/T within {balDays} days after receipt of copies of the shipping documents.',
            ko: '주문 확정 후 {advDays}일 안에 T/T 선금 {adv}%, 잔금 {bal}%는 선적서류 사본을 받은 날부터 {balDays}일 안에 T/T 송금.',
            dueEn: 'within {balDays} days after receipt of copies of the shipping documents', dueKo: '선적서류 사본을 받은 날부터 {balDays}일 안'
        },
        adv_eta: {
            label: 'T/T 선금 + 잔금(도착 예정일 N일 전까지)',
            en: 'T/T {adv}% in advance within {advDays} days after order confirmation; balance {bal}% by T/T at least {etaDays} days before the estimated time of arrival (ETA).',
            ko: '주문 확정 후 {advDays}일 안에 T/T 선금 {adv}%, 잔금 {bal}%는 도착 예정일(ETA) {etaDays}일 전까지 T/T 송금.',
            dueEn: 'at least {etaDays} days before ETA', dueKo: '도착 예정일 {etaDays}일 전까지'
        },
        adv_ship: {
            label: 'T/T 선금 + 잔금(선적 전)',
            en: 'T/T {adv}% in advance within {advDays} days after order confirmation; balance {bal}% by T/T before shipment, within {balDays} days after the Seller\'s notice that the goods are ready.',
            ko: '주문 확정 후 {advDays}일 안에 T/T 선금 {adv}%, 잔금 {bal}%는 선적 전, 수출자가 물품 준비 완료를 알린 날부터 {balDays}일 안에 T/T 송금.',
            dueEn: 'before shipment', dueKo: '선적 전'
        },
        full_adv: {
            label: 'T/T 전액 선금',
            en: '100% T/T in advance within {advDays} days after order confirmation.',
            ko: '주문 확정 후 {advDays}일 안에 100% T/T 선금.',
            dueEn: '', dueKo: ''
        },
        adv_oa: {
            label: 'T/T 선금 + 잔금 외상(B/L 일자부터 N일)',
            en: 'T/T {adv}% in advance within {advDays} days after order confirmation; balance {bal}% by T/T within {oaDays} days after the B/L (transport document) date.',
            ko: '주문 확정 후 {advDays}일 안에 T/T 선금 {adv}%, 잔금 {bal}%는 B/L(운송서류) 일자부터 {oaDays}일 안에 T/T 송금.',
            dueEn: 'within {oaDays} days after the B/L (transport document) date', dueKo: 'B/L(운송서류) 일자부터 {oaDays}일 안'
        },
        oa: {
            label: 'T/T 선적 후 외상(B/L 일자부터 N일)',
            en: '100% T/T within {oaDays} days after the B/L (transport document) date.',
            ko: 'B/L(운송서류) 일자부터 {oaDays}일 안에 100% T/T 송금.',
            dueEn: 'within {oaDays} days after the B/L (transport document) date', dueKo: 'B/L(운송서류) 일자부터 {oaDays}일 안'
        },
        dp: {
            label: '추심 D/P',
            en: 'D/P at sight (documents against payment), through the banks.',
            ko: '일람출급 D/P(지급인도 조건 추심), 은행을 통해 처리.',
            dueEn: 'at sight, against the shipping documents', dueKo: '서류 제시 때(일람출급)'
        },
        da: {
            label: '추심 D/A',
            en: 'D/A at {daDays} days after sight (documents against acceptance), through the banks.',
            ko: '일람 후 {daDays}일 D/A(인수인도 조건 추심), 은행을 통해 처리.',
            dueEn: '{daDays} days after sight', dueKo: '일람 후 {daDays}일'
        },
        lc: {
            label: '신용장(L/C, 일람출급)',
            en: 'By irrevocable documentary credit (L/C) at sight, to reach the Seller at least {lcDays} days before the latest shipment date.',
            ko: '취소불능 일람출급 신용장(L/C). 최종 선적일 {lcDays}일 전까지 수출자에게 도착해야 함.',
            dueEn: 'under the L/C', dueKo: '신용장 조건에 따라'
        }
    };

    var CHARGES = {
        buyer: { en: 'All bank charges, including intermediary bank charges, are for the Buyer\'s account.', ko: '중계은행 수수료를 포함한 모든 은행 수수료는 바이어 부담.' },
        sha: { en: 'Bank charges in the Buyer\'s country are for the Buyer\'s account; those in the Seller\'s country are for the Seller\'s account.', ko: '각자 나라의 은행 수수료는 각자 부담.' }
    };

    var MODE = {
        sea: { en: 'By sea', ko: '해상', tdoc: 'Bill of Lading (B/L)', tdocKo: '선하증권(B/L)', no: 'B/L No.', noKo: 'B/L 번호', vessel: 'Vessel / Voyage', vesselKo: '선박명·항차' },
        air: { en: 'By air', ko: '항공', tdoc: 'Air Waybill (AWB)', tdocKo: '항공화물운송장(AWB)', no: 'AWB No.', noKo: 'AWB 번호', vessel: 'Flight No.', vesselKo: '항공편' },
        road: { en: 'By road / multimodal', ko: '육상·복합', tdoc: 'Transport document (CMR, multimodal B/L, etc.)', tdocKo: '운송서류(CMR, 복합운송증권 등)', no: 'Transport doc. No.', noKo: '운송서류 번호', vessel: 'Carrier / Vehicle', vesselKo: '운송인·차량' }
    };

    // 서류마다 들어가는 문장
    var S = {
        offerIntro: {
            en: 'We are pleased to offer you the following goods on the terms and conditions below.',
            ko: '아래 조건으로 다음 물품을 매도할 것을 청약합니다.'
        },
        offerFirm: {
            en: 'This is a firm offer, valid until {offerValid}. A contract is formed only when your acceptance of all terms reaches us within this period.',
            ko: '이 오퍼는 확정 오퍼로 {offerValid}까지 유효합니다. 이 기간 안에 모든 조건에 대한 승낙이 저희에게 도착해야 계약이 성립합니다.'
        },
        offerSubject: {
            en: 'This offer is subject to our final confirmation and is valid until {offerValid}. Prices and availability may change before our confirmation.',
            ko: '이 오퍼는 저희의 최종 확인을 조건으로 하며 {offerValid}까지 유효합니다. 확인 전에는 가격·재고가 바뀔 수 있습니다.'
        },
        piIntro: {
            en: 'We confirm our quotation for the following goods. Please sign and return a copy of this Proforma Invoice as your order confirmation.',
            ko: '아래 물품의 견적을 확인합니다. 주문을 확정하시려면 이 견적송장에 서명해 사본을 보내 주십시오.'
        },
        piValid: {
            en: 'This Proforma Invoice is valid until {piValid}.',
            ko: '이 견적송장은 {piValid}까지 유효합니다.'
        },
        piNote: {
            en: 'This Proforma Invoice is not a demand for payment of the balance. The balance is payable on the terms stated above.',
            ko: '이 견적송장은 잔금 청구서가 아닙니다. 잔금은 위 결제조건에 따라 지급합니다.'
        },
        poIntro: {
            en: 'Please supply the following goods on the terms and conditions below.',
            ko: '아래 조건으로 다음 물품을 공급해 주십시오.'
        },
        poAck: {
            en: 'Please confirm acceptance of this order by signing and returning a copy, or by issuing your Proforma Invoice with the same terms.',
            ko: '이 주문을 받아들이시면 서명한 사본을 보내 주시거나, 같은 조건으로 견적송장(PI)을 발행해 주십시오.'
        },
        ciDecl: {
            en: 'We certify that this invoice is true and correct, and that the goods described above are of {origin} origin.',
            ko: '이 송장의 내용이 사실과 같고, 위 물품의 원산지가 {origin}임을 확인합니다.'
        },
        plNote: {
            en: 'Weights and measurements are as packed by the Seller.',
            ko: '중량·용적은 수출자가 포장한 상태 기준입니다.'
        },
        adviceIntro: {
            en: 'We are pleased to inform you that the goods under the above order have been shipped as follows.',
            ko: '위 주문 물품을 아래와 같이 선적했음을 알려 드립니다.'
        },
        adviceDocs: {
            en: 'Copies of the shipping documents are attached.',
            ko: '선적서류 사본을 첨부합니다.'
        },
        blOriginal: {
            en: 'The full set of original B/L will be sent to you by courier after receipt of the balance payment.',
            ko: 'B/L 원본 전통은 잔금을 받은 뒤 특송으로 보내 드립니다.'
        },
        blOriginalNoBal: {
            en: 'The full set of original B/L will be sent to you by courier.',
            ko: 'B/L 원본 전통은 특송으로 보내 드립니다.'
        },
        blSurrender: {
            en: 'The B/L will be surrendered (telex release) after receipt of the balance payment.',
            ko: 'B/L은 잔금을 받은 뒤 서렌더(전신 인도) 처리합니다.'
        },
        blSurrenderNoBal: {
            en: 'The B/L will be surrendered (telex release).',
            ko: 'B/L은 서렌더(전신 인도) 처리합니다.'
        },
        blWaybill: {
            en: 'The goods are shipped under a sea waybill, and the consignee may take delivery without presenting an original.',
            ko: '해상화물운송장(Sea Waybill)으로 선적했으며, 수하인은 원본 없이 물품을 찾을 수 있습니다.'
        },
        courierLine: {
            en: 'Original documents: sent by {courier}.',
            ko: '원본 서류: {courier}(으)로 발송.'
        },
        balanceLine: {
            en: 'Balance payable: {cur} {balAmt}, {balDueText}.',
            ko: '지급할 잔금: {cur} {balAmt}, {balDueText}.'
        },
        adviceClose: {
            en: 'Please check the documents and let us know if anything needs correction.',
            ko: '서류를 확인하시고 고칠 부분이 있으면 알려 주십시오.'
        },
        bankLead: {
            en: 'Payment shall be made only to the following account:',
            ko: '대금은 아래 계좌로만 지급해 주십시오.'
        },
        fraud: {
            en: 'BANK ACCOUNT & FRAUD WARNING: We will NEVER change our bank account details by e-mail. If you receive any message asking you to pay to a different account, do not pay; call us first at a telephone number you already know. Payment made to any other account will not be treated as payment to us.',
            ko: '계좌·사기 경고: 저희는 이메일로 계좌 정보를 절대 바꾸지 않습니다. 다른 계좌로 송금해 달라는 연락을 받으면 송금하지 마시고, 이미 알고 있는 전화번호로 먼저 저희에게 확인해 주십시오. 다른 계좌로 보낸 돈은 저희에게 지급한 것으로 보지 않습니다.'
        },
        fraudAdvice: {
            en: 'IMPORTANT: Our bank account is the same as stated in our Proforma Invoice. We never change it by e-mail. Before paying, please confirm by telephone at a number you already know.',
            ko: '중요: 저희 계좌는 견적송장(PI)에 적힌 계좌와 같습니다. 이메일로 계좌를 바꾸는 일은 없습니다. 송금 전에 이미 알고 있는 전화번호로 확인해 주십시오.'
        },
        packing: {
            en: 'Export standard packing, suitable for the mode of transport.',
            ko: '운송 방식에 맞는 수출 표준 포장.'
        },
        insurance: {
            en: 'Cargo insurance to be arranged by the Seller for 110% of the invoice value, covering Institute Cargo Clauses ({cover}).',
            ko: '적하보험은 수출자가 송장 금액의 110%로 부보, 협회적하약관 ICC({cover}) 조건.'
        },
        insuranceBuyer: {
            en: 'Cargo insurance to be arranged by the Buyer.',
            ko: '적하보험은 바이어가 부보.'
        },
        shipByDate: { en: 'Not later than {shipDate}', ko: '{shipDate}까지' },
        shipAfterAdv: { en: 'Within {shipDays} days after receipt of the advance payment', ko: '선금을 받은 날부터 {shipDays}일 안' },
        shipAfterOrder: { en: 'Within {shipDays} days after order confirmation', ko: '주문 확정일부터 {shipDays}일 안' },
        shipAfterLc: { en: 'Within {shipDays} days after receipt of the L/C', ko: '신용장을 받은 날부터 {shipDays}일 안' }
    };

    // 서류마다 꼭 들어갈 항목(화면 '항목 점검'용). k: 값 이름(비었는지 확인), why: 이유
    var NEED = {
        offer: [
            { k: 'seller', t: '수출자 상호·주소', why: '누가 청약하는지 분명해야 합니다.' },
            { k: 'buyer', t: '바이어(수신인)', why: '청약 상대방을 특정합니다.' },
            { k: 'offerNo', t: '오퍼 번호·날짜', why: '뒤 서류(PI·PO)에서 이 오퍼를 가리킬 때 씁니다.' },
            { k: 'items', t: '품명·수량·단가', why: '청약의 핵심 조건입니다.' },
            { k: 'place', t: '인코텀즈·지정 장소', why: '단가에 무엇이 포함됐는지(운임·보험)를 정합니다.' },
            { k: 'pay', t: '결제조건', why: '선금 비율과 잔금 시점을 처음부터 적어 둡니다.' },
            { k: 'ship', t: '선적 시기', why: '납기 분쟁을 줄입니다.' },
            { k: 'offerValid', t: '유효기간', why: '언제까지 이 가격·조건을 지킬지 정합니다. 확정 오퍼는 꼭 필요합니다.' }
        ],
        pi: [
            { k: 'piNo', t: 'PI 번호·날짜', why: '송금 메모·CI에서 이 PI를 가리킵니다.' },
            { k: 'buyer', t: '바이어 상호·주소', why: '송금인·수하인 확인에 씁니다.' },
            { k: 'items', t: '품명·수량·단가·합계', why: '선금 금액 계산의 기준입니다.' },
            { k: 'place', t: '인코텀즈·지정 장소', why: '오퍼와 같아야 합니다.' },
            { k: 'pay', t: '결제조건·선금 금액', why: '선금 금액을 숫자로 적어 두면 송금 오류가 줄어듭니다.' },
            { k: 'bank', t: '은행 계좌·사기 경고', why: '바이어가 송금할 때 보는 서류라 계좌변경 사기 경고를 함께 둡니다.' },
            { k: 'ship', t: '선적 시기', why: '선금 입금일과 연결해 적으면 분명합니다.' },
            { k: 'piValid', t: '유효기간', why: '오래된 PI로 주문하는 일을 막습니다.' }
        ],
        po: [
            { k: 'poNo', t: 'PO 번호·날짜', why: 'CI·선적통지에서 이 주문을 가리킵니다.' },
            { k: 'piNo', t: '참조 PI 번호', why: 'PO와 PI 조건이 같은지 대조할 기준입니다.' },
            { k: 'items', t: '품명·수량·단가·합계', why: 'PI와 한 글자라도 다르면 바로 바로잡습니다.' },
            { k: 'place', t: '인코텀즈·지정 장소', why: 'PI와 같아야 합니다.' },
            { k: 'pay', t: '결제조건', why: 'PI와 같아야 합니다.' },
            { k: 'docs', t: '요구 서류', why: '바이어가 통관에 필요한 서류(원산지증명서 등)를 미리 확인합니다.' }
        ],
        ci: [
            { k: 'ciNo', t: '송장번호·날짜', why: '통관·송금에서 기준이 되는 번호입니다.' },
            { k: 'piNo', t: 'PI·PO 참조 번호', why: '어느 주문의 선적인지 연결합니다.' },
            { k: 'items', t: '실제 선적 수량·금액', why: '분할선적이면 PI와 금액이 달라집니다.' },
            { k: 'hs', t: 'HS코드', why: '수입 통관·원산지 확인에 씁니다.' },
            { k: 'origin', t: '원산지', why: '수입국 관세 판단에 씁니다.' },
            { k: 'vessel', t: '선박·편명, 선적일', why: 'B/L·AWB와 같아야 합니다.' },
            { k: 'marks', t: '화인', why: 'P/L·박스 표기와 같아야 합니다.' },
            { k: 'bank', t: '잔금·계좌·사기 경고', why: '잔금을 받을 서류라 계좌와 경고 문구를 함께 둡니다.' }
        ],
        pl: [
            { k: 'ciNo', t: '송장번호(CI와 같게)', why: 'CI와 짝을 맞춥니다.' },
            { k: 'items', t: '품목별 수량', why: 'CI 수량과 같아야 합니다.' },
            { k: 'pack', t: '박스 수·순중량·총중량·용적', why: '운송·통관에서 실제 화물과 대조합니다.' },
            { k: 'marks', t: '화인·박스 번호', why: '박스 겉면 표기와 같아야 합니다.' }
        ],
        advice: [
            { k: 'vessel', t: '선박·편명, 항차', why: '바이어가 화물을 추적합니다.' },
            { k: 'blNo', t: 'B/L·AWB 번호', why: '도착지에서 화물을 찾을 때 씁니다.' },
            { k: 'etd', t: '출항일(ETD)·도착 예정일(ETA)', why: '잔금 기한·통관 준비의 기준입니다.' },
            { k: 'ciNo', t: '송장번호·금액', why: '어느 송장의 선적인지 연결합니다.' },
            { k: 'pack', t: '박스 수·중량', why: 'P/L과 같아야 합니다.' },
            { k: 'bank', t: '잔금 안내·사기 경고', why: '계좌변경 사기 메일이 가장 많이 오는 때입니다.' }
        ]
    };

    window.DB_LIB = { PH: PH, DOCS: DOCS, PAY: PAY, CHARGES: CHARGES, MODE: MODE, S: S, NEED: NEED };
})();
