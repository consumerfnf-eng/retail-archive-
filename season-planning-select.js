/* =============================================================================
 *  F&F Retail Archive — 시즌 기획 셀렉 모드
 *  index.html 맨 아래에 <script src="season-planning-select.js"></script> 한 줄만 추가.
 *  기존 코드는 건드리지 않는다. 카드 그리드를 자동으로 찾아 체크박스를 얹는다.
 *  선택자가 안 맞으면 아래 CONFIG 만 고치면 된다.
 * ========================================================================== */
(function () {
  'use strict';

  const CONFIG = {
    // 자동 감지가 실패할 때만 채운다. 비워두면 스스로 찾는다.
    rootSelector: '#content',// 카드가 그려지는 영역 (F&F Retail Archive 기준)
    gridSelector: '',        // 자동 감지 실패 시에만 지정
    cardSelector: '',        // 예: '.product-card'
    headerSelector: '',      // 버튼을 넣을 곳. 비우면 상단에 고정 배치
    planningUrl: 'planning.html',
    // 아카이브 대분류. 카드 텍스트에서 이 값을 찾아 자동 분류한다.
    categories: ['outerwear','top','bottom','dress','shoe','bag','acc','other'],
    minCards: 6,             // 이 개수 이상 반복돼야 카드 그리드로 인정
    storageKey: 'ffra.selection'
  };

  /* ---------------------------------------------------------------- 유틸 */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function hashKey(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return 'it' + h.toString(36);
  }

  /* ------------------------------------------------- 카드 그리드 자동 감지 */
  function findGrid() {
    if (CONFIG.gridSelector) return $(CONFIG.gridSelector);
    // 카드 영역 안에서만 찾는다. 모달·사이드바가 섞이지 않게.
    const root = (CONFIG.rootSelector && $(CONFIG.rootSelector)) || document.body;
    const counts = new Map();
    const seeds = $$('img', root).concat(
      $$('[style*="background-image"]', root).filter(e => !e.querySelector('img')));
    seeds.forEach(img => {
      let el = img;
      for (let d = 0; d < 6 && el.parentElement; d++) {
        el = el.parentElement;
        const p = el.parentElement;
        if (!p) break;
        const sameTag = Array.from(p.children).filter(c =>
          c.tagName === el.tagName &&
          (c.querySelector('img') || c.querySelector('[style*="background-image"]')));
        if (sameTag.length >= CONFIG.minCards) {
          counts.set(p, Math.max(counts.get(p) || 0, sameTag.length));
          break;
        }
      }
    });
    let best = null, bestN = 0;
    counts.forEach((n, el) => { if (n > bestN) { bestN = n; best = el; } });
    return best;
  }

  function cardsOf(grid) {
    if (!grid) return [];
    if (CONFIG.cardSelector) return $$(CONFIG.cardSelector, grid);
    return Array.from(grid.children).filter(c =>
      c.querySelector('img') || c.querySelector('[style*="background-image"]'));
  }

  /* ------------------------------------------------- 카드에서 상품정보 추출 */
  function readCard(card) {
    const img = card.querySelector('img');
    let src = img ? (img.getAttribute('data-src') || img.src || '') : '';
    if (!src) {   // background-image 로 그린 경우
      const holder = card.querySelector('[style*="background-image"]') || card;
      const bg = getComputedStyle(holder).backgroundImage || '';
      const m = bg.match(/url\(["']?(.+?)["']?\)/);
      if (m) src = m[1];
    }
    const lines = Array.from(card.querySelectorAll('*'))
      .filter(e => !e.children.length)
      .map(e => (e.textContent || '').trim())
      .filter(Boolean);
    const uniq = [...new Set(lines)];
    // "ON · WOMEN" 처럼 가운뎃점이 있는 짧은 줄 = 브랜드·성별
    const meta = uniq.find(t => /[·•|]/.test(t) && t.length <= 40) || '';
    const [brand, gender] = meta.split(/\s*[·•|]\s*/);
    // 메타를 제외한 가장 긴 줄 = 제품명
    const name = uniq.filter(t => t !== meta).sort((a, b) => b.length - a.length)[0] || '';
    const rest = uniq.filter(t => t !== meta && t !== name);
    // 대분류 추출 — 카드 어딘가에 outerwear/top/shoe 같은 값이 있다
    const blob = uniq.join(' ').toLowerCase();
    const cat = CONFIG.categories.find(c =>
      new RegExp('(^|[^a-z])' + c + '([^a-z]|$)').test(blob)) || '';
    return {
      cat: cat,
      brand: (brand || '').trim(),
      gender: (gender || '').trim(),
      name: name.trim(),
      tags: rest.slice(0, 3),
      img: src,
      link: (card.querySelector('a') || {}).href || '',
      // 키에 이미지 URL 을 넣으면 안 된다. 지연로딩·프록시로 주소가 바뀌면
      // 같은 상품이 다른 상품으로 인식된다. 브랜드+성별+제품명으로 고정한다.
      key: hashKey([(brand || ''), (gender || ''), name]
                   .map(v => String(v).trim().toLowerCase().replace(/\s+/g, ' ')).join('|'))
    };
  }

  /* ------------------------------------------------------------- 스타일 */
  const CSS = `
  :root{ --ffp-accent: var(--accent, #d4573a); --ffp-ink:#26221d; --ffp-line:#e3ddd2; }
  .ffp-btn{font:inherit; font-size:13px; font-weight:600; letter-spacing:-.01em; cursor:pointer;
    border:1px solid var(--ffp-line); background:#fff; color:var(--ffp-ink);
    border-radius:999px; padding:7px 15px; transition:background .15s,border-color .15s;}
  .ffp-btn:hover{background:#f7f4ee;}
  .ffp-btn:focus-visible{outline:2px solid var(--ffp-accent); outline-offset:2px;}
  .ffp-btn.on{background:var(--ffp-ink); color:#fff; border-color:var(--ffp-ink);}
  .ffp-btn.primary{background:var(--ffp-accent); color:#fff; border-color:var(--ffp-accent);}
  #ffpAll{border-color:var(--ffp-ink); font-weight:700;}
  #ffpAll.on{background:var(--ffp-ink); color:#fff;}
  .ffp-btn.primary:hover{filter:brightness(.94);}
  .ffp-btn[disabled]{opacity:.4; cursor:not-allowed;}
  /* 상세 패널이 보통 오른쪽에서 열리므로 왼쪽 아래에 띄운다 */
  .ffp-launch{position:fixed; left:18px; bottom:18px; z-index:9998;
    box-shadow:0 2px 10px rgba(40,32,20,.16); transition:bottom .2s;}
  body.ffp-selecting .ffp-launch{bottom:74px;}

  /* 셀렉 모드 */
  body.ffp-selecting .ffp-card{position:relative;}
  body.ffp-selecting .ffp-card::after{content:''; position:absolute; inset:0; border-radius:inherit;
    box-shadow:inset 0 0 0 2px transparent; pointer-events:none; transition:box-shadow .15s;}

  body.ffp-selecting .ffp-card.ffp-on::after{box-shadow:inset 0 0 0 2px var(--ffp-accent);}
  .ffp-check{position:absolute; top:8px; left:8px; z-index:20; width:26px; height:26px;
    border-radius:7px; border:1.5px solid var(--ffp-line); background:rgba(255,255,255,.97);
    display:none; align-items:center; justify-content:center; font-size:15px; color:#fff;
    cursor:pointer; box-shadow:0 1px 4px rgba(40,32,20,.14);}
  body.ffp-selecting .ffp-check{display:flex;}
  .ffp-check:hover{border-color:var(--ffp-accent);}
  .ffp-card.ffp-on .ffp-check{background:var(--ffp-accent); border-color:var(--ffp-accent);}
  .ffp-card.ffp-on .ffp-check::after{content:'✓';}

  /* 하단 바 */
  .ffp-bar{position:fixed; left:0; right:0; bottom:0; z-index:9999; background:#fff;
    border-top:1px solid var(--ffp-line); box-shadow:0 -2px 14px rgba(40,32,20,.07);
    padding:11px 20px 11px 150px; display:none; align-items:center; gap:14px;
    transform:translateY(100%); transition:transform .2s ease;}
  body.ffp-selecting .ffp-bar{display:flex; transform:translateY(0);}
  .ffp-count{font-size:14px; font-weight:700; color:var(--ffp-ink);}
  .ffp-count small{font-weight:400; color:#8c8377; margin-left:5px; font-size:12px;}
  .ffp-spacer{flex:1;}

  /* 요약 모달 */
  .ffp-modal{position:fixed; inset:0; z-index:10000; background:rgba(38,34,29,.5);
    display:none; align-items:center; justify-content:center; padding:22px;}
  .ffp-modal.open{display:flex;}
  .ffp-sheet{background:#fdfbf7; border-radius:16px; max-width:660px; width:100%;
    max-height:86vh; overflow:auto; padding:26px;}
  .ffp-sheet h3{margin:0 0 4px; font-size:19px; color:var(--ffp-ink);}
  .ffp-sheet p.sub{margin:0 0 18px; font-size:12.5px; color:#8c8377;}
  .ffp-field{margin-bottom:13px;}
  .ffp-field label{display:block; font-size:11px; font-weight:700; letter-spacing:.05em;
    text-transform:uppercase; color:#8c8377; margin-bottom:5px;}
  .ffp-field select,.ffp-field input{width:100%; font:inherit; font-size:13px; padding:8px 10px;
    border:1px solid var(--ffp-line); border-radius:8px; background:#fff; color:var(--ffp-ink);}
  .ffp-list{border:1px solid var(--ffp-line); border-radius:10px; max-height:210px;
    overflow:auto; margin:6px 0 18px; background:#fff;}
  .ffp-row{display:flex; gap:9px; align-items:center; padding:7px 11px; font-size:12px;
    border-bottom:1px solid #f0ece4;}
  .ffp-row:last-child{border-bottom:0;}
  .ffp-row img{width:32px; height:32px; object-fit:cover; border-radius:5px; background:#f2ece1; flex:none;}
  .ffp-row b{font-weight:600; color:var(--ffp-ink);}
  .ffp-row span{color:#8c8377;}
  .ffp-row .x{margin-left:auto; cursor:pointer; color:#b9b0a2; padding:0 4px;}
  .ffp-row .x:hover{color:var(--ffp-accent);}
  .ffp-actions{display:flex; gap:9px; justify-content:flex-end;}

  /* 담은 목록 */
  .ffp-tray{position:fixed; left:0; right:0; bottom:57px; z-index:9997; background:#fff;
    border-top:1px solid var(--ffp-line); box-shadow:0 -3px 16px rgba(40,32,20,.09);
    max-height:44vh; display:none; flex-direction:column;}
  .ffp-tray.open{display:flex;}
  .ffp-tray-head{display:flex; align-items:center; gap:10px; padding:10px 20px 10px 150px;
    border-bottom:1px solid var(--ffp-line); font-size:13px;}
  .ffp-tray-body{overflow:auto; padding:12px 20px 16px 150px;
    display:grid; grid-template-columns:repeat(auto-fill,minmax(128px,1fr)); gap:9px;}
  .ffp-tile{position:relative; border:1px solid var(--ffp-line); border-radius:9px;
    overflow:hidden; background:#faf8f4;}
  .ffp-tile .th{aspect-ratio:1; background:#f1ece3; display:block;}
  .ffp-tile .th img{width:100%; height:100%; object-fit:cover; display:block;}
  .ffp-tile .tx{padding:6px 8px 8px; font-size:10.5px; line-height:1.35;}
  .ffp-tile .tx b{display:block; color:var(--ffp-ink); font-size:11px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .ffp-tile .tx span{color:#8c8377;}
  .ffp-tile .rm{position:absolute; top:5px; right:5px; width:20px; height:20px; border-radius:50%;
    border:1px solid var(--ffp-line); background:rgba(255,255,255,.95); cursor:pointer;
    font-size:11px; line-height:1; color:#8c8377; padding:0;}
  .ffp-tile .rm:hover{background:var(--ffp-accent); color:#fff; border-color:var(--ffp-accent);}
  .ffp-tray-empty{grid-column:1/-1; padding:26px 0; text-align:center; color:#a09684; font-size:12.5px;}
  @media (max-width:640px){ .ffp-launch{left:12px; bottom:14px;}
    body.ffp-selecting .ffp-launch{bottom:96px;} }
  @media (prefers-reduced-motion:reduce){ .ffp-bar,.ffp-card::after{transition:none;} }
  `;

  /* --------------------------------------------------------------- 상태 */
  const sel = new Map();   // key -> item
  let grid = null;

  function save() {
    try { sessionStorage.setItem(CONFIG.storageKey,
      JSON.stringify({ at: Date.now(), items: [...sel.values()] })); } catch (e) {}
  }
  function restore() {
    try {
      const raw = sessionStorage.getItem(CONFIG.storageKey);
      if (!raw) return;
      (JSON.parse(raw).items || []).forEach(it => sel.set(it.key, it));
    } catch (e) {}
  }

  /* --------------------------------------------------------------- 렌더 */
  let painting = false;
  let mo = null;

  function paint() {
    if (!grid || painting) return;
    painting = true;
    if (mo) mo.disconnect();                 // 내 변경으로 감시자가 다시 돌지 않게

    const cards = cardsOf(grid);
    cards.forEach(card => {
      card.classList.add('ffp-card');
      // 중복 방지: 이미 있는 체크박스는 지우고 하나만 둔다
      const boxes = card.querySelectorAll(':scope > .ffp-check');
      for (let i = 1; i < boxes.length; i++) boxes[i].remove();
      if (!boxes.length) {
        const box = document.createElement('span');
        box.className = 'ffp-check';
        card.appendChild(box);
      }
      const it = readCard(card);
      card.dataset.ffpKey = it.key;
      card.classList.toggle('ffp-on', sel.has(it.key));
    });

    const n = sel.size;
    const visItems = cards.map(readCard);
    const visOn = visItems.filter(it => sel.has(it.key)).length;
    const allBtn = $('#ffpAll');
    if (allBtn) {
      const allOn = visItems.length && visOn === visItems.length;
      allBtn.textContent = allOn ? `이 화면 ${visItems.length}건 해제`
                                 : `이 화면 전체 선택 (${visItems.length})`;
      allBtn.classList.toggle('on', !!allOn);
      allBtn.disabled = !visItems.length;
    }
    const byCat = {};
    sel.forEach(v => { const c = v.cat || '미분류'; byCat[c] = (byCat[c] || 0) + 1; });
    const catTxt = Object.entries(byCat).sort((a, b) => b[1] - a[1])
      .map(([c, v]) => `${c} ${v}`).join(' · ');
    $('.ffp-count').innerHTML = n
      ? `${n}건 선택됨<small>${catTxt} · 대분류별로 나뉘어 기획됩니다</small>`
      : `선택된 상품 없음<small>카드 왼쪽 위 체크박스를 누르세요 · Shift+체크로 범위 선택</small>`;
    $('#ffpStart').disabled = n === 0;
    $('#ffpClear').disabled = n === 0;
    const tb = $('#ffpTray');
    if (tb) { tb.textContent = n ? `담은 목록 ${n}` : '담은 목록'; tb.disabled = n === 0; }
    if ($('#ffpTrayPanel') && $('#ffpTrayPanel').classList.contains('open')) renderTray();

    if (mo) mo.observe(document.body, { childList: true, subtree: true });
    painting = false;
  }

  function renderTray() {
    const items = [...sel.values()];
    $('#ffpTrayN').textContent = items.length;
    $('#ffpTrayBody').innerHTML = items.length ? items.map(it => `
      <div class="ffp-tile" data-k="${it.key}">
        <span class="th">${it.img ? `<img src="${it.img}" alt="" loading="lazy"
          onerror="this.style.visibility='hidden'">` : ''}</span>
        <button class="rm" title="빼기">✕</button>
        <div class="tx"><b>${it.name || '(이름 없음)'}</b>
          <span>${it.brand || ''}${it.cat ? ' · ' + it.cat : ''}</span></div>
      </div>`).join('')
      : '<div class="ffp-tray-empty">아직 담은 상품이 없습니다.</div>';
  }

  let lastIdx = null;
  function handleCheckClick(e) {
    const box = e.target.closest && e.target.closest('.ffp-check');
    if (!box) return;
    if (!document.body.classList.contains('ffp-selecting')) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    grid = findGrid() || grid;
    const cards = cardsOf(grid);
    const card = box.closest('.ffp-card');
    const idx = cards.indexOf(card);
    if (idx < 0) return;

    if (e.shiftKey && lastIdx !== null) {
      const [a, b] = idx < lastIdx ? [idx, lastIdx] : [lastIdx, idx];
      const on = !sel.has(readCard(cards[idx]).key);
      for (let i = a; i <= b; i++) {
        const it2 = readCard(cards[i]);
        if (on) sel.set(it2.key, it2); else sel.delete(it2.key);
      }
    } else {
      const it = readCard(card);
      if (sel.has(it.key)) sel.delete(it.key); else sel.set(it.key, it);
    }
    lastIdx = idx;
    save(); paint();
  }

  function setMode(on) {
    if (on) {
      grid = findGrid();            // 누른 시점에 다시 찾는다
      if (!grid || !cardsOf(grid).length) {
        alert('상품 카드를 찾지 못했습니다.\n카드가 다 표시된 뒤 다시 눌러주세요.');
        return;
      }
    }
    document.body.classList.toggle('ffp-selecting', on);
    if (!on && $('#ffpTrayPanel')) $('#ffpTrayPanel').classList.remove('open');
    $('#ffpToggle').classList.toggle('on', on);
    $('#ffpToggle').textContent = on ? '셀렉 종료' : '시즌 기획';
    if (on) paint();
  }

  /* --------------------------------------------------------------- 모달 */
  function openSheet() {
    const items = [...sel.values()];
    $('#ffpRows').innerHTML = items.map(it => `
      <div class="ffp-row" data-k="${it.key}">
        <img src="${it.img}" alt="" loading="lazy"
             onerror="this.style.visibility='hidden'">
        <b>${it.brand || '브랜드 미상'}</b>
        <span>${it.name || ''}</span>
        <span class="x" title="빼기">✕</span>
      </div>`).join('');
    $('#ffpSheetCount').textContent = items.length;
    $('.ffp-modal').classList.add('open');
    $('#ffpBrand').focus();
  }

  function downloadCsv() {
    const items = [...sel.values()];
    const head = ['item_key', 'brand', 'gender', 'product_name', 'image_url', 'source_url', 'tags'];
    const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = [head.join(',')].concat(items.map(it =>
      [it.key, it.cat, it.brand, it.gender, it.name, it.img, it.link, (it.tags || []).join(' ')]
        .map(esc).join(','))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `기획셀렉_${new Date().toISOString().slice(0, 10)}_${items.length}건.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  function startPlanning() {
    const payload = {
      brand: $('#ffpBrand').value,
      season: $('#ffpSeason').value,
      purpose: $('#ffpPurpose').value,
      createdAt: new Date().toISOString(),
      items: [...sel.values()]
    };
    try { sessionStorage.setItem('ffra.batch', JSON.stringify(payload)); } catch (e) {}
    // 넘긴 뒤에는 아카이브 선택을 비운다. 돌아와서 새로 고를 때 이전 선택이 섞이지 않게.
    sel.clear();
    try { sessionStorage.removeItem(CONFIG.storageKey); } catch (e) {}
    location.href = CONFIG.planningUrl;
  }

  /* ---------------------------------------------------------------- 부팅 */
  let booted = false;
  function boot() {
    if (booted) return;
    grid = findGrid();

    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);

    const host = CONFIG.headerSelector && $(CONFIG.headerSelector);
    const btn = document.createElement('button');
    btn.id = 'ffpToggle'; btn.className = 'ffp-btn'; btn.textContent = '시즌 기획';
    if (host) host.appendChild(btn); else { btn.classList.add('ffp-launch'); document.body.appendChild(btn); }

    document.body.insertAdjacentHTML('beforeend', `
      <div class="ffp-bar">
        <span class="ffp-count"></span>
        <span class="ffp-spacer"></span>
        <button class="ffp-btn" id="ffpAll">이 화면 전체 선택</button>
        <button class="ffp-btn" id="ffpClear">전체 해제</button>
        <button class="ffp-btn" id="ffpTray">담은 목록</button>
        <button class="ffp-btn primary" id="ffpStart">기획 시작</button>
      </div>
      <div class="ffp-tray" id="ffpTrayPanel">
        <div class="ffp-tray-head">
          <b>담은 상품 <span id="ffpTrayN">0</span></b>
          <span style="font-size:11px;color:#8c8377">페이지를 넘기거나 필터를 바꿔도 그대로 남습니다</span>
          <span style="flex:1"></span>
          <button class="ffp-btn" id="ffpTrayClose">닫기</button>
        </div>
        <div class="ffp-tray-body" id="ffpTrayBody"></div>
      </div>
      <div class="ffp-modal" role="dialog" aria-modal="true" aria-label="시즌 기획 배치 만들기">
        <div class="ffp-sheet">
          <h3>시즌 기획 배치 만들기</h3>
          <p class="sub"><b id="ffpSheetCount">0</b>건을 라벨링 대상으로 넘깁니다.</p>
          <div class="ffp-field"><label>어떤 브랜드용으로 기획하나요</label>
            <select id="ffpBrand">
              <option>MLB</option><option>Discovery</option>
              <option>Sergio Tacchini</option><option>Duvetica</option>
            </select></div>
          <div class="ffp-field"><label>기획 시즌</label>
            <select id="ffpSeason">
              <option>27SS</option><option>27FW</option>
              <option>28SS</option><option>28FW</option>
            </select></div>
          <div class="ffp-field"><label>목적 (선택)</label>
            <input id="ffpPurpose" placeholder="예: 여름 뮬·슬리퍼 라인 확장 검토"></div>
          <label style="font-size:11px;font-weight:700;letter-spacing:.05em;
            text-transform:uppercase;color:#8c8377;">선택한 상품</label>
          <div class="ffp-list" id="ffpRows"></div>
          <div class="ffp-actions">
            <button class="ffp-btn" id="ffpCsv">CSV 내려받기</button>
            <button class="ffp-btn" id="ffpCancel">닫기</button>
            <button class="ffp-btn primary" id="ffpGo">라벨링으로 넘기기</button>
          </div>
        </div>
      </div>`);

    booted = true;
    restore();
    btn.onclick = () => setMode(!document.body.classList.contains('ffp-selecting'));
    $('#ffpAll').onclick = () => {
      // 화면에 그려진 카드가 모두 선택돼 있으면 해제, 아니면 전체 선택
      grid = findGrid() || grid;
      const cards = cardsOf(grid);
      const items = cards.map(readCard);
      if (!items.length) { alert('상품 카드를 찾지 못했습니다.'); return; }
      const allOn = items.length && items.every(it => sel.has(it.key));
      items.forEach(it => { if (allOn) sel.delete(it.key); else sel.set(it.key, it); });
      save(); paint();
    };
    $('#ffpClear').onclick = () => { sel.clear(); save(); paint(); };
    $('#ffpStart').onclick = openSheet;
    $('#ffpTray').onclick = () => {
      const t = $('#ffpTrayPanel');
      t.classList.toggle('open');
      if (t.classList.contains('open')) renderTray();
    };
    $('#ffpTrayClose').onclick = () => $('#ffpTrayPanel').classList.remove('open');
    $('#ffpTrayBody').addEventListener('click', ev => {
      if (!ev.target.classList.contains('rm')) return;
      sel.delete(ev.target.closest('.ffp-tile').dataset.k);
      save(); paint(); renderTray();
    });
    $('#ffpCsv').onclick = downloadCsv;
    $('#ffpGo').onclick = startPlanning;
    $('#ffpCancel').onclick = () => $('.ffp-modal').classList.remove('open');
    $('#ffpRows').onclick = e => {
      if (!e.target.classList.contains('x')) return;
      sel.delete(e.target.closest('.ffp-row').dataset.k);
      save(); paint(); openSheet();
    };
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if ($('.ffp-modal').classList.contains('open')) $('.ffp-modal').classList.remove('open');
      else if (document.body.classList.contains('ffp-selecting')) setMode(false);
    });

    // 필터로 카드가 다시 그려져도 선택 표시를 유지한다
    // 클릭은 문서 한 곳에서만 받는다. 카드가 다시 그려져도 리스너가 늘지 않는다.
    document.addEventListener('click', handleCheckClick, true);
    document.addEventListener('mousedown', e => {
      if (document.body.classList.contains('ffp-selecting') &&
          e.target.closest && e.target.closest('.ffp-check')) {
        e.preventDefault(); e.stopPropagation();
      }
    }, true);

    let repaint = null;
    mo = new MutationObserver(() => {
      if (!document.body.classList.contains('ffp-selecting')) return;
      clearTimeout(repaint);
      repaint = setTimeout(() => { grid = findGrid() || grid; paint(); }, 120);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    if (sel.size) setMode(true);
    console.log('[시즌기획] 버튼 준비 완료. 카드가 다 뜬 뒤 왼쪽 아래 [시즌 기획] 을 누르세요.');
  }

  /* 아카이브는 시트를 fetch 한 뒤 카드를 그린다.
     DOMContentLoaded 시점에는 그리드가 비어 있으므로 생길 때까지 기다린다. */
  /* 카드가 늦게 그려지더라도 버튼은 바로 띄운다.
     실제 카드 탐색은 [시즌 기획] 을 누른 시점에 한다. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
