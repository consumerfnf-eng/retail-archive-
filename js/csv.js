/* ============================================
   F&F Retail Archive - CSV Export
   ============================================ */

function download(filename, rows) {
  const csv = rows.map(r => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(filename + " 저장됨 (" + (rows.length - 1) + "행)");
}

function colorRows(data) {
  const head = ["season","country","brand_group","brand","gender","category","subcategory","fabric","fabric_group","product_name",
                "color_names","hex_codes","color_count","pct_in_image","image_url"];
  const rows = [head];
  data.forEach(d => {
    const hc = d.hex_colors || [];
    const cn = d.colors || [];
    let names = [], hexes = [], pcts = [];
    if (hc.length) {
      const matched = cn.length === hc.length;
      hexes = hc.slice();
      names = matched ? cn.slice() : hc.map(() => "");
      pcts = hc.map(() => "");
    } else if (cn.length) {
      names = cn.slice();
      hexes = cn.map(() => "");
      pcts = cn.map(() => "");
    } else if (d.hex_breakdown && d.hex_breakdown.length) {
      hexes = d.hex_breakdown.map(h => h.hex);
      names = d.hex_breakdown.map(() => "");
      pcts = d.hex_breakdown.map(h => h.pct);
    }
    const count = Math.max(hexes.length, names.filter(Boolean).length);
    rows.push([
      d.season || '',
      d.country || 'GL',
      d.brandGroup || '',
      d.brand,
      d.gender,
      d.category,
      d.subcategory,
      d.fabric || '',
      d.fabricKey ? fabricLabel(d.fabricKey) : '',
      d.product_name,
      names.join(" | "),
      hexes.join(" | "),
      count,
      pcts.join(" | "),
      d.image_url
    ]);
  });
  return rows;
}

function productRows(data) {
  const head = ["season","country","brand_group","brand","gender","category","subcategory","fabric","fabric_group","product_name",
                "colors","hex_colors","top_hex","image_url"];
  const rows = [head];
  data.forEach(d => {
    const top = (d.hex_colors && d.hex_colors[0])
      ? d.hex_colors[0]
      : ((d.hex_breakdown && d.hex_breakdown[0]) ? d.hex_breakdown[0].hex : "");
    rows.push([
      d.season || '',
      d.country || 'GL',
      d.brandGroup || '',
      d.brand,
      d.gender,
      d.category,
      d.subcategory,
      d.fabric || '',
      d.fabricKey ? fabricLabel(d.fabricKey) : '',
      d.product_name,
      (d.colors || []).join(" | "),
      (d.hex_colors || []).join(" | "),
      top,
      d.image_url
    ]);
  });
  return rows;
}

/* ============================================
   Fabric CSV - 대표 소재별 실제 표현 분포
   현재 분석화면의 카테고리 필터 적용
   ============================================ */
function fabricDetailRows(data, selectedCategory) {
  const head = ["category_filter","fabric_group","fabric_group_color","fabric_text","product_count","pct_within_group","pct_total"];
  const rows = [head];

  // 카테고리 필터 적용
  const filtered = (selectedCategory && selectedCategory !== "all")
    ? data.filter(d => d.category === selectedCategory)
    : data;

  // 분류된 제품만
  const classified = filtered.filter(d => d.fabricKey);
  const grandTotal = classified.length;

  if (grandTotal === 0) {
    rows.push([selectedCategory || "all", "(no data)", "", "", 0, "", ""]);
    return rows;
  }

  // fabricKey × fabricText 집계
  const matrix = {};
  classified.forEach(d => {
    const fk = d.fabricKey;
    const ft = (d.fabric || "").trim() || "(empty)";
    if (!matrix[fk]) matrix[fk] = {};
    matrix[fk][ft] = (matrix[fk][ft] || 0) + 1;
  });

  // FABRIC_CATEGORIES 순서대로 정렬
  FABRIC_CATEGORIES.forEach(f => {
    if (!matrix[f.key]) return;
    const groupTotal = Object.values(matrix[f.key]).reduce((s, c) => s + c, 0);
    const items = Object.entries(matrix[f.key])
      .sort((a, b) => b[1] - a[1]);
    items.forEach(([ft, count]) => {
      rows.push([
        selectedCategory || "all",
        f.label,
        f.color,
        ft,
        count,
        (count / groupTotal * 100).toFixed(2) + "%",
        (count / grandTotal * 100).toFixed(2) + "%"
      ]);
    });
  });

  return rows;
}

/* ============================================
   Fabric CSV - 카테고리 × 대표소재 매트릭스
   (전체 카테고리, 분석용 피벗 데이터)
   ============================================ */
function fabricMatrixRows(data) {
  const filtered = data.filter(d => d.fabricKey);

  // 모든 카테고리
  const allCats = uniq(filtered.map(d => d.category || "—")).filter(c => c !== "—");
  const catOrder = ["outerwear","top","bottom","dress","shoe","shoes","bag","acc"];
  allCats.sort((a, b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  // 헤더: fabric_group, 각 카테고리별 컬럼, 총합
  const head = ["fabric_group", ...allCats, "total"];
  const rows = [head];

  // 카테고리별 총합 (마지막 행용)
  const catTotals = {};
  allCats.forEach(c => catTotals[c] = 0);

  // 각 fabricKey별 행 생성
  FABRIC_CATEGORIES.forEach(f => {
    const counts = filtered.filter(d => d.fabricKey === f.key);
    if (counts.length === 0) return;

    const row = [f.label];
    let groupTotal = 0;
    allCats.forEach(c => {
      const n = counts.filter(d => d.category === c).length;
      row.push(n);
      groupTotal += n;
      catTotals[c] += n;
    });
    row.push(groupTotal);
    rows.push(row);
  });

  // 합계 행
  const totalRow = ["TOTAL"];
  let grandTotal = 0;
  allCats.forEach(c => {
    totalRow.push(catTotals[c]);
    grandTotal += catTotals[c];
  });
  totalRow.push(grandTotal);
  rows.push(totalRow);

  return rows;
}
