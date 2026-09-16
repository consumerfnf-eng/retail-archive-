/* ============================================
   F&F Retail Archive - Gallery View
   갤러리 카드 그리드 + 모달 + 제거된 제품 복원
   ============================================ */

/* ===== China 제품컷 / 컬러 아카이브 분류 ===== */
const PRODUCT_CUT_BRANDS = ["JNBY", "MO&Co.", "Urban Revivo", "Beneunder"];
const hasImg      = d => !!(d.image_url && d.image_url.trim());
const isCutBrand  = d => PRODUCT_CUT_BRANDS.includes(d.brand);
const isCutRow    = d => d.country === 'CN' && isCutBrand(d) && hasImg(d);
const isColorRow  = d => d.country === 'CN';
const cnActive = () => state.countries.has('CN');

function renderGallery(data) {
  // CN 국가 미포함이면 원래 갤러리 그대로
  data.forEach((d, i) => { d._idx = i; }); // 원래 인덱스 보존
  if (!cnActive()) return renderPlainGallery(data);

  const cutData   = data.filter(isCutRow);
  const colorData = data.filter(isColorRow);
  const missing   = data.filter(d => isColorRow(d) && isCutBrand(d) && !hasImg(d)).length;
  const tab       = (cutData.length === 0 || state.cnTab === 'color') ? 'color' : 'cut';

  const tabs = `<div class="cn-tabs">
    <button class="cn-tab ${tab==='cut'?'active':''}" data-cntab="cut">제품컷 <b>${cutData.length}</b></button>
    <button class="cn-tab ${tab==='color'?'active':''}" data-cntab="color">컬러 아카이브 <b>${colorData.length}</b></button>
  </div>`;

  const body = tab === 'color'
    ? renderColorArchive(colorData)
    : renderPlainGallery(cutData, {
        title: 'CHINA · 제품컷',
        sub: `지정 브랜드 + 이미지 보유 · 이미지 미수집 ${missing}건은 컬러 탭에서만 표시`
      });

  return tabs + body;
}

/* 원래 카드 그리드 (탭 헤더/서브 옵션) */
function renderPlainGallery(data, opts) {
  if (!data.length) return '<div class="empty">선택한 조건에 맞는 제품이 없습니다.</div>';

  const totalPages = Math.ceil(data.length / CONFIG.PAGE_SIZE);
  if (state.page > totalPages) state.page = 1;
  const start = (state.page - 1) * CONFIG.PAGE_SIZE;
  const pageData = data.slice(start, start + CONFIG.PAGE_SIZE);

  const cards = pageData.map((d, i) => {
    const gi = start + i;
    const hasImage = hasImg(d);
    const hexes = (d.hex_colors || []).slice(0, 6);

    const imgContent = hasImage
      ? `<div class="imgph">${PH_SVG}<span>${esc(d.product_name)}</span></div>
         <img src="${esc(proxyImage(d.image_url))}" alt="${esc(d.product_name)}" loading="lazy"
              referrerpolicy="no-referrer"
              data-orig="${esc(d.image_url)}" data-tried="0"
              onload="this.previousElementSibling.style.display='none'"
              onerror="imgFallback(this, this.dataset.orig)">`
      : `<div class="color-card-wrap">
         ${hexes.length ? hexes.map(h => `<div class="color-card-block" style="background:${esc(h)}"></div>`).join("") : `<div class="color-card-empty">${esc(d.product_name)}</div>`}
         </div>`;

    return `<div class="pcard" data-idx="${d._idx !== undefined ? d._idx : gi}">
      <div class="imgbox ${hasImage ? '' : 'no-img'}">
        ${imgContent}
      </div>
      <div class="pinfo">
        <div class="pbrand">${esc(d.brand)} · ${esc(d.gender)}</div>
        <div class="pname">${esc(d.product_name)}</div>
        <div class="pcat">${esc(d.category)}${d.subcategory && d.subcategory!=='—' ? ' · ' + esc(d.subcategory) : ''}${d._colorwayCount > 1 ? `<span class="cw-badge">${d._colorwayCount} colors</span>` : ''}</div>
        <div class="pcolors">${(d.hex_colors || []).slice(0,7).map(h =>
          `<span class="dot" style="background:${esc(h)}"></span>`).join("")}</div>
        <!-- 시트 행 표시는 카드에서 제거 (모달 Sheet Row 에서 확인) -->
      </div>
    </div>`;
  }).join("");

  // 제거 기능을 없앴으므로 복원 바도 표시하지 않는다.
  // 이전에 제외해 둔 항목이 남아 있을 때만 복원 안내를 보여 준다.
  const restoreBar = (typeof removed !== 'undefined' && removed.size)
    ? `<div class="restore-bar">
         <span>이전에 제외한 제품 ${removed.size}개가 남아 있습니다</span>
         <button id="restoreAll">전체 복원</button>
       </div>`
    : '';

  const head = opts
    ? `<div class="gal-head"><h3>${esc(opts.title)}</h3>
         <span class="gmeta">${data.length} items · ${state.page} / ${totalPages} page</span></div>
       <div class="gal-sub">${esc(opts.sub || '')}</div>`
    : `<div class="gal-head"><h3>Products</h3>
         <span class="gmeta">${data.length} items · ${state.page} / ${totalPages} page</span></div>`;

  return `${restoreBar}${head}<div class="gallery">${cards}</div>${pager(totalPages)}`;
}

/* 컬러 아카이브 = 콤팩트 테이블 */
function renderColorArchive(data) {
  if (!data.length) return '<div class="empty">컬러 데이터가 없습니다.</div>';

  const totalPages = Math.ceil(data.length / CONFIG.PAGE_SIZE);
  if (state.page > totalPages) state.page = 1;
  const start = (state.page - 1) * CONFIG.PAGE_SIZE;
  const pageData = data.slice(start, start + CONFIG.PAGE_SIZE);

  const rows = pageData.map(d => {
    const hexes = (d.hex_colors || []).slice(0, 8);
    const swatches = hexes.length
      ? hexes.map(h => `<span class="cl-sw" style="background:${esc(h)}" title="${esc(h)}"></span>`).join("")
      : '<span class="cl-none">—</span>';
    const badge = isCutRow(d) ? '<span class="cl-badge">제품컷</span>' : '';
    return `<tr>
      <td class="cl-brand">${esc(d.brand)}${badge}</td>
      <td class="cl-prod">${esc(d.product_name)}${d._colorwayCount > 1 ? ` <span class="cw-badge">${d._colorwayCount}</span>` : ''}</td>
      <td class="cl-cat">${esc(d.category)}</td>
      <td class="cl-colors">${swatches}</td>
      <td class="cl-hex">${esc(hexes.join(' '))}</td>
    </tr>`;
  }).join("");

  return `<div class="gal-head"><h3>CHINA · 컬러 아카이브</h3>
      <span class="gmeta">${data.length} items · ${state.page} / ${totalPages} page</span></div>
    <div class="gal-sub">China 전체 컬러 (제품컷 브랜드 포함) · 상단 “컬러 CSV” 에서 다운로드</div>
    <table class="cl-table">
      <thead><tr><th>Brand</th><th>Product</th><th>Category</th><th>Colors</th><th>Hex</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>${pager(totalPages)}`;
}

function pager(totalPages) {
  if (totalPages <= 1) return '';
  const p = state.page;
  const btns = [];
  btns.push(`<button data-pg="${p-1}" ${p<=1?'disabled':''}>‹</button>`);
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i-p) <= 2) pages.push(i);
    else if (pages[pages.length-1] !== "…") pages.push("…");
  }
  pages.forEach(x => {
    btns.push(x === "…"
      ? '<span class="pinfo-txt">…</span>'
      : `<button data-pg="${x}" class="${x===p?'active':''}">${x}</button>`);
  });
  btns.push(`<button data-pg="${p+1}" ${p>=totalPages?'disabled':''}>›</button>`);
  return `<div class="pager">${btns.join("")}</div>`;
}

/* 변형이 많을 때 시트 행번호를 짧게 (61~91 · 31행) */
function sheetRowText(d) {
  const rows = d._variantRows;
  if (!rows || rows.length <= 1) return String(d._sheetRow || '—');
  if (rows.length <= 6) return rows.join(', ');
  const nums = rows.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
  if (!nums.length) return rows.length + '행';
  return nums[0] + '~' + nums[nums.length - 1] + ' · ' + rows.length + '행';
}

/* ============================================
   제품 상세 모달
   - 컬러웨이 병합 아이템은 화살표로 컬러별 사진을 넘겨 본다
   - 레이아웃/칩 스타일을 인라인으로 박아 style.css 상태와 무관하게 동작
   ============================================ */

let MODAL_ITEM  = null;   // 현재 열린 아이템
let MODAL_SHOTS = [];     // [{url, label, hex, vi}] · 이미지 있는 변형만
let MODAL_POS   = 0;      // 현재 보고 있는 사진 index

/* 이미지가 있는 변형만 모은다 */
function buildModalShots(d) {
  const out = [];
  const merged = !!(d._variants && d._variants.length);
  const vs = merged ? d._variants : [d];
  vs.forEach((v, i) => {
    if (!v.image_url || !v.image_url.trim()) return;
    out.push({
      url:   v.image_url,
      label: (merged ? (d.colors || [])[i] : (d.colors || [])[0]) || '',
      hex:   (merged ? (d.hex_colors || [])[i] : (d.hex_colors || [])[0]) || '',
      vi:    i
    });
  });
  return out;
}

/* 현재 사진 그리기 (이미지 영역만 갱신) */
function renderModalShot() {
  const box = $("#mimgBox");
  if (!box) return;

  if (!MODAL_SHOTS.length) return;
  const s = MODAL_SHOTS[MODAL_POS];
  const many = MODAL_SHOTS.length > 1;

  const navBase = 'position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;'
    + 'border-radius:50%;background:rgba(255,255,255,0.9);border:none;cursor:pointer;'
    + 'font-size:20px;line-height:1;color:#2c2a26;display:flex;align-items:center;'
    + 'justify-content:center;z-index:4;box-shadow:0 1px 4px rgba(0,0,0,.18);padding:0;';

  box.innerHTML = `
    <div class="imgph">${PH_SVG}<span>이미지 불러올 수 없음</span></div>
    <img src="${esc(proxyImage(s.url))}"
         referrerpolicy="no-referrer"
         style="width:100%;height:100%;max-width:100%;object-fit:cover;display:block"
         data-orig="${esc(s.url)}" data-tried="0"
         onload="this.previousElementSibling.style.display='none'"
         onerror="imgFallback(this, this.dataset.orig)">
    ${many ? `
      <button id="mPrev" aria-label="이전 컬러" style="${navBase}left:10px">&#8249;</button>
      <button id="mNext" aria-label="다음 컬러" style="${navBase}right:10px">&#8250;</button>
      <div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
                  background:rgba(0,0,0,.62);color:#fff;font-size:10.5px;letter-spacing:.02em;
                  padding:4px 10px;border-radius:11px;z-index:4;white-space:nowrap;
                  display:flex;align-items:center;gap:6px">
        ${s.hex ? `<span style="width:10px;height:10px;border-radius:50%;background:${esc(s.hex)};
                    border:.5px solid rgba(255,255,255,.5);display:inline-block"></span>` : ''}
        ${MODAL_POS + 1} / ${MODAL_SHOTS.length}${s.label ? ' · ' + esc(s.label) : ''}
      </div>` : ''}
  `;

  if (many) {
    const p = $("#mPrev"), n = $("#mNext");
    if (p) p.onclick = e => { e.stopPropagation(); modalStep(-1); };
    if (n) n.onclick = e => { e.stopPropagation(); modalStep(1); };
  }

  // 원본 링크를 현재 사진으로
  const link = $("#mOrigLink");
  if (link) link.href = s.url;

  // 컬러 칩 활성 표시
  $$("#modalbox [data-shot]").forEach(el => {
    const on = +el.dataset.shot === MODAL_POS;
    el.style.outline = on ? '1.5px solid var(--accent)' : 'none';
    el.style.outlineOffset = on ? '1px' : '0';
  });
}

function modalStep(n) {
  if (MODAL_SHOTS.length < 2) return;
  MODAL_POS = (MODAL_POS + n + MODAL_SHOTS.length) % MODAL_SHOTS.length;
  renderModalShot();
}

/* 좌우 방향키로 넘기기 (한 번만 등록) */
if (!window.__modalNavBound) {
  window.__modalNavBound = true;
  document.addEventListener('keydown', e => {
    const m = document.getElementById('modal');
    if (!m || !m.classList.contains('open')) return;
    if (MODAL_SHOTS.length < 2) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); modalStep(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); modalStep(1); }
  });
}

function openModal(d) {
  MODAL_ITEM  = d;
  MODAL_SHOTS = buildModalShots(d);
  MODAL_POS   = 0;

  const cN = (d.colors && d.colors.length) || 0;
  const hN = (d.hex_colors && d.hex_colors.length) || 0;
  const paired = (cN > 0 && hN > 0 && cN === hN);
  const total  = Math.max(cN, hN);

  // 컬러 3개 초과면 컴팩트 모드
  const COMPACT_FROM = 3;
  const compact = total > COMPACT_FROM;

  // 변형 index -> 사진 index
  const shotOf = {};
  MODAL_SHOTS.forEach((s, si) => { shotOf[s.vi] = si; });

  /* ---- 인라인 스타일 (style.css 없이도 동작) ---- */
  const ST = {
    listCompact: 'display:flex;flex-wrap:wrap;gap:4px;align-items:center',
    listNormal:  'display:flex;flex-direction:column;gap:5px',
    mini: 'display:inline-flex;align-items:center;gap:5px;padding:3px 7px 3px 5px;'
        + 'background:var(--panel-deep);border-radius:3px;font-size:10px;line-height:1;'
        + 'white-space:nowrap;border:.5px solid var(--line-soft,rgba(0,0,0,.06))',
    miniDot: 'width:11px;height:11px;border-radius:50%;flex-shrink:0;display:inline-block;'
        + 'border:.5px solid rgba(0,0,0,.14)',
    miniTxt: "font-family:'SF Mono',ui-monospace,monospace;font-weight:400;font-size:9.5px;"
        + 'color:var(--ink-soft);letter-spacing:.01em',
    row: 'display:flex;align-items:center;gap:9px;padding:4px 8px;background:var(--panel-deep);'
        + 'border-radius:3px;font-size:11.5px',
    rowDot: 'width:14px;height:14px;border-radius:50%;flex-shrink:0;display:inline-block;'
        + 'border:.5px solid rgba(0,0,0,.1)',
    rowNum: "margin-left:auto;font-family:'SF Mono',ui-monospace,monospace;font-size:10px;color:var(--ink-soft)"
  };

  let colorChips;
  if (compact) {
    const items = [];
    for (let i = 0; i < total; i++) {
      const hx = (d.hex_colors && d.hex_colors[i]) || '';
      const nm = (d.colors && d.colors[i]) || '';
      const si = shotOf[i];
      const clickable = si !== undefined;
      items.push(`<span ${clickable ? `data-shot="${si}"` : ''}
        title="${esc(nm || hx)}${clickable ? ' · 클릭하면 이 컬러 사진' : ''}"
        style="${ST.mini}${clickable ? ';cursor:pointer' : ''}">
        ${hx ? `<i style="${ST.miniDot};background:${esc(hx)}"></i>` : ''}<b style="${ST.miniTxt}">${esc(hx || nm)}</b></span>`);
    }
    colorChips = items.join("");
  } else if (paired) {
    colorChips = d.colors.map((c, i) => {
      const hx = d.hex_colors[i];
      const si = shotOf[i];
      const clickable = si !== undefined;
      return `<div ${clickable ? `data-shot="${si}"` : ''}
        style="${ST.row}${clickable ? ';cursor:pointer' : ''}"
        title="${clickable ? '클릭하면 이 컬러 사진' : ''}">
        <i style="${ST.rowDot};background:${esc(hx)}"></i>
        <span>${esc(c)}</span><span style="${ST.rowNum}">${esc(hx)}</span></div>`;
    }).join("");
  } else if (hN > 0) {
    colorChips = d.hex_colors.map(hx =>
      `<div style="${ST.row}"><i style="${ST.rowDot};background:${esc(hx)}"></i>
        <span style="${ST.rowNum}">${esc(hx)}</span></div>`).join("");
  } else if (cN > 0) {
    colorChips = d.colors.map(c =>
      `<div style="${ST.row}"><span>${esc(c)}</span></div>`).join("");
  } else {
    colorChips = '<div style="font-size:11px;color:var(--ink-soft)">컬러 정보 없음</div>';
  }

  const fabricDisplay = d.fabric
    ? `${esc(d.fabric)}${d.fabricKey ? ' <span style="color:var(--ink-soft);font-size:10px">· ' + esc(fabricLabel(d.fabricKey)) + '</span>' : ''}`
    : '—';

  const hasShot = MODAL_SHOTS.length > 0;
  const hexes = (d.hex_colors || []).slice(0, 9);

  const noImgContent = `<div class="modal-color-wrap">
      ${hexes.length
        ? hexes.map(h => `<div class="modal-color-block" style="background:${esc(h)}"><span>${esc(h)}</span></div>`).join("")
        : '<div class="color-card-empty">컬러 정보만 있음</div>'}
    </div>`;

  $("#modalbox").innerHTML = `
    <div class="mimg ${hasShot ? '' : 'no-img'}" id="mimgBox"
         style="position:relative;min-width:0;overflow:hidden;align-self:stretch">
      ${hasShot ? '' : noImgContent}
    </div>
    <div class="mbody" style="min-width:0;overflow-x:hidden">
      <button class="mclose">&times;</button>
      <div class="mbrand">${esc(d.brand)} · ${esc(d.gender)}</div>
      <h3 style="overflow-wrap:anywhere">${esc(d.product_name)}</h3>
      <div class="mrow"><span class="k">Country</span><span class="v">${esc(countryLabel(d.country || 'GL'))}</span></div>
      <div class="mrow"><span class="k">Group</span><span class="v">${esc(d.brandGroup || '—')}</span></div>
      <div class="mrow"><span class="k">Season</span><span class="v">${esc(monthLabel(d.season) || '—')}</span></div>
      <div class="mrow"><span class="k">Category</span><span class="v">${esc(d.category)}</span></div>
      <div class="mrow"><span class="k">Subcategory</span><span class="v">${esc(d.subcategory || '—')}</span></div>
      <div class="mrow"><span class="k">Sheet Row</span><span class="v" style="overflow-wrap:anywhere">${esc(d._sheetLabel || '—')} ${esc(sheetRowText(d))}</span></div>
      ${d._colorwayCount > 1 ? `<div class="mrow"><span class="k">Colorways</span><span class="v">${d._colorwayCount}종${MODAL_SHOTS.length > 1 ? ` <span style="color:var(--ink-soft);font-size:10.5px">· 사진 ${MODAL_SHOTS.length}장</span>` : ''}</span></div>` : ''}
      <div class="mrow"><span class="k">Fabric</span><span class="v" style="overflow-wrap:anywhere">${fabricDisplay}</span></div>
      <div style="font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-soft);margin:16px 0 6px">Colors${total ? ` <span style="color:var(--ink);font-weight:600">${total}</span>` : ''}</div>
      <div style="${compact ? ST.listCompact : ST.listNormal}">${colorChips}</div>
      ${hasShot ? `<div style="margin-top:18px"><a id="mOrigLink" href="${esc(MODAL_SHOTS[0].url)}" target="_blank"
        style="font-size:11px;color:var(--accent);letter-spacing:.05em">원본 이미지 열기 ↗</a></div>` : ''}
    </div>`;

  // 그리드 컬럼 + 이미지 높이를 JS로 고정
  //  - 컬럼: 이미지 원본 크기가 컬럼을 밀어내지 못하게 minmax(0,1fr)
  //  - 높이: 정보 패널이 길어져도 이미지가 행 높이를 꽉 채우도록 (아래 여백 제거)
  const box  = $("#modalbox");
  const mbox = $("#mimgBox");
  const narrow = window.innerWidth <= 1040;
  if (box) {
    box.style.display = 'grid';
    box.style.gridTemplateColumns = narrow ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)';
    box.style.alignItems = 'stretch';
    // 정보가 짧을 때 이미지가 납작해지지 않도록 최소 높이 확보
    box.style.minHeight = narrow ? '' : 'min(74vh, 560px)';
  }
  if (mbox) {
    if (narrow) {
      mbox.style.aspectRatio = '16 / 10';   // 세로 1단일 때는 가로형으로
      mbox.style.height = '';
    } else {
      mbox.style.aspectRatio = 'auto';      // 정사각 고정 해제
      mbox.style.height = '100%';           // 행 높이를 꽉 채움
    }
  }

  if (hasShot) renderModalShot();

  // 컬러 칩 클릭 -> 해당 컬러 사진으로
  $$("#modalbox [data-shot]").forEach(el => el.onclick = e => {
    e.stopPropagation();
    MODAL_POS = +el.dataset.shot;
    renderModalShot();
  });

  $("#modal").classList.add("open");
  $("#modalbox .mclose").onclick = () => $("#modal").classList.remove("open");
}

/* 제거된 제품 목록 모달 */
function openRemovedModal() {
  const items = RETAIL_DATA.filter(d => removed.has(d._id));
  const list = items.map(d => `
    <div class="rm-item">
      <div class="rm-thumb">
        <div class="rm-ph">IMG</div>
        <img src="${esc(proxyImage(d.image_url))}"
             referrerpolicy="no-referrer"
             data-orig="${esc(d.image_url)}" data-tried="0"
             onload="this.previousElementSibling.style.display='none'"
             onerror="imgFallback(this, this.dataset.orig)">
      </div>
      <div class="rm-info">
        <div class="rm-name">${esc(d.product_name)}</div>
        <div class="rm-meta">${esc(d.brand)} · ${esc(d.gender)} · ${esc(d.category)}${d.subcategory && d.subcategory!=='—' ?' · '+esc(d.subcategory):''}</div>
      </div>
      <button class="rm-restore" data-restore="${d._id}">복원</button>
    </div>`).join("");

  $("#modalbox").innerHTML = `
    <div class="rm-panel">
      <button class="mclose">&times;</button>
      <h3 class="rm-title">제외된 제품 ${items.length}개</h3>
      <p class="rm-sub">복원할 제품의 '복원' 버튼을 누르면 갤러리·분석·CSV에 다시 포함됩니다.</p>
      <div class="rm-list">${list || '<div style="color:var(--ink-soft);font-size:13px;padding:20px 0">제외된 제품이 없습니다.</div>'}</div>
    </div>`;
  $("#modal").classList.add("open");
  $("#modalbox .mclose").onclick = () => $("#modal").classList.remove("open");
  $$("#modalbox .rm-restore").forEach(b => b.onclick = () => {
    removed.delete(b.dataset.restore);
    if (removed.size) openRemovedModal();
    else $("#modal").classList.remove("open");
    render();
  });
}
