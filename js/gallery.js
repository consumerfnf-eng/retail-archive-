/* ============================================
   F&F Retail Archive - Gallery View
   갤러리 카드 그리드 + 모달 + 제거된 제품 복원
   ============================================ */

function renderGallery(data) {
  if (!data.length) return '<div class="empty">선택한 조건에 맞는 제품이 없습니다.</div>';

  const totalPages = Math.ceil(data.length / CONFIG.PAGE_SIZE);
  if (state.page > totalPages) state.page = 1;
  const start = (state.page - 1) * CONFIG.PAGE_SIZE;
  const pageData = data.slice(start, start + CONFIG.PAGE_SIZE);

  const cards = pageData.map((d, i) => {
    const gi = start + i;
    const hasImage = d.image_url && d.image_url.trim();
    const hexes = (d.hex_colors || []).slice(0, 6);

    // 이미지 없을 때: 컬러 블록 그리드로 표시
    const imgContent = hasImage
      ? `<div class="imgph">${PH_SVG}<span>${esc(d.product_name)}</span></div>
         <img src="${esc(proxyImage(d.image_url))}" alt="${esc(d.product_name)}" loading="lazy"
              referrerpolicy="no-referrer"
              onload="this.previousElementSibling.style.display='none'"
              onerror="this.style.display='none'">`
      : `<div class="color-card-wrap">
           ${hexes.length ? hexes.map(h => `<div class="color-card-block" style="background:${esc(h)}"></div>`).join("") : `<div class="color-card-empty">${esc(d.product_name)}</div>`}
         </div>`;

    return `<div class="pcard" data-idx="${gi}">
      <div class="imgbox ${hasImage ? '' : 'no-img'}">
        <span class="mtag">${monthLabel(d.month)}</span>
        ${d.country && d.country !== 'GL' ? `<span class="ctag">${esc(d.country)}</span>` : ''}
        <button class="card-x" data-rm="${d._id}" title="잘못 분류된 제품 — 제거">×</button>
        ${imgContent}
      </div>
      <div class="pinfo">
        <div class="pbrand">${esc(d.brand)} · ${esc(d.gender)}</div>
        <div class="pname">${esc(d.product_name)}</div>
        <div class="pcat">${esc(d.category)}${d.subcategory && d.subcategory!=='—' ? ' · ' + esc(d.subcategory) : ''}</div>
        <div class="pcolors">${(d.hex_colors || []).slice(0,7).map(h =>
          `<span class="dot" style="background:${esc(h)}"></span>`).join("")}</div>
      </div>
    </div>`;
  }).join("");

  const restoreBar = removed.size
    ? `<div class="restore-bar">
         <span>제외된 제품 ${removed.size}개 (갤러리·분석·CSV에서 빠짐)</span>
         <button id="viewRemoved">목록 보기 · 선택 복원</button>
         <button id="restoreAll">전체 복원</button>
       </div>`
    : '';

  return `${restoreBar}
    <div class="gal-head">
      <h3>Products</h3>
      <span class="gmeta">${data.length} items · ${state.page} / ${totalPages} page</span>
    </div>
    <div class="gallery">${cards}</div>
    ${pager(totalPages)}`;
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

function openModal(d) {
  const cN = (d.colors && d.colors.length) || 0;
  const hN = (d.hex_colors && d.hex_colors.length) || 0;
  let colorChips;
  if (cN > 0 && hN > 0 && cN === hN) {
    colorChips = d.colors.map((c,i) => {
      const hx = d.hex_colors[i];
      return `<div class="mc"><i style="background:${esc(hx)}"></i>
        <span>${esc(c)}</span><span class="cnum">${esc(hx)}</span></div>`;
    }).join("");
  } else if (hN > 0) {
    colorChips = d.hex_colors.map(hx =>
      `<div class="mc"><i style="background:${esc(hx)}"></i>
        <span class="cnum">${esc(hx)}</span></div>`).join("");
  } else if (cN > 0) {
    colorChips = d.colors.map(c =>
      `<div class="mc"><span>${esc(c)}</span></div>`).join("");
  } else {
    colorChips = '<div style="font-size:11px;color:var(--ink-soft)">컬러 정보 없음</div>';
  }

  const fabricDisplay = d.fabric ?
    `${esc(d.fabric)}${d.fabricKey ? ' <span style="color:var(--ink-soft);font-size:10px">· ' + esc(fabricLabel(d.fabricKey)) + '</span>' : ''}`
    : '—';

  const hasImage = d.image_url && d.image_url.trim();
  const hexes = (d.hex_colors || []).slice(0, 9);
  const mimgContent = hasImage
    ? `<div class="imgph">${PH_SVG}<span>이미지 불러올 수 없음</span></div>
       <img src="${esc(proxyImage(d.image_url))}"
            referrerpolicy="no-referrer"
            onload="this.previousElementSibling.style.display='none'"
            onerror="this.style.display='none'">`
    : `<div class="modal-color-wrap">
         ${hexes.length
           ? hexes.map(h => `<div class="modal-color-block" style="background:${esc(h)}"><span>${esc(h)}</span></div>`).join("")
           : '<div class="color-card-empty">컬러 정보만 있음</div>'}
       </div>`;

  $("#modalbox").innerHTML = `
    <div class="mimg ${hasImage ? '' : 'no-img'}">
      ${mimgContent}
    </div>
    <div class="mbody">
      <button class="mclose">&times;</button>
      <div class="mbrand">${esc(d.brand)} · ${esc(d.gender)}</div>
      <h3>${esc(d.product_name)}</h3>
      <div class="mrow"><span class="k">Country</span><span class="v">${esc(countryLabel(d.country || 'GL'))}</span></div>
      <div class="mrow"><span class="k">Group</span><span class="v">${esc(d.brandGroup || '—')}</span></div>
      <div class="mrow"><span class="k">Season</span><span class="v">${esc(monthLabel(d.season) || '—')}</span></div>
      <div class="mrow"><span class="k">Category</span><span class="v">${esc(d.category)}</span></div>
      <div class="mrow"><span class="k">Subcategory</span><span class="v">${esc(d.subcategory || '—')}</span></div>
      <div class="mrow"><span class="k">Fabric</span><span class="v">${fabricDisplay}</span></div>
      <div style="font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-soft);margin:16px 0 4px">Colors</div>
      <div class="mcolorlist">${colorChips}</div>
      ${hasImage ? `<div style="margin-top:18px"><a href="${esc(d.image_url)}" target="_blank"
         style="font-size:11px;color:var(--accent);letter-spacing:.05em">원본 이미지 열기 ↗</a></div>` : ''}
    </div>`;
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
             onload="this.previousElementSibling.style.display='none'"
             onerror="this.style.display='none'">
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
