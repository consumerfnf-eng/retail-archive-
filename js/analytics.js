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

function fabricHeatmap(data) {
  // fabric 데이터가 있는지 체크
  const hasFabric = data.some(d => d.fabricKey);
  if (!hasFabric) {
    return `<div class="fabric-info" style="text-align:center;padding:30px 20px">
      <div style="font-size:14px;color:var(--ink);margin-bottom:6px;font-weight:600">⚙ Fabric 데이터 대기 중</div>
      <div style="line-height:1.6">아직 Google Sheets에 fabric 컬럼이 비어있습니다.<br>
      시트 <b style="color:var(--ink)">J열</b>에 소재 정보를 입력하면 자동으로 히트맵이 표시됩니다.<br>
      <span style="font-size:10.5px;opacity:0.8;display:inline-block;margin-top:8px">
        지원 키워드: cotton 100, cotton blend, denim, polyester, nylon, wool, cashmere, silk, modal, tencel, leather, suede, faux fur, sherpa, down 등
      </span></div>
    </div>`;
  }

  // 카테고리 × Fabric 매트릭스 만들기
  const cats = uniq(data.map(d => d.category || "—")).filter(c => c !== "—");
  // 카테고리 정렬
  const catOrder = ["outerwear","top","bottom","dress","shoe","bag","acc"];
  cats.sort((a,b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  // 실제 사용된 fabric 카테고리만 (데이터가 있는 것)
  const usedFabrics = new Set();
  data.forEach(d => { if (d.fabricKey) usedFabrics.add(d.fabricKey); });
  const fabrics = FABRIC_CATEGORIES.filter(f => usedFabrics.has(f.key));

  // 매트릭스 카운트
  const matrix = {}; // matrix[cat][fabKey] = count
  const catTotals = {}; // 카테고리별 (fabric 분류된 것만) 총합
  cats.forEach(c => {
    matrix[c] = {};
    catTotals[c] = 0;
    fabrics.forEach(f => {
      matrix[c][f.key] = data.filter(d =>
        d.category === c && d.fabricKey === f.key
      ).length;
      catTotals[c] += matrix[c][f.key];
    });
  });

  // 그리드 컬럼 정의: 첫 칼럼은 카테고리 라벨, 나머지는 fabric
  const colCount = fabrics.length;
  const gridCols = `120px repeat(${colCount}, minmax(64px, 1fr))`;

  // 헤더
  const headerCells = fabrics.map(f =>
    `<div class="heatmap-colhead" style="color:${f.color}">${f.short.replace('\n','<br>')}</div>`
  ).join("");

  // 본문 행
  const rows = cats.map(cat => {
    const cells = fabrics.map(f => {
      const count = matrix[cat][f.key];
      const total = catTotals[cat];
      const pct = total > 0 ? (count / total * 100) : 0;

      if (count === 0) {
        return `<div class="heatmap-cell empty">·</div>`;
      }

      const isActive = state.drillDown &&
        state.drillDown.category === cat &&
        state.drillDown.fabric === f.key;
      const bg = heatColor(pct, f.color);
      const textColor = pct > 35 ? '#fff' : '#3d3d3a';

      return `<div class="heatmap-cell ${isActive?'active':''}"
        data-cat="${esc(cat)}" data-fab="${esc(f.key)}"
        style="background:${bg};color:${textColor}"
        title="${esc(cat)} × ${esc(f.label)}: ${count}개 (${pct.toFixed(1)}%)">
        <div>
          <div class="cell-pct">${pct.toFixed(0)}%</div>
          <div class="cell-n">${count}</div>
        </div>
      </div>`;
    }).join("");

    return `<div class="heatmap-row" style="grid-template-columns:${gridCols}">
      <div class="heatmap-rowhead">${esc(cat)}<br><span style="font-size:9.5px;color:var(--ink-soft);font-weight:400">${catTotals[cat]}개</span></div>
      ${cells}
    </div>`;
  }).join("");

  // 분류 안 된 제품 개수 (정보용)
  const unclassified = data.filter(d => !d.fabricKey).length;
  const noteHTML = unclassified > 0
    ? `<div class="fabric-info">📋 ${unclassified}개 제품은 fabric 미분류 상태 (히트맵에서 제외됨)</div>`
    : '';

  return `<div class="heatmap-wrap">
    <div class="heatmap">
      <div class="heatmap-head" style="display:grid;grid-template-columns:${gridCols}">
        <div class="heatmap-corner">Category ↓ / Fabric →</div>
        ${headerCells}
      </div>
      ${rows}
    </div>
  </div>
  <div class="heatmap-legend">
    <span>각 셀: 해당 카테고리 내 fabric 비중 (%) · 클릭하면 상세 분석</span>
    <span class="legend-scale">
      <span>0%</span>
      <span class="legend-scale-bar"></span>
      <span>50%+</span>
    </span>
  </div>
  ${noteHTML}`;
}

/* ============================================
   드릴다운 패널 (카테고리 × Fabric 셀 클릭 시)
   ============================================ */
function drillDownPanel(data) {
  if (!state.drillDown) return '';
  const {category, fabric} = state.drillDown;
  const fabLabel = fabricLabel(fabric);
  const fabColor = fabricColor(fabric);

  // 해당 셀의 제품들
  const items = data.filter(d => d.category === category && d.fabricKey === fabric);
  if (!items.length) {
    state.drillDown = null;
    return '';
  }

  // 브랜드별 분포 (도트 매트릭스용)
  const byBrand = {};
  items.forEach(d => {
    byBrand[d.brand] = (byBrand[d.brand] || 0) + 1;
  });
  const brandRows = Object.entries(byBrand)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 12); // 상위 12개

  const maxBrandCount = Math.max(...brandRows.map(r => r[1]));

  const brandDots = brandRows.map(([brand, count]) => {
    const dots = Array(count).fill(0).map(() =>
      `<span class="dm-dot" style="background:${fabColor}"></span>`
    ).join("");
    return `<div class="dm-label">${esc(brand)}</div>
      <div class="dm-cell">${dots}<span style="margin-left:6px;color:var(--ink-soft);font-size:10px">${count}</span></div>`;
  }).join("");

  // 컬러 분포
  const families = colorFamilyDist(items);

  return `<div class="drill-panel">
    <div class="drill-head">
      <div>
        <div class="drill-title"><b>${esc(category)}</b> × <span style="color:${fabColor}">${esc(fabLabel)}</span></div>
        <div class="drill-meta">${items.length}개 제품 · ${brandRows.length}개 브랜드</div>
      </div>
      <button class="drill-close" id="drillClose">×</button>
    </div>
    <div class="drill-grid">
      <div class="drill-section">
        <h5>① 브랜드별 분포 (도트 = 제품 1개)</h5>
        <div class="dotmatrix" style="grid-template-columns:auto 1fr">
          ${brandDots}
        </div>
      </div>
      <div class="drill-section">
        <h5>② 색상 분포</h5>
        ${donutChart(families.slice(0, 8))}
      </div>
    </div>
  </div>`;
}

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

    <div class="sec-label">Fabric × Category Heatmap · 소재 분포도</div>
    <div class="card full" style="margin-bottom:24px">
      <h4>③ Fabric Distribution · 카테고리별 소재 비중 (셀 클릭 → 상세)</h4>
      ${fabricHeatmap(data)}
      ${drillDownPanel(data)}
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
  // 히트맵 셀 클릭
  $$(".heatmap-cell[data-cat]").forEach(cell => {
    cell.onclick = () => {
      const cat = cell.dataset.cat;
      const fab = cell.dataset.fab;
      // 같은 셀 재클릭 = 닫기
      if (state.drillDown &&
          state.drillDown.category === cat &&
          state.drillDown.fabric === fab) {
        state.drillDown = null;
      } else {
        state.drillDown = {category: cat, fabric: fab};
      }
      renderContent();
      // 드릴다운 패널로 스크롤
      setTimeout(() => {
        const panel = document.querySelector('.drill-panel');
        if (panel) panel.scrollIntoView({behavior:'smooth', block:'nearest'});
      }, 100);
    };
  });

  // 드릴다운 닫기
  const closeBtn = $("#drillClose");
  if (closeBtn) {
    closeBtn.onclick = () => {
      state.drillDown = null;
      renderContent();
    };
  }
}
