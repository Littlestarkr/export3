/* 작성기 초안 → 진짜 Word(.docx) 파일 만들기
 * - 계약서 초안 작성기·수출서류 초안 작성기가 함께 쓴다.
 * - 화면 초안(HTML)을 Word 문서 구조(WordprocessingML)로 바꾸고, 압축 없는 ZIP으로 묶는다.
 * - 외부 라이브러리·서버 호출 없음. 브라우저 안에서만 처리한다.
 * - 예전에는 HTML을 .doc 이름으로 저장해서 PC Word에서만 열리고 휴대폰 뷰어에서는
 *   '지원하지 않는 파일 형식'이 떴다. .docx는 휴대폰 기본 뷰어·폴라리스·한컴·구글 문서에서도 열린다.
 */
(function () {
    'use strict';

    var FONT = 'Malgun Gothic';
    var RED = 'C0392B', GREY = '777777';
    var PAGE_W = 9638; // A4(11906) - 좌우 여백 1134 x 2 (twip)

    function x(s) { // XML 이스케이프 + XML에 못 넣는 제어문자 제거
        return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function hasCls(el, c) { return el.classList && el.classList.contains(c); }

    /* ───────── 글자 모양(run) ───────── */
    function runXml(text, f) {
        var p = '';
        if (f.bold) p += '<w:b/><w:bCs/>';
        if (f.italic) p += '<w:i/>';
        if (f.color) p += '<w:color w:val="' + f.color + '"/>';
        if (f.size) p += '<w:sz w:val="' + f.size + '"/><w:szCs w:val="' + f.size + '"/>';
        if (f.boxed) p += '<w:bdr w:val="single" w:sz="12" w:space="1" w:color="' + RED + '"/>'; // bdr → shd 순서(CT_RPr)
        if (f.mark) p += '<w:shd w:val="clear" w:color="auto" w:fill="FFF1C2"/>';
        var rPr = p ? '<w:rPr>' + p + '</w:rPr>' : '';
        return text.split('\n').map(function (line, i) {
            return (i ? '<w:r>' + rPr + '<w:br/></w:r>' : '') + (line ? '<w:r>' + rPr + '<w:t xml:space="preserve">' + x(line) + '</w:t></w:r>' : '');
        }).join('');
    }

    /* ───────── 문단 모양 ───────── */
    function pPrXml(ps) {
        var p = '';
        if (ps.keepNext) p += '<w:keepNext/>'; // 순서는 Word 규격(CT_PPr) 순서를 따른다
        if (ps.pageBreak) p += '<w:pageBreakBefore/>';
        var bd = '';
        if (ps.box) bd = '<w:top w:val="single" w:sz="12" w:space="4" w:color="' + RED + '"/><w:left w:val="single" w:sz="12" w:space="4" w:color="' + RED + '"/><w:bottom w:val="single" w:sz="12" w:space="4" w:color="' + RED + '"/><w:right w:val="single" w:sz="12" w:space="4" w:color="' + RED + '"/>';
        else if (ps.leftBar) bd = '<w:left w:val="single" w:sz="18" w:space="6" w:color="BBBBBB"/>';
        else if (ps.topLine) bd = '<w:top w:val="single" w:sz="6" w:space="2" w:color="333333"/>';
        if (bd) p += '<w:pBdr>' + bd + '</w:pBdr>';
        if (ps.fill) p += '<w:shd w:val="clear" w:color="auto" w:fill="' + ps.fill + '"/>';
        p += '<w:spacing w:before="' + (ps.before || 0) + '" w:after="' + (ps.after == null ? 100 : ps.after) + '"/>';
        if (ps.leftBar) p += '<w:ind w:left="140"/>';
        if (ps.align) p += '<w:jc w:val="' + ps.align + '"/>';
        return '<w:pPr>' + p + '</w:pPr>';
    }
    function para(runs, ps) { return '<w:p>' + pPrXml(ps || {}) + runs + '</w:p>'; }

    var BLOCK = { P: 1, DIV: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, TABLE: 1, UL: 1, OL: 1, LI: 1, SECTION: 1, ARTICLE: 1, BLOCKQUOTE: 1 };
    var SKIP = { BUTTON: 1, SCRIPT: 1, STYLE: 1, INPUT: 1, SVG: 1 };

    // 요소에 따라 문단 모양 바꾸기
    function blockStyle(el, ps) {
        var n = {}; for (var k in ps) n[k] = ps[k];
        delete n.pageBreak; // 쪽 나눔은 첫 문단에만(아래 emit에서 처리)
        var t = el.tagName;
        if (t === 'H1' || t === 'H2' || t === 'H3' || t === 'H4') { n.align = 'center'; n.before = 80; n.after = 80; n.keepNext = true; }
        if (t === 'H5' || t === 'H6') { n.before = 200; n.after = 80; n.keepNext = true; }
        if (hasCls(el, 'cb-doc-sub')) n.align = 'center';
        if (hasCls(el, 'cb-doc-warn') || hasCls(el, 'db-fraud')) { n.box = true; if (hasCls(el, 'cb-doc-warn')) n.fill = 'FFF7F5'; }
        if (hasCls(el, 'cb-ko')) { n.leftBar = true; n.fill = 'F3F4F6'; }
        if (hasCls(el, 'cb-sign-line')) { n.topLine = true; n.before = 400; }
        if (hasCls(el, 'num')) n.align = 'right';
        if (el.style && el.style.textAlign) n.align = el.style.textAlign === 'right' ? 'right' : el.style.textAlign === 'center' ? 'center' : n.align;
        return n;
    }
    function inlineStyle(el, f) {
        var n = {}; for (var k in f) n[k] = f[k];
        var t = el.tagName;
        if (t === 'STRONG' || t === 'B' || t === 'TH' || t === 'H1' || t === 'H2' || t === 'H3' || t === 'H4' || t === 'H5' || t === 'H6') n.bold = true;
        if (t === 'EM' || t === 'I') n.italic = true;
        if (t === 'H4') n.size = 32;
        if (t === 'H5') n.size = 22;
        if (t === 'SMALL') n.size = Math.max(14, (n.size || 20) - 4);
        if (t === 'MARK') n.mark = true;
        if (hasCls(el, 'cb-doc-warn')) { n.color = '5A1F18'; n.size = 18; }
        if (hasCls(el, 'cb-doc-stamp')) { n.color = RED; n.bold = true; n.size = 28; n.boxed = true; }
        if (hasCls(el, 'cb-ko-k')) { n.color = '888888'; n.bold = true; n.size = 16; }
        if (hasCls(el, 'db-l-ko') || hasCls(el, 'db-v-ko')) { n.color = GREY; n.size = 16; n.bold = false; }
        if (hasCls(el, 'db-p-t')) { n.bold = true; n.color = '555555'; n.size = 17; }
        if (hasCls(el, 'db-words')) n.bold = true;
        if (hasCls(el, 'cb-badge')) { n.color = 'A5281B'; n.size = 16; n.bold = true; }
        if (hasCls(el, 'cb-doc-sub')) n.color = '555555';
        if (hasCls(el, 'cb-ko')) n.color = '333333';
        if (el.style && el.style.color === 'rgb(192, 57, 43)') n.color = RED;
        if (el.style && el.style.fontWeight === 'bold') n.bold = true;
        if (el.style && el.style.fontSize) { var pt = parseFloat(el.style.fontSize); if (pt) n.size = Math.round(pt * 2); }
        return n;
    }
    // 화면에서 줄을 바꿔 보이는 span(display:block)
    function isBlockSpan(el) { return hasCls(el, 'cb-ko-k') || hasCls(el, 'db-l-ko') || hasCls(el, 'db-v-ko'); }

    /* ───────── 변환기 ───────── */
    function Conv() { this.out = []; this.runs = ''; this.ps = null; this.pendingBreak = false; }
    Conv.prototype.flush = function () {
        if (this.runs) {
            var ps = this.ps || {};
            if (this.pendingBreak) { ps = Object.assign({}, ps, { pageBreak: true }); this.pendingBreak = false; }
            this.out.push(para(this.runs, ps));
        }
        this.runs = ''; this.ps = null;
    };
    Conv.prototype.addRun = function (text, f, ps) {
        if (!text) return;
        if (!this.runs) this.ps = ps;
        this.runs += runXml(text, f);
    };
    Conv.prototype.lineBreak = function (ps) {
        if (!this.runs) return; // 문단 맨 앞의 줄바꿈은 버린다
        this.runs += '<w:r><w:br/></w:r>';
    };
    Conv.prototype.walk = function (node, f, ps) {
        var self = this;
        Array.prototype.forEach.call(node.childNodes, function (c) {
            if (c.nodeType === 3) {
                var t = c.nodeValue.replace(/[\t\r\n ]+/g, ' ');
                if (!self.runs) t = t.replace(/^ +/, '');
                if (t) self.addRun(t, f, ps);
                return;
            }
            if (c.nodeType !== 1) return;
            var tag = c.tagName.toUpperCase();
            if (SKIP[tag] || c.getAttribute('aria-hidden') === 'true') return;
            if (tag === 'BR') { self.lineBreak(ps); return; }
            if (tag === 'TABLE') { self.flush(); self.table(c, f, ps); return; }
            var cf = inlineStyle(c, f);
            if (BLOCK[tag]) {
                self.flush();
                var cps = blockStyle(c, ps);
                if (hasCls(c, 'db-pb')) self.pendingBreak = true;
                self.walk(c, cf, cps);
                self.flush();
                return;
            }
            if (tag === 'SPAN' && isBlockSpan(c)) self.lineBreak(ps);
            self.walk(c, cf, ps);
            if (tag === 'SPAN' && hasCls(c, 'cb-ko-k')) self.lineBreak(ps); // '국문 번역(참고)' 머리표 뒤 줄바꿈
        });
    };
    Conv.prototype.table = function (tbl, f, ps) {
        var rows = Array.prototype.filter.call(tbl.querySelectorAll('tr'), function (tr) { return tr.closest('table') === tbl; });
        if (!rows.length) return;
        var ncol = 0;
        rows.forEach(function (tr) {
            var n = 0; Array.prototype.forEach.call(tr.children, function (td) { n += +(td.getAttribute('colspan') || 1); });
            ncol = Math.max(ncol, n);
        });
        var widths = [];
        if (ncol === 2) widths = [Math.round(PAGE_W * 0.32), PAGE_W - Math.round(PAGE_W * 0.32)];
        else for (var i = 0; i < ncol; i++) widths.push(Math.floor(PAGE_W / ncol));
        var bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="999999"/>'; }).join('') + '</w:tblBorders>';
        var xml = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + bd + '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' +
            widths.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>';
        var self = this;
        rows.forEach(function (tr) {
            var isHead = tr.parentNode && tr.parentNode.tagName === 'THEAD';
            xml += '<w:tr>' + (isHead ? '<w:trPr><w:tblHeader/></w:trPr>' : '');
            var col = 0, cells = 0;
            Array.prototype.forEach.call(tr.children, function (td) {
                var span = +(td.getAttribute('colspan') || 1), w = 0;
                for (var j = col; j < col + span && j < widths.length; j++) w += widths[j];
                col += span; cells++;
                var isTh = td.tagName === 'TH';
                var sub = new Conv();
                var cps = blockStyle(td, { after: 0 });
                sub.walk(td, inlineStyle(td, Object.assign({}, f, { size: 18 })), cps);
                sub.flush();
                var inner = sub.out.join('') || para('', cps);
                xml += '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '') +
                    (isTh ? '<w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>' : '') + '</w:tcPr>' + inner + '</w:tc>';
            });
            // 칸이 모자란 줄은 빈 칸으로 채운다(Word 표 구조 유지)
            for (; col < ncol; col++) xml += '<w:tc><w:tcPr><w:tcW w:w="' + widths[col] + '" w:type="dxa"/></w:tcPr>' + para('', {}) + '</w:tc>';
            xml += '</w:tr>';
        });
        xml += '</w:tbl>';
        if (this.pendingBreak) { this.out.push(para('', { pageBreak: true, after: 0 })); this.pendingBreak = false; }
        this.out.push(xml);
        this.out.push(para('', { after: 60 })); // 표 바로 뒤 간격(표가 연달아 붙지 않게)
    };

    function bodyXml(htmlParts) {
        var c = new Conv();
        htmlParts.forEach(function (h, i) {
            var doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body><div id="__r">' + h + '</div></body></html>', 'text/html');
            if (i) c.pendingBreak = true;
            c.addRun('초안 DRAFT', { color: RED, bold: true, size: 48 }, { align: 'center', after: 60 });
            c.flush();
            c.walk(doc.getElementById('__r'), { size: 20 }, {});
            c.flush();
        });
        return c.out.join('');
    }

    /* ───────── 패키지 파일 ───────── */
    var XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
    var W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    function documentXml(body, footText) {
        return XML_HEAD + '<w:document ' + W_NS + '><w:body>' + body +
            '<w:sectPr><w:footerReference w:type="default" r:id="rIdFoot"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
    }
    function footerXml(text) {
        return XML_HEAD + '<w:ftr ' + W_NS + '>' + para(runXml(text, { color: RED, size: 15 }), { align: 'center', after: 0 }) + '</w:ftr>';
    }
    function stylesXml() {
        return XML_HEAD + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>' +
            '<w:rFonts w:ascii="' + FONT + '" w:hAnsi="' + FONT + '" w:eastAsia="' + FONT + '" w:cs="' + FONT + '"/><w:color w:val="111111"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-US" w:eastAsia="ko-KR"/>' +
            '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
            '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
            '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
            '</w:styles>';
    }
    function coreXml(title) {
        var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
        return XML_HEAD + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
            '<dc:title>' + x(title) + '</dc:title><dc:creator>littlestar.co.kr draft builder</dc:creator>' +
            '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified></cp:coreProperties>';
    }
    var CT = XML_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
    var RELS = XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
    var DOC_RELS = XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '<Relationship Id="rIdFoot" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>';

    /* ───────── 압축 없는 ZIP ───────── */
    var CRC_T = (function () {
        var t = new Uint32Array(256);
        for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
        return t;
    })();
    function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
    function zip(files) { // [{name, data(Uint8Array)}]
        var enc = new TextEncoder(), parts = [], central = [], off = 0;
        var d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF,
            dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
        files.forEach(function (f) {
            var name = enc.encode(f.name), data = f.data, crc = crc32(data);
            var h = new DataView(new ArrayBuffer(30));
            h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
            h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
            h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
            parts.push(new Uint8Array(h.buffer), name, data);
            var c = new DataView(new ArrayBuffer(46));
            c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
            c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
            c.setUint16(28, name.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
            c.setUint32(38, 0, true); c.setUint32(42, off, true);
            central.push(new Uint8Array(c.buffer), name);
            off += 30 + name.length + data.length;
        });
        var cSize = central.reduce(function (s, a) { return s + a.length; }, 0);
        var e = new DataView(new ArrayBuffer(22));
        e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
        e.setUint32(12, cSize, true); e.setUint32(16, off, true);
        return parts.concat(central, [new Uint8Array(e.buffer)]);
    }

    var MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    /* htmlParts: 화면 초안 HTML 조각 배열(서류 하나에 하나, 둘째부터 새 쪽)
     * opts: { title, footer } → Blob(.docx) */
    function build(htmlParts, opts) {
        opts = opts || {};
        var enc = new TextEncoder();
        var files = [
            ['[Content_Types].xml', CT],
            ['_rels/.rels', RELS],
            ['docProps/core.xml', coreXml(opts.title || 'DRAFT')],
            ['word/document.xml', documentXml(bodyXml(htmlParts))],
            ['word/styles.xml', stylesXml()],
            ['word/footer1.xml', footerXml(opts.footer || '초안 DRAFT')],
            ['word/_rels/document.xml.rels', DOC_RELS]
        ].map(function (f) { return { name: f[0], data: enc.encode(f[1]) }; });
        return new Blob(zip(files), { type: MIME });
    }

    window.DocxExport = { build: build, MIME: MIME };
})();
