/* ============================================
   F&F Retail Archive - Analytics View
   색상 분석, 카테고리 비중, Fabric 히트맵 (with drill-down)
   ============================================ */

function countBy(data, key) {
  const m = {};
  data.forEach(d => {
    const v = d[key] || "—";
    m[v] = (m[v] || 0) + 1;
  });
  return Object.entries(m)
    .map(([name, count]) => ({name, count}))
    .sort((a,b) => b.count - a.count);
}

function colorAnalysis(data) {
  const acc = {};
  data.forEach(d => {
    if (d.hex_breakdown && d.hex_breakdown.length)
      d.hex_breakdown.forEach(h => acc[h.hex] = (acc[h.hex]||0) + h.pct);
    else if (d.hex_colors)
      d.hex_colors.forEach(h => acc[h] = (acc[h]||0) + 50);
  });
  const total = Object.values(acc).reduce((s,v) => s + v, 0) || 1;
  return Object.entries(acc)
    .map(([hex, w]) => ({hex, pct: w / total * 100}))
    .sort((a,b) => b.pct - a.pct);
}

function colorFamilyDist(data) {
  const acc = {};
  data.forEach(d => {
    const src = (d.hex_breakdown && d.hex_breakdown.length)
      ? d.hex_breakdown
      : (d.hex_colors || []).map(h => ({hex:h, pct:50}));
    src.forEach(h => {
      const f = colorFamily(h.hex);
      if (!acc[f.name]) acc[f.name] = {name: f.name, rep: f.rep, w: 0};
      acc[f.name].w += h.pct;
    });
  });
  const total = Object.values(acc).reduce((s,v) => s + v.w, 0) || 1;
  return Object.values(acc)
    .map(v => ({name: v.name, rep: v.rep, pct: v.w / total * 100}))
    .sort((a,b) => b.pct - a.pct);
}

/* SVG 도넛 차트 */
function donutChart(items) {
  if (!items.length) return '<div style="font-size:12px;color:var(--ink-soft)">데이터 없음</div>';
  const R = 78, r = 46, cx = 92, cy = 92;
  const C = 2 * Math.PI * ((R+r)/2);
  const sw = R - r;
  let off = 0, segs = "";
  items.forEach(it => {
    const len = C * it.pct / 100;
    segs += `<circle cx="${cx}" cy="${cy}" r="${(R+r)/2}" fill="none"
      stroke="${esc(it.rep)}" stroke-width="${sw}"
      stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}"
      transform="rotate(-90 ${cx} ${cy})"><title>${esc(it.name)} ${it.pct.toFixed(1)}%</title></circle>`;
    off += len;
  });
  const legend = items.map(it => `
    <div class="legrow">
      <span class="legdot" style="background:${esc(it.rep)}"></span>
      <span class="legname">${esc(it.name)}</span>
      <span class="legpct">${it.pct.toFixed(1)}%</span>
    </div>`).join("");
  return `<div class="donutwrap">
    <svg class="donut" viewBox="0 0 184 184" width="184" height="184">${segs}
      <text x="${cx}" y="${cy-4}" text-anchor="middle" class="donutc-n">${items.length}</text>
      <text x="${cx}" y="${cy+13}" text-anchor="middle" class="donutc-l">색계열</text>
    </svg>
    <div class="legend">${legend}</div>
  </div>`;
}

/* 백분율 막대 */
function pctBarChart(rows) {
  const total = rows.reduce((s,r) => s + r.count, 0);
  if (!rows.length) return '<div style="font-size:12px;color:var(--ink-soft)">데이터 없음</div>';
  const max = Math.max(...rows.map(r => r.count));
  return rows.map(r => {
    const pct = total ? (r.count / total * 100) : 0;
    const w = max ? (r.count / max * 100) : 0;
    return `<div class="barrow">
      <div class="bartop"><span class="bname">${esc(r.name)}</span>
      <span class="bval"><b>${pct.toFixed(1)}%</b> · ${r.count}</span></div>
      <div class="bartrack"><div class="barfill" style="width:${w}%"></div></div>
    </div>`;
  }).join("");
}

/* ============================================
   ★ Fabric 히트맵 (카테고리 × Fabric)
   ============================================ */

/* ============================================
   Fabric Bubble Matrix
   세로축: 대표 소재 (12개 분류)
   가로축: 각 대표소재로 분류된 실제 fabric 텍스트들의 버블 (크기=갯수)
   카테고리 드롭다운으로 필터링
   ============================================ */
function fabricBubbleMatrix(data) {
  // fabric 데이터 있는지 체크
  const hasFabric = data.some(d => d.fabricKey);
  if (!hasFabric) {
    return `<div class="fabric-info" style="text-align:center;padding:30px 20px">
      <div style="font-size:14px;color:var(--ink);margin-bottom:6px;font-weight:600">⚙ Fabric 데이터 대기 중</div>
      <div style="line-height:1.6">아직 Google Sheets에 fabric 컬럼이 비어있습니다.<br>
      시트 fabric/material 컬럼에 소재 정보를 입력하면 자동으로 분석이 표시됩니다.<br>
      <span style="font-size:10.5px;opacity:0.8;display:inline-block;margin-top:8px">
        지원 키워드: cotton 100, cotton blend, denim, polyester, nylon, wool, cashmere, silk, modal, tencel, leather, suede, faux fur, sherpa, down 등
      </span></div>
    </div>`;
  }

  // 카테고리 드롭다운 옵션 (전체 + 실제 사용된 카테고리들)
  const allCats = uniq(data.map(d => d.category || "—")).filter(c => c !== "—");
  const catOrder = ["outerwear","top","bottom","dress","shoe","shoes","bag","acc"];
  allCats.sort((a,b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  // 선택된 카테고리로 필터링
  const selectedCat = state.fabricCategoryView || "all";
  const filteredData = selectedCat === "all"
    ? data
    : data.filter(d => d.category === selectedCat);

  // 카테고리별 카운트 (드롭다운 옵션에 표시용)
  const catCounts = {};
  data.forEach(d => {
    const c = d.category || "—";
    catCounts[c] = (catCounts[c] || 0) + 1;
  });

  // 드롭다운 옵션
  const dropdownOpts = [
    `<option value="all" ${selectedCat === "all" ? "selected" : ""}>전체 (${data.length}개)</option>`,
    ...allCats.map(c =>
      `<option value="${esc(c)}" ${selectedCat === c ? "selected" : ""}>${esc(c)} (${catCounts[c] || 0}개)</option>`
    )
  ].join("");

  // 각 대표소재(fabricKey)별로, 그 안에 어떤 실제 fabric 텍스트가 들어있는지 집계
  // matrix[fabricKey] = { 'fabricText1': count1, 'fabricText2': count2, ... }
  const matrix = {};
  filteredData.forEach(d => {
    if (!d.fabricKey) return;
    const fk = d.fabricKey;
    const fabText = (d.fabric || "").trim() || "(빈값)";
    if (!matrix[fk]) matrix[fk] = {};
    matrix[fk][fabText] = (matrix[fk][fabText] || 0) + 1;
  });

  // 대표소재 정렬 (FABRIC_CATEGORIES 순서 따라가되, 실제 데이터 있는 것만)
  const activeFabrics = FABRIC_CATEGORIES.filter(f => matrix[f.key]);

  // 각 대표소재별 총 카운트
  const fabricTotals = {};
  activeFabrics.forEach(f => {
    fabricTotals[f.key] = Object.values(matrix[f.key]).reduce((s, c) => s + c, 0);
  });

  // 최대 버블 크기 결정용 (전체 fabric 중 최대 카운트)
  let maxCount = 0;
  activeFabrics.forEach(f => {
    Object.values(matrix[f.key]).forEach(c => {
      if (c > maxCount) maxCount = c;
    });
  });

  // 버블 크기 계산: sqrt 스케일 (면적 비례)
  const minR = 10, maxR = 36;
  const calcR = (count) => {
    if (maxCount === 0) return minR;
    const ratio = Math.sqrt(count / maxCount);
    return minR + (maxR - minR) * ratio;
  };

  // 행 렌더링
  const rows = activeFabrics.map(f => {
    const items = Object.entries(matrix[f.key])
      .sort((a, b) => b[1] - a[1]); // 카운트 내림차순

    const total = fabricTotals[f.key];
    const bubbles = items.map(([fabText, count]) => {
      const r = calcR(count);
      const pct = (count / total * 100).toFixed(0);
      // 텍스트 짧으면 버블 안에 카운트, 길면 옆에 라벨
      return `<div class="fab-bubble-item" title="${esc(fabText)}: ${count}개 (전체의 ${pct}%)">
        <div class="fab-bubble" style="width:${r*2}px;height:${r*2}px;background:${f.color}">
          <span class="fab-bubble-n">${count}</span>
        </div>
        <div class="fab-bubble-label">${esc(fabText.length > 30 ? fabText.slice(0,30) + '…' : fabText)}</div>
      </div>`;
    }).join("");

    const variantCount = items.length;

    return `<div class="fab-row">
      <div class="fab-row-head">
        <div class="fab-row-color" style="background:${f.color}"></div>
        <div class="fab-row-info">
          <div class="fab-row-name">${esc(f.label)}</div>
          <div class="fab-row-meta">${total}개 · ${variantCount}종</div>
        </div>
      </div>
      <div class="fab-row-body">${bubbles}</div>
    </div>`;
  }).join("");

  // 분류 안 된 제품 개수
  const unclassified = filteredData.filter(d => !d.fabricKey).length;
  const noteHTML = unclassified > 0
    ? `<div class="fabric-info" style="margin-top:10px">📋 ${unclassified}개 제품은 fabric 미분류 (분석에서 제외)</div>`
    : '';

  // 빈 상태
  const bodyHTML = activeFabrics.length === 0
    ? `<div style="text-align:center;padding:40px;color:var(--ink-soft);font-size:12.5px">
        선택한 카테고리에 fabric 데이터가 없습니다.
      </div>`
    : `<div class="fab-matrix">${rows}</div>`;

  return `<div class="fab-controls">
    <label class="fab-dropdown-wrap">
      <span class="fab-dropdown-label">카테고리:</span>
      <select id="fabricCategorySelect" class="fab-dropdown">${dropdownOpts}</select>
    </label>
    <div class="fab-legend">
      <span style="color:var(--ink-soft);font-size:11px">버블 크기 = 해당 소재 표현의 제품 수</span>
    </div>
  </div>
  ${bodyHTML}
  ${noteHTML}`;
}

/* ============================================
   드릴다운 패널 (카테고리 × Fabric 셀 클릭 시)
   ============================================ */
/* ============================================
   메인 분석 화면
   ============================================ */
function renderAnalytics(data) {
  if (!data.length) return '<div class="empty">분석할 데이터가 없습니다.</div>';

  const colors = colorAnalysis(data);
  const families = colorFamilyDist(data);

  return `
    <div class="sec-label">Assortment Overview · 어소트먼트 분석</div>
    <div class="analytics">
      <div class="card"><h4>① Color Assortment · 색상 비중</h4>
        ${donutChart(families)}</div>
      <div class="card"><h4>② Category Assortment · 카테고리 비중 (%)</h4>
        ${pctBarChart(countBy(data, "category"))}</div>
    </div>

    <div class="sec-label">Fabric Composition · 소재 구성 분석</div>
    <div class="card full" style="margin-bottom:24px">
      <h4>③ Fabric Distribution · 대표 소재별 실제 표현 분포</h4>
      ${fabricBubbleMatrix(data)}
    </div>

    <div class="sec-label">Detail Breakdown · 세부 분석</div>
    <div class="analytics">
      <div class="card full"><h4>Color Spectrum · 전체 색상 스펙트럼 (상위 ${Math.min(colors.length,16)})</h4>
        <div class="spectrum">${colors.map(c =>
          `<span style="width:${c.pct}%;background:${esc(c.hex)}" title="${esc(c.hex)} ${c.pct.toFixed(1)}%"></span>`).join("")}</div>
        <div class="swatchwrap">${colors.slice(0,16).map(c => `
          <div class="swatch">
            <div class="chipc" style="background:${esc(c.hex)}"></div>
            <div class="cpct">${c.pct.toFixed(1)}%</div>
            <div class="chex">${esc(c.hex)}</div>
          </div>`).join("")}</div>
      </div>
      <div class="card"><h4>Brand Assortment · 브랜드 비중 (%)</h4>
        ${pctBarChart(countBy(data, "brand"))}</div>
      <div class="card"><h4>Subcategory Assortment · 세부 비중 (%)</h4>
        ${pctBarChart(countBy(data, "subcategory"))}</div>
    </div>`;
}

/* 분석 화면 이벤트 바인딩 */
function bindAnalyticsEvents(data) {
  // 카테고리 드롭다운 변경
  const sel = $("#fabricCategorySelect");
  if (sel) {
    sel.onchange = () => {
      state.fabricCategoryView = sel.value;
      renderContent();
    };
  }
}
