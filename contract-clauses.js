/* 계약서 초안 작성기(contract-builder.html)의 조항 문구 모음
   ─────────────────────────────────────────────
   · 문구를 고치려면 이 파일의 en(영문)·ko(국문)만 바꾸면 됩니다.
   · {seller} 같은 중괄호는 입력값이 들어가는 자리입니다. 비어 있으면 PH의 [자리표시]가 대신 들어갑니다.
   · check: true 인 조항은 화면에 '확인 필요' 표시가 붙습니다(법적 효력이 나라·사안마다 다를 수 있는 조항).
   · why: 이 조항을 추천하는 이유(화면 설명용), note: 쓸 때 주의할 점.
   · 모든 문구는 이 사이트에서 새로 쓴 예시입니다. 기관 서식 원문을 옮기지 않습니다.
   · 실제 회사명·은행·계좌 정보를 여기에 적지 마세요(자리표시만). */
(function () {
    'use strict';

    // 입력하지 않은 값 대신 들어가는 자리표시 [영문, 국문]
    var PH = {
        no: ['[Contract No.]', '[계약번호]'],
        date: ['[Date]', '[계약일]'],
        seller: ['[Seller name]', '[매도인 상호]'],
        sellerAddr: ['[Seller address]', '[매도인 주소]'],
        sellerCountry: ['[Seller country]', '[매도인 국가]'],
        sellerRep: ['[Name / Title]', '[대표자 성명·직위]'],
        buyer: ['[Buyer name]', '[매수인 상호]'],
        buyerAddr: ['[Buyer address]', '[매수인 주소]'],
        buyerCountry: ['[Buyer country]', '[매수인 국가]'],
        buyerRep: ['[Name / Title]', '[대표자 성명·직위]'],
        cur: ['[Currency]', '[통화]'],
        total: ['[Total amount]', '[계약 총액]'],
        place: ['[Named place]', '[지정 장소]'],
        pol: ['[Port/place of loading]', '[선적항·출발지]'],
        pod: ['[Port/place of destination]', '[도착항·목적지]'],
        shipDate: ['[Latest shipment date]', '[최종 선적일]'],
        shipDays: ['[ ]', '[ ]'],
        marks: ['as agreed by the parties in writing', '양 당사자가 서면으로 합의한 대로'],
        tol: ['[ ]', '[ ]'],
        adv: ['[ ]', '[ ]'],
        advAmt: ['[ ]', '[ ]'],
        bal: ['[ ]', '[ ]'],
        balAmt: ['[ ]', '[ ]'],
        advDays: ['[ ]', '[ ]'],
        balDays: ['[ ]', '[ ]'],
        etaDays: ['[ ]', '[ ]'],
        oaDays: ['[ ]', '[ ]'],
        daDays: ['[ ]', '[ ]'],
        lcDays: ['[ ]', '[ ]'],
        interest: ['[ ]', '[ ]'],
        defaultDays: ['[ ]', '[ ]'],
        claimDays: ['[ ]', '[ ]'],
        warrMonths: ['[ ]', '[ ]'],
        ldRate: ['[ ]', '[ ]'],
        ldCap: ['[ ]', '[ ]'],
        fmDays: ['[ ]', '[ ]'],
        fmTerm: ['[ ]', '[ ]'],
        confYears: ['[ ]', '[ ]'],
        inspNotice: ['[ ]', '[ ]'],
        inspector: ['[inspection company]', '[검사기관]'],
        beneficiary: ['[Company name]', '[수취인(회사명)]'],
        bank: ['[Bank name]', '[은행명]'],
        bankAddr: ['[Bank address]', '[은행 주소]'],
        swift: ['[SWIFT code]', '[SWIFT 코드]'],
        account: ['[Account number]', '[계좌번호]'],
        law: ['[Country]', '[국가]'],
        seat: ['[City]', '[도시]'],
        arbLang: ['English', '영어']
    };

    // 운송 방식
    var MODE = {
        sea: { en: 'sea', ko: '해상', doc: 'bill of lading', docKo: '선하증권(B/L)' },
        air: { en: 'air', ko: '항공', doc: 'air waybill', docKo: '항공화물운송장(AWB)' },
        road: { en: 'road or multimodal transport', ko: '육상·복합', doc: 'transport document', docKo: '운송서류' }
    };

    var C = {};

    /* ── 머리말(당사자) ── */
    C.preamble = {
        titleEn: 'Parties', titleKo: '당사자',
        why: '누가 누구에게 파는지 정확히 적어야 대금 청구·분쟁 때 상대를 특정할 수 있습니다.',
        en: 'This Sales Contract (the "Contract") is made on {date} between {seller}, having its principal office at {sellerAddr}, {sellerCountry} (the "Seller"), and {buyer}, having its principal office at {buyerAddr}, {buyerCountry} (the "Buyer").',
        ko: '이 물품매매계약(이하 "계약")은 {date}에 {sellerAddr}({sellerCountry})에 주된 사무소를 둔 {seller}(이하 "매도인")와 {buyerAddr}({buyerCountry})에 주된 사무소를 둔 {buyer}(이하 "매수인") 사이에 체결한다.'
    };

    /* ── 1. 물품·수량·가격 ── */
    C.goods = {
        titleEn: 'Goods, Quantity and Price', titleKo: '물품·수량·가격',
        why: '품명·규격·수량·단가·통화·총액과 가격조건을 한곳에 묶어 PI·상업송장과 숫자가 어긋나지 않게 합니다.',
        en: 'The Seller agrees to sell and the Buyer agrees to buy the following goods. All prices are {incoterm} {place} (Incoterms® 2020) in {cur}.',
        ko: '매도인은 아래 물품을 팔고 매수인은 이를 산다. 모든 가격은 {incoterm} {place}(Incoterms® 2020) 기준이며 통화는 {cur}이다.',
        totalEn: 'Total contract amount: {cur} {total}',
        totalKo: '계약 총액: {cur} {total}',
        tolEn: 'The Seller may deliver up to {tol}% more or less than the contracted quantity. The price shall be adjusted pro rata to the quantity actually shipped.',
        tolKo: '매도인은 계약 수량의 {tol}% 범위에서 더 많거나 적게 인도할 수 있으며, 대금은 실제 선적 수량에 비례해 조정한다.'
    };

    /* ── 2. 인도조건(인코텀즈) ── */
    C.delivery = {
        titleEn: 'Delivery Term', titleKo: '인도조건',
        why: '인코텀즈 규칙과 지정 장소를 함께 적어야 비용·위험이 어디서 넘어가는지가 정해집니다(장소 없는 “FOB”는 흔한 실수).',
        en: 'The goods shall be delivered {incoterm} {place} (Incoterms® 2020). Except as otherwise provided in this Contract, the obligations of the parties as to delivery, risk, costs and customs clearance shall be governed by Incoterms® 2020.',
        ko: '물품은 {incoterm} {place}(Incoterms® 2020) 조건으로 인도한다. 이 계약에서 달리 정하지 않은 인도·위험·비용·통관에 관한 당사자의 의무는 Incoterms® 2020에 따른다.',
        exwEn: 'Notwithstanding EXW, the Seller shall, at the Buyer\'s request, risk and expense, assist the Buyer in completing export customs formalities in Korea.',
        exwKo: 'EXW 조건이지만, 매도인은 매수인의 요청에 따라 매수인의 위험과 비용으로 한국 수출통관 절차를 돕는다.',
        ddpEn: 'Under DDP, all import duties, taxes and customs formalities in the country of destination are for the Seller\'s account. The parties shall confirm the applicable amounts before shipment.',
        ddpKo: 'DDP 조건에 따라 목적지 국가의 수입 관세·세금과 통관 절차는 매도인이 부담한다. 양 당사자는 선적 전에 해당 금액을 확인한다.'
    };

    /* ── 3. 선적 ── */
    C.shipment = {
        titleEn: 'Shipment', titleKo: '선적',
        why: '선적 기한·분할선적·환적 허용 여부와 선적통지 의무를 정해 납기 분쟁을 줄입니다.',
        byDateEn: 'The goods shall be shipped by {mode} from {pol} to {pod} on or before {shipDate}.',
        byDateKo: '물품은 {shipDate}까지 {pol}에서 {pod}까지 {modeKo} 운송으로 선적한다.',
        afterAdvEn: 'The goods shall be shipped by {mode} from {pol} to {pod} within {shipDays} days after the Seller receives the advance payment.',
        afterAdvKo: '물품은 매도인이 선금을 받은 날부터 {shipDays}일 안에 {pol}에서 {pod}까지 {modeKo} 운송으로 선적한다.',
        afterSignEn: 'The goods shall be shipped by {mode} from {pol} to {pod} within {shipDays} days after the date of this Contract.',
        afterSignKo: '물품은 계약일부터 {shipDays}일 안에 {pol}에서 {pod}까지 {modeKo} 운송으로 선적한다.',
        afterLcEn: 'The goods shall be shipped by {mode} from {pol} to {pod} within {shipDays} days after the Seller receives the documentary credit.',
        afterLcKo: '물품은 매도인이 신용장을 받은 날부터 {shipDays}일 안에 {pol}에서 {pod}까지 {modeKo} 운송으로 선적한다.',
        restEn: 'Partial shipments are {partialEn}. Transshipment is {transEn}. The date of the {docEn} shall be evidence of the date of shipment. The Seller shall notify the Buyer by email of the shipment details (vessel or flight, {docEn} number, quantity, invoice value and estimated time of arrival) within 3 business days after shipment.',
        restKo: '분할선적은 {partialKo}, 환적은 {transKo}. {docKo}의 발행일을 선적일의 증거로 본다. 매도인은 선적 후 3영업일 안에 선적 내용(선박·항공편, {docKo} 번호, 수량, 송장 금액, 도착 예정일)을 매수인에게 이메일로 알린다.'
    };

    /* ── 4. 포장·화인 ── */
    C.packing = {
        titleEn: 'Packing and Marking', titleKo: '포장·화인',
        why: '수출 포장 기준과 화인을 정해 두면 파손 클레임과 통관 지연을 줄일 수 있습니다.',
        en: 'The goods shall be packed in the Seller\'s standard export packing suitable for {mode} transport. Shipping marks: {marks}.',
        ko: '물품은 {modeKo} 운송에 알맞은 매도인의 표준 수출 포장으로 포장한다. 화인: {marks}.'
    };

    /* ── 5. 보험 ── */
    C.insurance = {
        titleEn: 'Insurance', titleKo: '적하보험',
        why: '인코텀즈에 따라 누가 적하보험을 드는지가 달라집니다. 조건과 맞게 자동으로 바뀝니다.',
        sellerEn: 'The Seller shall insure the goods for 110% of the invoice value, in the currency of this Contract, under Institute Cargo Clauses ({cover}) or equivalent, covering the transit from the point of delivery to {place}.',
        sellerKo: '매도인은 송장 금액의 110%를 계약 통화로, 협회적하약관 ({cover}) 또는 이와 같은 수준의 조건으로 인도 지점부터 {place}까지의 운송 구간에 대해 부보한다.',
        buyerEn: 'Cargo insurance after delivery shall be arranged and paid for by the Buyer at its own discretion.',
        buyerKo: '인도 이후의 적하보험은 매수인이 스스로 판단해 들고 비용을 부담한다.',
        dEn: 'The Seller bears the risk of loss of or damage to the goods until they are delivered at {place}. Any cargo insurance for that period is at the Seller\'s discretion and expense.',
        dKo: '매도인은 물품이 {place}에서 인도될 때까지 멸실·손상 위험을 부담한다. 그 구간의 적하보험은 매도인이 판단해 들고 비용을 부담한다.'
    };

    /* ── 6. 결제 ── 결제 방식별 본문(main) + 공통 문장 */
    C.payment = {
        titleEn: 'Payment', titleKo: '결제',
        why: '결제 방식·금액·기한을 날짜로 셀 수 있게 적어야 미수금 관리와 독촉이 가능합니다.',
        methods: {
            adv_copybl: {
                label: 'T/T 선금 + 잔금(선적서류 사본 받고 N일 안)',
                en: '{adv}% of the contract amount ({cur} {advAmt}) shall be paid by T/T in advance within {advDays} days after the date of this Contract. The balance of {bal}% ({cur} {balAmt}) shall be paid by T/T within {balDays} days after the Seller sends a copy of the {docEn} to the Buyer by email.',
                ko: '계약 금액의 {adv}%({cur} {advAmt})는 계약일부터 {advDays}일 안에 전신송금(T/T) 선금으로 지급한다. 잔금 {bal}%({cur} {balAmt})는 매도인이 {docKo} 사본을 이메일로 보낸 날부터 {balDays}일 안에 T/T로 지급한다.'
            },
            adv_ship: {
                label: 'T/T 선금 + 잔금(선적 전)',
                en: '{adv}% of the contract amount ({cur} {advAmt}) shall be paid by T/T in advance within {advDays} days after the date of this Contract. The balance of {bal}% ({cur} {balAmt}) shall be paid by T/T within {balDays} days after the Seller notifies the Buyer that the goods are ready for shipment, and the Seller shall ship the goods after receipt of the balance.',
                ko: '계약 금액의 {adv}%({cur} {advAmt})는 계약일부터 {advDays}일 안에 T/T 선금으로 지급한다. 잔금 {bal}%({cur} {balAmt})는 매도인이 선적 준비 완료를 알린 날부터 {balDays}일 안에 T/T로 지급하며, 매도인은 잔금을 받은 뒤 선적한다.'
            },
            adv_eta: {
                label: 'T/T 선금 + 잔금(도착 예정일 N일 전까지)',
                en: '{adv}% of the contract amount ({cur} {advAmt}) shall be paid by T/T in advance within {advDays} days after the date of this Contract. The balance of {bal}% ({cur} {balAmt}) shall reach the Seller\'s account at least {etaDays} days before the estimated time of arrival (ETA) of the goods at {pod}.',
                ko: '계약 금액의 {adv}%({cur} {advAmt})는 계약일부터 {advDays}일 안에 T/T 선금으로 지급한다. 잔금 {bal}%({cur} {balAmt})는 물품의 {pod} 도착 예정일(ETA)보다 최소 {etaDays}일 전까지 매도인 계좌에 입금되어야 한다.'
            },
            full_adv: {
                label: 'T/T 전액 선금',
                en: 'The full contract amount ({cur} {total}) shall be paid by T/T in advance within {advDays} days after the date of this Contract. The Seller shall ship the goods after receipt of the full payment.',
                ko: '계약 금액 전액({cur} {total})은 계약일부터 {advDays}일 안에 T/T 선금으로 지급하며, 매도인은 대금을 모두 받은 뒤 선적한다.'
            },
            oa: {
                label: '선적 후 T/T 외상(B/L 일자부터 N일)',
                en: 'The full contract amount ({cur} {total}) shall be paid by T/T within {oaDays} days after the date of the {docEn} (open account).',
                ko: '계약 금액 전액({cur} {total})은 {docKo} 발행일부터 {oaDays}일 안에 T/T로 지급한다(외상 거래).'
            },
            adv_oa: {
                label: 'T/T 선금 + 잔금 외상(B/L 일자부터 N일)',
                en: '{adv}% of the contract amount ({cur} {advAmt}) shall be paid by T/T in advance within {advDays} days after the date of this Contract. The balance of {bal}% ({cur} {balAmt}) shall be paid by T/T within {oaDays} days after the date of the {docEn}.',
                ko: '계약 금액의 {adv}%({cur} {advAmt})는 계약일부터 {advDays}일 안에 T/T 선금으로 지급한다. 잔금 {bal}%({cur} {balAmt})는 {docKo} 발행일부터 {oaDays}일 안에 T/T로 지급한다.'
            },
            dp: {
                label: '추심 D/P(지급인도)',
                en: 'Payment shall be made by documents against payment (D/P) at sight. The Seller shall present the shipping documents through its bank, and the documents shall be released to the Buyer only against payment of the full invoice amount. The collection shall be subject to URC 522.',
                ko: '대금은 지급인도(D/P, 일람출급) 방식으로 지급한다. 매도인은 거래 은행을 통해 선적서류를 제시하며, 서류는 매수인이 송장 금액 전액을 지급해야만 인도된다. 추심에는 URC 522를 적용한다.'
            },
            da: {
                label: '추심 D/A(인수인도, N일)',
                en: 'Payment shall be made by documents against acceptance (D/A) at {daDays} days after sight. The Seller shall present the shipping documents and a draft through its bank, and the documents shall be released to the Buyer against acceptance of the draft. The collection shall be subject to URC 522.',
                ko: '대금은 인수인도(D/A) 방식으로 일람 후 {daDays}일에 지급한다. 매도인은 거래 은행을 통해 선적서류와 환어음을 제시하며, 서류는 매수인이 환어음을 인수하면 인도된다. 추심에는 URC 522를 적용한다.'
            },
            lc: {
                label: '신용장(L/C, 일람출급)',
                en: 'Payment shall be made by an irrevocable documentary credit payable at sight, issued in favour of the Seller for the full contract amount and received by the Seller at least {lcDays} days before the latest shipment date. The credit shall be subject to UCP 600, and its terms shall be consistent with this Contract.',
                ko: '대금은 매도인을 수익자로 하여 계약 금액 전액에 대해 개설된 취소불능 일람출급 화환신용장으로 지급하며, 매도인은 최종 선적일보다 최소 {lcDays}일 전에 신용장을 받아야 한다. 신용장은 UCP 600을 따르고, 그 조건은 이 계약과 일치해야 한다.'
            }
        },
        chargesBuyerEn: 'All bank charges, including those of intermediary banks, are for the Buyer\'s account, so that the Seller receives the full invoice amount.',
        chargesBuyerKo: '중계은행 수수료를 포함한 모든 은행 수수료는 매수인이 부담하여, 매도인이 송장 금액 전액을 받도록 한다.',
        chargesShaEn: 'Bank charges in the Buyer\'s country are for the Buyer\'s account, and bank charges in the Seller\'s country are for the Seller\'s account.',
        chargesShaKo: '매수인 국가의 은행 수수료는 매수인이, 매도인 국가의 은행 수수료는 매도인이 부담한다.',
        releaseEn: 'The original {docEn} and other shipping documents will be released to the Buyer only after the Seller has received full payment.',
        releaseKo: '{docKo} 원본과 그 밖의 선적서류는 매도인이 대금 전액을 받은 뒤에만 매수인에게 인도한다.',
        interestEn: 'Any amount not paid when due shall bear interest at {interest}% per month from the due date until the date of actual payment.',
        interestKo: '기한 안에 지급하지 않은 금액에는 지급기일 다음 날부터 실제 지급일까지 월 {interest}%의 지연이자를 붙인다.',
        defaultEn: 'If the Buyer fails to pay any amount within {defaultDays} days after its due date, the Seller may, by written notice, suspend further performance, terminate this Contract in whole or in part, and resell any goods not yet released to the Buyer, without prejudice to its other rights and remedies.',
        defaultKo: '매수인이 지급기일부터 {defaultDays}일 안에 대금을 지급하지 않으면, 매도인은 서면 통지로 이후 이행을 중지하거나 계약의 전부 또는 일부를 해제하고, 아직 매수인에게 넘기지 않은 물품을 다시 팔 수 있다. 이는 매도인의 다른 권리와 구제수단에 영향을 주지 않는다.',
        defaultNote: '지연이자율 상한과 해제·재판매 요건은 준거법과 바이어 나라 법에 따라 다를 수 있습니다.'
    };

    /* ── 7. 소유권 ── */
    C.title = {
        titleEn: 'Retention of Title', titleKo: '소유권 유보',
        why: '대금을 다 받을 때까지 소유권을 매도인에게 남겨 미수 때 대응 근거를 만듭니다.',
        check: true,
        note: '소유권 유보가 실제로 인정되는 범위는 물품이 있는 나라의 법에 따라 다르므로 확실하지 않습니다.',
        en: 'Title to the goods shall remain with the Seller until the Seller has received full payment of the contract price. Risk passes to the Buyer in accordance with the agreed Incoterms® rule, regardless of the passing of title.',
        ko: '물품의 소유권은 매도인이 계약 대금 전액을 받을 때까지 매도인에게 남는다. 위험은 소유권 이전과 관계없이 합의한 인코텀즈 규칙에 따라 매수인에게 넘어간다.'
    };

    /* ── 8. 검사 ── */
    C.inspection = {
        titleEn: 'Inspection', titleKo: '검사',
        why: '선적 전 품질 확인을 누가, 어떻게 하는지 정해 도착 후 품질 다툼을 줄입니다.',
        variants: {
            seller: {
                label: '매도인 출고 검사를 최종으로',
                en: 'The Seller shall inspect the goods before shipment in accordance with its standard quality procedures. The Seller\'s inspection shall be final as to the quality and quantity of the goods at the time of shipment, except for latent defects that could not be discovered by a reasonable inspection.',
                ko: '매도인은 선적 전에 자사 표준 품질 절차에 따라 물품을 검사한다. 선적 시점의 품질·수량에 대해서는 매도인의 검사를 최종으로 보되, 합리적인 검사로 발견할 수 없었던 숨은 하자는 예외로 한다.'
            },
            buyer: {
                label: '바이어가 선적 전 공장 검사(바이어 비용)',
                en: 'The Buyer may inspect the goods at the Seller\'s premises before shipment, at the Buyer\'s own cost, by giving at least {inspNotice} days\' prior written notice. If the Buyer does not inspect within the period notified by the Seller, the goods shall be deemed approved for shipment.',
                ko: '매수인은 최소 {inspNotice}일 전에 서면으로 알리고 자기 비용으로 선적 전에 매도인 사업장에서 물품을 검사할 수 있다. 매수인이 매도인이 알린 기간 안에 검사하지 않으면 선적을 승인한 것으로 본다.'
            },
            third: {
                label: '제3 검사기관 선적 전 검사(바이어 비용)',
                en: 'A pre-shipment inspection may be carried out by {inspector} at the Buyer\'s cost. The inspection certificate issued by that company shall be final as to the quality and quantity of the goods at the time of shipment.',
                ko: '선적 전 검사는 매수인 비용으로 {inspector}가 할 수 있다. 그 기관이 발행한 검사증명서를 선적 시점의 품질·수량에 대한 최종 근거로 본다.'
            }
        }
    };

    /* ── 9. 클레임 ── */
    C.claims = {
        titleEn: 'Claims', titleKo: '클레임',
        why: '클레임 기한과 증빙 방식을 정해 두지 않으면 오래 지난 뒤의 클레임이나 대금 지급 보류로 이어질 수 있습니다.',
        en: 'Any claim regarding the quality or quantity of the goods shall be notified to the Seller in writing within {claimDays} days after arrival of the goods at the destination, with supporting evidence such as photographs or a survey report issued by an independent surveyor. If no claim is notified within this period, the goods shall be deemed accepted by the Buyer. A claim shall not entitle the Buyer to withhold payment of any amount that is not in dispute.',
        warrEn: 'Claims under the Warranty article of this Contract may, however, be notified within the warranty period.',
        warrKo: '다만 품질보증 조항에 따른 클레임은 보증 기간 안에 알릴 수 있다.',
        ko: '물품의 품질·수량에 관한 클레임은 물품이 목적지에 도착한 날부터 {claimDays}일 안에 사진이나 독립 검정기관의 검정보고서 같은 증빙을 붙여 서면으로 매도인에게 알려야 한다. 이 기간 안에 알리지 않으면 매수인이 물품을 인수한 것으로 본다. 클레임이 있더라도 다툼이 없는 금액의 지급을 미룰 수 없다.'
    };

    /* ── 선택 조항 ── */
    C.warranty = {
        titleEn: 'Warranty', titleKo: '품질보증',
        why: '보증 기간과 보증 책임의 범위(수리·교환·감액)를 정해 끝없는 책임을 막습니다.',
        check: true,
        note: '보증 책임을 수리·교환·감액으로만 제한하는 문구가 바이어 나라 법(소비자·강행규정)에서 그대로 인정되는지는 확실하지 않습니다.',
        en: 'The Seller warrants that the goods will conform to the specifications set out in this Contract for {warrMonths} months from the date of shipment. The Seller\'s obligation under this warranty is limited, at the Seller\'s option, to repair or replacement of the non-conforming goods or an appropriate price reduction.',
        ko: '매도인은 선적일부터 {warrMonths}개월 동안 물품이 이 계약의 사양에 맞음을 보증한다. 이 보증에 따른 매도인의 의무는 매도인의 선택에 따라 부적합 물품의 수리·교환 또는 적정한 대금 감액으로 한정한다.'
    };
    C.liability = {
        titleEn: 'Limitation of Liability', titleKo: '책임 제한',
        why: '간접손해·일실이익 배제와 배상 상한을 정해 예상하지 못한 큰 배상을 막습니다.',
        check: true,
        note: '책임 배제·상한 조항은 고의·중과실 등에는 효력이 없을 수 있고, 나라마다 인정 범위가 달라 확실하지 않습니다. 반드시 전문가 확인을 받으세요.',
        en: 'Neither party shall be liable to the other for any indirect or consequential loss, including loss of profit, arising out of this Contract. The Seller\'s total liability arising out of or in connection with this Contract shall not exceed the price of the goods in respect of which the claim is made. This Article shall not apply to liability that cannot be limited under the governing law.',
        ko: '어느 당사자도 이 계약으로 생긴 간접손해나 일실이익 같은 결과적 손해를 상대방에게 배상하지 않는다. 이 계약과 관련한 매도인의 배상 책임 총액은 클레임 대상 물품의 대금을 넘지 않는다. 이 조는 준거법상 제한할 수 없는 책임에는 적용하지 않는다.'
    };
    C.ld = {
        titleEn: 'Late Delivery', titleKo: '납기 지연 배상',
        why: '바이어가 지연 배상을 요구할 때, 비율과 상한을 미리 정해 배상 규모를 예측할 수 있게 합니다.',
        check: true,
        note: '손해배상 예정액이 과다하면 감액될 수 있고, 나라에 따라 위약벌로 보아 효력이 달라질 수 있습니다.',
        en: 'If the Seller fails to ship the goods by the agreed date for reasons attributable to the Seller, the Seller shall pay liquidated damages of {ldRate}% of the value of the delayed goods for each full week of delay, up to a maximum of {ldCap}% of that value.',
        ko: '매도인의 책임 있는 사유로 합의한 날까지 선적하지 못하면, 매도인은 지연된 물품 금액의 {ldRate}%를 지연 1주일마다 손해배상 예정액으로 지급하되, 그 금액의 {ldCap}%를 넘지 않는다.'
    };
    C.fm = {
        titleEn: 'Force Majeure', titleKo: '불가항력',
        why: '천재지변·전쟁·감염병·정부 조치처럼 통제할 수 없는 일로 늦어질 때 책임을 면하는 근거입니다. 대금 지급 의무는 빼 두었습니다.',
        en: 'Neither party shall be liable for any failure or delay in performing its obligations under this Contract, other than payment obligations, caused by events beyond its reasonable control, such as natural disasters, war, epidemics, strikes or governmental actions, provided that the affected party notifies the other party in writing within {fmDays} days after the occurrence of the event. If such event continues for more than {fmTerm} days, either party may terminate the unperformed part of this Contract by written notice.',
        ko: '어느 당사자도 천재지변, 전쟁, 감염병, 파업, 정부 조치처럼 합리적으로 통제할 수 없는 사유로 이 계약의 의무(대금 지급 의무는 제외)를 이행하지 못하거나 늦어진 데 대해 책임을 지지 않는다. 다만 그 사유가 생긴 날부터 {fmDays}일 안에 상대방에게 서면으로 알려야 한다. 그 사유가 {fmTerm}일을 넘게 이어지면 각 당사자는 서면 통지로 이행되지 않은 부분의 계약을 해제할 수 있다.'
    };
    C.ip = {
        titleEn: 'Intellectual Property', titleKo: '지식재산권',
        why: 'OEM처럼 바이어가 준 디자인·상표로 만들 때, 제3자 권리 침해 책임이 매도인에게 오지 않게 합니다.',
        check: true,
        note: '면책(hold harmless) 범위와 효력은 준거법과 침해가 문제 된 나라의 법에 따라 달라질 수 있습니다.',
        en: 'If the goods are manufactured in accordance with designs, specifications, trademarks or other instructions provided by the Buyer, the Buyer shall be responsible for any infringement of third-party intellectual property rights arising from them and shall indemnify and hold the Seller harmless from any resulting claims, losses and costs.',
        ko: '물품을 매수인이 제공한 디자인·사양·상표 또는 그 밖의 지시에 따라 제조한 경우, 그로 인한 제3자 지식재산권 침해는 매수인이 책임지며, 이로써 생긴 청구·손해·비용으로부터 매도인을 면책하고 보호한다.'
    };
    C.conf = {
        titleEn: 'Confidentiality', titleKo: '비밀유지',
        why: '가격·기술 정보가 경쟁사로 새지 않게 합니다. 기간을 정해 두는 것이 일반적입니다.',
        en: 'Each party shall keep confidential the terms of this Contract and any technical or commercial information received from the other party, and shall not disclose them to any third party without the other party\'s prior written consent, except as required by law. This obligation shall continue for {confYears} years after the expiry or termination of this Contract.',
        ko: '각 당사자는 이 계약의 조건과 상대방에게서 받은 기술·영업 정보를 비밀로 유지하며, 법령에 따라 요구되는 경우를 빼고는 상대방의 사전 서면 동의 없이 제3자에게 공개하지 않는다. 이 의무는 계약이 끝난 뒤에도 {confYears}년 동안 유지된다.'
    };

    /* ── 계좌·사기 경고(기본 포함) ── */
    C.bank = {
        titleEn: 'Bank Account and Anti-Fraud', titleKo: '은행계좌·사기 경고',
        titleEnPlain: 'Bank Account', titleKoPlain: '은행계좌',
        why: '이메일 계좌변경 사기(BEC)를 막으려면 계좌를 계약서에 처음부터 적고, 이메일로는 바꾸지 않는다고 미리 알려야 합니다.',
        check: true,
        note: '잘못된 계좌로 송금된 대금의 책임이 이 문구로 어떻게 정리되는지는 나라·계약·사안마다 달라 확실하지 않습니다. 이 조항은 사기를 막는 예방 수단입니다.',
        accountEn: 'All payments under this Contract shall be made only to the following account of the Seller:\nBeneficiary: {beneficiary}\nBank: {bank}\nBank address: {bankAddr}\nSWIFT: {swift}\nAccount No.: {account}',
        accountKo: '이 계약에 따른 모든 대금은 아래 매도인 계좌로만 지급한다.\n수취인: {beneficiary}\n은행: {bank}\n은행 주소: {bankAddr}\nSWIFT: {swift}\n계좌번호: {account}',
        noticeEn: 'SECURITY NOTICE (ANTI-FRAUD): The Seller will NEVER change its bank account details by email. Any change of the account shall be valid only if made by a written amendment signed by both parties and confirmed by a voice or video call to a telephone number already known to the Buyer. The Seller shall not be responsible for any payment made to an account other than the one stated above, and such payment shall not discharge the Buyer\'s payment obligation.',
        noticeKo: '보안 안내(사기 경고): 매도인은 이메일로 계좌 정보를 절대 바꾸지 않는다. 계좌 변경은 양 당사자가 서명한 서면 변경 합의가 있고, 매수인이 이미 알고 있는 전화번호로 음성·영상 통화를 해 확인한 경우에만 효력이 있다. 위 계좌가 아닌 곳으로 송금한 대금에 대해 매도인은 책임지지 않으며, 그 송금으로 매수인의 지급 의무가 없어지지 않는다.'
    };

    /* ── 준거법 ── */
    C.law = {
        titleEn: 'Governing Law', titleKo: '준거법',
        why: '어느 나라 법으로 계약을 해석할지 정해 두지 않으면, 분쟁이 나면 그것부터 다투게 됩니다.',
        en: 'This Contract shall be governed by and construed in accordance with the laws of {law}.',
        ko: '이 계약은 {lawKo} 법에 따라 규율되고 해석된다.',
        cisgApplyEn: 'The United Nations Convention on Contracts for the International Sale of Goods (CISG) shall apply to this Contract, and matters not governed by the CISG shall be governed by the laws of {law}.',
        cisgApplyKo: '이 계약에는 「국제물품매매계약에 관한 유엔협약」(CISG)을 적용하고, CISG가 정하지 않은 사항은 {lawKo} 법에 따른다.',
        cisgExcludeEn: 'The United Nations Convention on Contracts for the International Sale of Goods (CISG) shall not apply to this Contract.',
        cisgExcludeKo: '이 계약에는 「국제물품매매계약에 관한 유엔협약」(CISG)을 적용하지 않는다.'
    };

    /* ── 분쟁해결 ── 중재 문구는 이 사이트에서 새로 쓴 것(기관 권장 표준 문구는 해당 기관 사이트에서 확인) */
    C.dispute = {
        titleEn: 'Dispute Resolution', titleKo: '분쟁해결',
        why: '분쟁을 어디서 어떤 방식(중재·소송)으로 풀지 정해 둡니다. 중재판정은 뉴욕협약 가입국에서 집행을 구할 수 있습니다.',
        variants: {
            kcab: {
                label: '대한상사중재원(KCAB) 국제중재',
                en: 'Any dispute arising out of or in connection with this Contract shall be finally settled by arbitration under the International Arbitration Rules of the Korean Commercial Arbitration Board. The seat of arbitration shall be {seat}, Korea. The number of arbitrators shall be {arbNum}, and the language of the arbitration shall be {arbLang}. The award shall be final and binding on both parties.',
                ko: '이 계약으로 또는 이 계약과 관련하여 생기는 모든 분쟁은 대한상사중재원의 국제중재규칙에 따른 중재로 최종 해결한다. 중재지는 대한민국 {seatKo}로 하고, 중재인은 {arbNum}명, 중재 언어는 {arbLangKo}로 한다. 중재판정은 최종적이며 양 당사자를 구속한다.'
            },
            icc: {
                label: '국제상업회의소(ICC) 중재',
                en: 'Any dispute arising out of or in connection with this Contract shall be finally settled under the Rules of Arbitration of the International Chamber of Commerce by {arbWho} appointed in accordance with those Rules. The seat of arbitration shall be {seat}, and the language of the arbitration shall be {arbLang}.',
                ko: '이 계약으로 또는 이 계약과 관련하여 생기는 모든 분쟁은 국제상업회의소(ICC) 중재규칙에 따라 그 규칙대로 선정된 중재인 {arbNum}명이 최종 해결한다. 중재지는 {seatKo}, 중재 언어는 {arbLangKo}로 한다.'
            },
            court_kr: {
                label: '한국 법원(서울중앙지방법원) 소송',
                en: 'Any dispute arising out of or in connection with this Contract shall be submitted to the exclusive jurisdiction of the Seoul Central District Court, Republic of Korea.',
                ko: '이 계약으로 또는 이 계약과 관련하여 생기는 모든 분쟁은 대한민국 서울중앙지방법원의 전속관할로 한다.'
            },
            court_buyer: {
                label: '바이어 나라 법원 소송',
                en: 'Any dispute arising out of or in connection with this Contract shall be submitted to the competent courts of {buyerCountry}.',
                ko: '이 계약으로 또는 이 계약과 관련하여 생기는 모든 분쟁은 {buyerCountry}의 관할 법원에서 해결한다.'
            }
        },
        amicableEn: 'The parties shall first try to settle any dispute amicably through good-faith negotiation for 30 days before commencing proceedings.',
        amicableKo: '당사자는 절차를 시작하기 전에 30일 동안 성실한 협의로 분쟁을 원만히 해결하도록 먼저 노력한다.'
    };

    /* ── 일반 조항 ── */
    C.general = {
        titleEn: 'Entire Agreement and Amendments', titleKo: '완전합의·변경',
        why: '바이어 발주서(PO) 뒷면 약관 등 다른 서류의 조건이 끼어들지 않게 하고, 변경은 서면으로만 하게 합니다.',
        en: 'This Contract constitutes the entire agreement between the parties concerning its subject matter and supersedes all prior offers, proposals and communications. Any terms in the Buyer\'s purchase order or other documents that conflict with or add to this Contract shall not apply unless agreed in writing by the Seller. Any amendment to this Contract shall be valid only if made in writing and signed by both parties.',
        ko: '이 계약은 그 대상에 관한 당사자 사이의 완전한 합의이며, 이전의 오퍼·제안·연락을 대신한다. 매수인의 발주서나 그 밖의 서류에 있는 조건이 이 계약과 다르거나 이 계약에 더해지는 경우, 매도인이 서면으로 동의하지 않는 한 적용하지 않는다. 이 계약의 변경은 서면으로 하고 양 당사자가 서명해야 효력이 있다.'
    };
    C.language = {
        titleEn: 'Language and Counterparts', titleKo: '언어·서명본',
        why: '번역본과 원문이 다를 때 어느 쪽이 우선하는지와, PDF로 주고받은 서명본의 효력을 정합니다.',
        en: 'This Contract is made in English. Any translation is for reference only, and the English text shall prevail in case of any inconsistency. This Contract may be signed in counterparts, and signed copies exchanged by PDF shall have the same effect as originals.',
        ko: '이 계약은 영어로 작성한다. 번역본은 참고용이며, 서로 다를 때에는 영문이 우선한다. 이 계약은 각자 서명할 수 있으며, PDF로 주고받은 서명본은 원본과 같은 효력을 가진다.'
    };

    /* ── 서명란 ── */
    C.sign = {
        en: 'IN WITNESS WHEREOF, the parties have signed this Contract on the date first written above.',
        ko: '이상을 증명하기 위하여 양 당사자는 위 날짜에 이 계약에 서명한다.'
    };

    window.CB_LIB = { PH: PH, MODE: MODE, C: C };
})();
