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
  const head = ["season","brand_group","brand","gender","category","subcategory","fabric","fabric_group","product_name",
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
  const head = ["season","brand_group","brand","gender","category","subcategory","fabric","fabric_group","product_name",
                "colors","hex_colors","top_hex","image_url"];
  const rows = [head];
  data.forEach(d => {
    const top = (d.hex_colors && d.hex_colors[0])
      ? d.hex_colors[0]
      : ((d.hex_breakdown && d.hex_breakdown[0]) ? d.hex_breakdown[0].hex : "");
    rows.push([
      d.season || '',
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
