/* ============================================
   F&F Retail Archive - Keyword Search & Groups
   제품명(product_name) 대상 키워드 검색 + 저장 그룹
   - 매칭 대상: product_name 전용 (subcategory 미포함)
   - 여러 그룹 동시 선택 시 OR
   - 저장: localStorage + JSON 내보내기/불러오기
   ============================================ */

const KW_STORE_KEY = 'fnfRA_keywordGroups_v1';

/* 기본 제공 그룹 (localStorage에 저장된 값이 있으면 그쪽이 우선)
   팀 공유용 기본값을 넣고 싶으면 이 배열을 수정해 커밋하면 됩니다. */
const DEFAULT_KEYWORD_GROUPS = [
  { id: 'kw_sample_bomber', label: 'BOMBER',
    include: ['BOMBER', '봄버', 'BLOUSON', '블루종', 'MA1', 'MA-1', 'FLIGHT JACKET', 'VARSITY'],
    exclude: ['BOMBER BAG'] },
  { id: 'kw_sample_loafer', label: 'LOAFER',
    include: ['LOAFER', '로퍼', 'PENNY', 'MOCCASIN', '모카신'],
    exclude: [] }
];

/* ============================================
   정규화 & 매칭
   ============================================ */

/* 대소문자·공백·기호를 모두 제거해 비교
   "MA-1 Bomber" -> "MA1BOMBER", "Bomber Jacket" -> "BOMBERJACKET" */
function kwNorm(s) {
  return (s == null ? '' : String(s))
    .toUpperCase()
    .replace(/[\s\-_.,'"`~!@#$%^&*()+=/\\[\]{}|;:<>?]/g, '');
}

/* 입력 문자열 -> {include:[], exclude:[]}
   쉼표 또는 줄바꿈 구분. 앞에 - 또는 ! 를 붙이면 제외 키워드.
   예) "BOMBER, 봄버, MA-1, -BOMBER BAG" */
function kwParse(str) {
  const include = [], exclude = [];
  String(str || '').split(/[,\n]/).forEach(tok => {
    let t = tok.trim();
    if (!t) return;
    let neg = false;
    if (t[0] === '-' || t[0] === '!') { neg = true; t = t.slice(1).trim(); }
    t = t.replace(/^#+/, '').trim();
    if (!t) return;
    (neg ? exclude : include).push(t);
  });
  return { include, exclude };
}

/* 그룹 -> 정규화된 매처 (한 번만 만들어 재사용) */
function kwCompile(g) {
  return {
    inc: (g.include || []).map(kwNorm).filter(Boolean),
    exc: (g.exclude || []).map(kwNorm).filter(Boolean)
  };
}

/* 제품명 하나를 매처 하나와 대조 */
function kwMatchOne(name, m) {
  const n = kwNorm(name);
  if (!n || !m || !m.inc.length) return false;
  for (let i = 0; i < m.exc.length; i++) if (n.indexOf(m.exc[i]) !== -1) return false;
  for (let i = 0; i < m.inc.length; i++) if (n.indexOf(m.inc[i]) !== -1) return true;
  return false;
}

/* 현재 활성화된 매처 목록 (임시 검색어 + 선택된 그룹, 서로 OR)
   filter 콜백 밖에서 한 번만 호출한다 -> 행마다 재컴파일하지 않음 */
function kwMatchers() {
  const list = [];
  const q = (state.kwQuery || '').trim();
  if (q) {
    const m = kwCompile(kwParse(q));
    if (m.inc.length) list.push(m);
  }
  (state.kwGroups || []).forEach(g => {
    if (state.kwActive.has(g.id)) {
      const m = kwCompile(g);
      if (m.inc.length) list.push(m);
    }
  });
  return list;
}

/* 활성 키워드 조건이 하나라도 있는지 */
function kwIsActive() {
  return kwMatchers().length > 0;
}

/* 그룹 하나의 매칭 건수 (성별/제외 반영, 다른 사이드바 필터는 무시) */
function kwCount(g, baseScope) {
  const base = baseScope || (typeof genderScopeRaw === 'function' ? genderScopeRaw() : RETAIL_DATA);
  const m = kwCompile(g);
  if (!m.inc.length) return 0;
  let n = 0;
  for (let i = 0; i < base.length; i++) if (kwMatchOne(base[i].product_name, m)) n++;
  return n;
}

/* ============================================
   저장 / 불러오기
   ============================================ */

function kwLoadGroups() {
  try {
    const raw = localStorage.getItem(KW_STORE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter(g => g && g.id && g.label);
    }
  } catch (e) {
    console.warn('[Keywords] 저장된 그룹을 읽지 못했습니다:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_KEYWORD_GROUPS));
}

function kwPersist() {
  try {
    localStorage.setItem(KW_STORE_KEY, JSON.stringify(state.kwGroups));
    return true;
  } catch (e) {
    console.warn('[Keywords] 저장 실패:', e);
    if (typeof showToast === 'function') showToast('그룹 저장 실패 (브라우저 저장공간 확인)');
    return false;
  }
}

function kwNewId() {
  return 'kw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

/* 그룹 -> 입력창 문자열 */
function kwToInputString(g) {
  const inc = (g.include || []).join(', ');
  const exc = (g.exclude || []).map(x => '-' + x).join(', ');
  return [inc, exc].filter(Boolean).join(', ');
}

/* ============================================
   UI - 칩 렌더
   ============================================ */

function renderKeywordChips() {
  const box = $("#kwGroups");
  if (!box) return;

  const base = (typeof genderScopeRaw === 'function') ? genderScopeRaw() : RETAIL_DATA;
  const groups = state.kwGroups || [];

  const chips = groups.map(g => {
    const on = state.kwActive.has(g.id);
    const editing = state.kwEditing === g.id;
    const n = kwCount(g, base);
    return `<span class="kw-chip ${on ? 'on' : ''} ${editing ? 'editing' : ''}" data-kw="${esc(g.id)}" title="${esc((g.include || []).join(', '))}">
      <span class="kw-chip-label">${esc(g.label)}</span>
      <span class="kw-chip-cnt">${n}</span>
      <span class="kw-chip-btn kw-chip-edit" data-kwedit="${esc(g.id)}" title="이 그룹 수정">✎</span>
      <span class="kw-chip-btn kw-chip-del" data-kwdel="${esc(g.id)}" title="이 그룹 삭제">×</span>
    </span>`;
  }).join("");

  const clear = (state.kwActive.size || (state.kwQuery || '').trim())
    ? `<span class="kw-clear" id="kwClear">키워드 해제</span>` : '';

  const hint = groups.length
    ? '' : `<span class="kw-hint">저장된 그룹이 없습니다 · 키워드를 입력하고 “그룹 저장”을 누르세요</span>`;

  box.innerHTML = chips + clear + hint;

  // 칩 클릭 -> 활성 토글
  $$("#kwGroups .kw-chip").forEach(ch => ch.onclick = () => {
    const id = ch.dataset.kw;
    if (state.kwActive.has(id)) state.kwActive.delete(id); else state.kwActive.add(id);
    state.page = 1;
    state.drillDown = null;
    render();
  });

  // 수정
  $$("#kwGroups [data-kwedit]").forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    kwBeginEdit(b.dataset.kwedit);
  });

  // 삭제
  $$("#kwGroups [data-kwdel]").forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const id = b.dataset.kwdel;
    const g = (state.kwGroups || []).find(x => x.id === id);
    if (!g) return;
    if (!confirm(`"${g.label}" 그룹을 삭제할까요?`)) return;
    state.kwGroups = state.kwGroups.filter(x => x.id !== id);
    state.kwActive.delete(id);
    if (state.kwEditing === id) kwCancelEdit(true);
    kwPersist();
    state.page = 1;
    render();
  });

  const clr = $("#kwClear");
  if (clr) clr.onclick = () => kwClearAll();
}

/* ============================================
   UI - 편집 모드
   ============================================ */

function kwBeginEdit(id) {
  const g = (state.kwGroups || []).find(x => x.id === id);
  if (!g) return;
  state.kwEditing = id;
  const inp = $("#kwInput"), lab = $("#kwLabel"), save = $("#kwSave"), cancel = $("#kwCancel");
  if (inp) inp.value = kwToInputString(g);
  if (lab) lab.value = g.label;
  if (save) save.textContent = '수정 저장';
  if (cancel) cancel.hidden = false;
  // 편집 중에는 저장된 그룹 대신 입력창 내용을 실시간 미리보기로 사용
  state.kwActive.delete(id);
  state.kwQuery = kwToInputString(g);
  state.page = 1;
  render();
  if (inp) inp.focus();
}

function kwCancelEdit(skipRender) {
  state.kwEditing = null;
  const inp = $("#kwInput"), lab = $("#kwLabel"), save = $("#kwSave"), cancel = $("#kwCancel");
  if (inp) inp.value = '';
  if (lab) lab.value = '';
  if (save) save.textContent = '그룹 저장';
  if (cancel) cancel.hidden = true;
  state.kwQuery = '';
  if (!skipRender) { state.page = 1; render(); }
}

function kwSaveGroup() {
  const inp = $("#kwInput"), lab = $("#kwLabel");
  const parsed = kwParse(inp ? inp.value : '');
  if (!parsed.include.length) {
    if (typeof showToast === 'function') showToast('검색 키워드를 먼저 입력하세요');
    if (inp) inp.focus();
    return;
  }
  let label = (lab && lab.value.trim()) || parsed.include[0].toUpperCase();

  if (state.kwEditing) {
    const g = (state.kwGroups || []).find(x => x.id === state.kwEditing);
    if (g) {
      g.label = label;
      g.include = parsed.include;
      g.exclude = parsed.exclude;
      kwPersist();
      state.kwActive.add(g.id);
      if (typeof showToast === 'function') showToast(`"${label}" 그룹 수정됨`);
    }
    state.kwEditing = null;
    const save = $("#kwSave"), cancel = $("#kwCancel");
    if (save) save.textContent = '그룹 저장';
    if (cancel) cancel.hidden = true;
    if (inp) inp.value = '';
    if (lab) lab.value = '';
    state.kwQuery = '';
    state.page = 1;
    render();
    return;
  }

  // 같은 이름이 이미 있으면 덮어쓸지 확인
  const dup = (state.kwGroups || []).find(x => x.label.toUpperCase() === label.toUpperCase());
  if (dup) {
    if (!confirm(`"${label}" 그룹이 이미 있습니다. 덮어쓸까요?`)) return;
    dup.include = parsed.include;
    dup.exclude = parsed.exclude;
    state.kwActive.add(dup.id);
  } else {
    const g = { id: kwNewId(), label, include: parsed.include, exclude: parsed.exclude };
    state.kwGroups.push(g);
    state.kwActive.add(g.id);
  }
  kwPersist();
  if (typeof showToast === 'function') showToast(`"${label}" 그룹 저장됨`);

  if (inp) inp.value = '';
  if (lab) lab.value = '';
  state.kwQuery = '';
  state.page = 1;
  render();
}

function kwClearAll() {
  state.kwActive.clear();
  state.kwQuery = '';
  state.kwEditing = null;
  const inp = $("#kwInput"), lab = $("#kwLabel"), save = $("#kwSave"), cancel = $("#kwCancel");
  if (inp) inp.value = '';
  if (lab) lab.value = '';
  if (save) save.textContent = '그룹 저장';
  if (cancel) cancel.hidden = true;
  state.page = 1;
  state.drillDown = null;
  render();
}

/* ============================================
   JSON 내보내기 / 불러오기
   ============================================ */

function kwExportFile() {
  if (!state.kwGroups.length) {
    if (typeof showToast === 'function') showToast('저장된 그룹이 없습니다');
    return;
  }
  const payload = {
    tool: 'fnf-retail-archive',
    type: 'keyword-groups',
    version: 1,
    exported_at: new Date().toISOString(),
    groups: state.kwGroups
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `keyword_groups_${typeof stamp === 'function' ? stamp() : Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast(`키워드 그룹 ${state.kwGroups.length}개 내보냄`);
}

function kwImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let arr = null;
    try {
      const data = JSON.parse(reader.result);
      arr = Array.isArray(data) ? data : (data && Array.isArray(data.groups) ? data.groups : null);
    } catch (e) {
      arr = null;
    }
    if (!arr) {
      if (typeof showToast === 'function') showToast('올바른 키워드 그룹 JSON이 아닙니다');
      return;
    }
    const clean = arr
      .filter(g => g && g.label && Array.isArray(g.include))
      .map(g => ({
        id: g.id || kwNewId(),
        label: String(g.label),
        include: g.include.map(String),
        exclude: Array.isArray(g.exclude) ? g.exclude.map(String) : []
      }));
    if (!clean.length) {
      if (typeof showToast === 'function') showToast('불러올 그룹이 없습니다');
      return;
    }
    const mode = state.kwGroups.length
      ? (confirm(`그룹 ${clean.length}개를 불러옵니다.\n\n확인 = 기존 그룹에 병합\n취소 = 기존 그룹을 전부 교체`) ? 'merge' : 'replace')
      : 'replace';

    if (mode === 'replace') {
      state.kwGroups = clean;
      state.kwActive.clear();
    } else {
      clean.forEach(g => {
        const dup = state.kwGroups.find(x => x.label.toUpperCase() === g.label.toUpperCase());
        if (dup) { dup.include = g.include; dup.exclude = g.exclude; }
        else state.kwGroups.push(g);
      });
    }
    kwPersist();
    if (typeof showToast === 'function') showToast(`키워드 그룹 ${clean.length}개 불러옴`);
    state.page = 1;
    render();
  };
  reader.readAsText(file, 'utf-8');
}

/* ============================================
   초기화 (app.js init에서 호출)
   ============================================ */

function kwInit() {
  state.kwGroups = kwLoadGroups();
  state.kwActive = new Set();
  state.kwQuery = '';
  state.kwEditing = null;

  const inp = $("#kwInput");
  if (inp) {
    let timer = null;
    inp.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.kwQuery = inp.value;
        state.page = 1;
        state.drillDown = null;
        render();
      }, 220);
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); state.kwQuery = inp.value; state.page = 1; render(); }
      if (e.key === 'Escape') { e.preventDefault(); kwCancelEdit(); }
    });
  }

  const lab = $("#kwLabel");
  if (lab) lab.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); kwSaveGroup(); }
  });

  const save = $("#kwSave");
  if (save) save.onclick = kwSaveGroup;

  const cancel = $("#kwCancel");
  if (cancel) cancel.onclick = () => kwCancelEdit();

  const exp = $("#kwExport");
  if (exp) exp.onclick = kwExportFile;

  const imp = $("#kwImport"), file = $("#kwFile");
  if (imp && file) {
    imp.onclick = () => file.click();
    file.onchange = () => {
      if (file.files && file.files[0]) kwImportFile(file.files[0]);
      file.value = '';
    };
  }
}
