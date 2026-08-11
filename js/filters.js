/* ============================================
   F&F Retail Archive - Filters & Facets
   사이드바 필터 + 빵부스러기(crumbs)
   ============================================ */

/* 키워드 검색이 적용되기 전의 기준 범위 (성별 탭 + 제외 항목만 반영)
   키워드 그룹 칩의 건수 계산에 사용 */
function genderScopeRaw() {
  return RETAIL_DATA.filter(d =>
    !removed.has(d._id) &&
    (state.gender === "All" || d.gender === state.gender)
  );
}

/* 제품명 키워드 검색까지 반영한 기준 범위
   filtered() / analyticsFiltered() / 모든 facet 카운트 / CSV가 여기서 파생된다 */
function genderScope() {
  const base = genderScopeRaw();
  if (typeof kwFilterSpec !== "function") return base;
  const spec = kwFilterSpec();                       // 행마다가 아니라 한 번만 컴파일
  const hasInc = spec.matchers.length > 0;
  const hasExc = spec.globalExc.length > 0;
  if (!hasInc && !hasExc) return base;
  return base.filter(d => {
    if (hasExc && kwRowExcluded(d, spec.globalExc)) return false;   // 제외어는 전체에 적용
    if (!hasInc) return true;                                       // 제외어만 있으면 나머지 전부 통과
    for (let i = 0; i < spec.matchers.length; i++) {
      if (kwMatchRow(d, spec.matchers[i])) return true;             // 그룹끼리는 OR
    }
    return false;
  });
}

function filtered() {
  // 사이드바 필터 적용 - 갤러리용
  return genderScope().filter(d =>
          (!state.months.size        || state.months.has(monthLabel(d.month))) &&
    (!state.countries.size    || state.countries.has(d.country || "GL")) &&
    (!state.brandGroups.size  || state.brandGroups.has(d.brandGroup)) &&
    (!state.brands.size       || state.brands.has(d.brand)) &&
    (!state.categories.size   || state.categories.has(d.category)) &&
    (!state.subcategories.size || state.subcategories.has(d.subcategory || "—")) &&
    (!state.fabrics.size      || state.fabrics.has(d.fabricKey || "__none__"))
  );
}

/* ============================================
   분석 화면 전용 필터
   사이드바와 독립, state.analyticsFilter에서만 가져옴
   ============================================ */
function analyticsFiltered() {
  const af = state.analyticsFilter;
  return genderScope().filter(d =>
          (!af.months.size           || af.months.has(monthLabel(d.month))) &&
    (!af.countries.size    || af.countries.has(d.country || "GL")) &&
    (!af.brandGroups.size  || af.brandGroups.has(d.brandGroup)) &&
    (!af.brands.size       || af.brands.has(d.brand))
  );
}

function buildGenderTabs() {
  const order = {Women:0, Men:1, Unisex:2};
  const genders = ["All", ...uniq(RETAIL_DATA.map(d => d.gender))
    .sort((a,b) => (order[a] ?? 9) - (order[b] ?? 9))];
  $("#genderTabs").innerHTML = genders.map(g =>
    `<button data-g="${esc(g)}" class="${state.gender===g?'active':''}">${g==='All'?'전체':esc(g)}</button>`
  ).join("");
  $$("#genderTabs button").forEach(b => b.onclick = () => {
    state.gender = b.dataset.g;
    state.months.clear();
    state.countries.clear();
    state.brandGroups.clear();
    state.brands.clear();
    state.categories.clear();
    state.subcategories.clear();
    state.fabrics.clear();
    state.page = 1;
    state.drillDown = null;
    render();
  });
}

function facetCounts(scope, key) {
  const m = {};
  scope.forEach(d => {
          const v = key === "month" ? (monthLabel(d[key]) || "—") : (d[key] || "—");
    m[v] = (m[v] || 0) + 1;
  });
  return Object.entries(m).sort((a,b) => {
    if (key === "month") return a[0] < b[0] ? -1 : 1;
    if (key === "category") {
      const order = ["outerwear","top","bottom","dress","shoe","shoes","bag","acc"];
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b[1] - a[1];
    }
    if (key === "brandGroup") {
      const ai = BRAND_GROUP_ORDER.indexOf(a[0]);
      const bi = BRAND_GROUP_ORDER.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b[1] - a[1];
    }
    if (key === "country") {
      const ai = COUNTRY_ORDER.indexOf(a[0]);
      const bi = COUNTRY_ORDER.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b[1] - a[1];
    }
    return b[1] - a[1];
  });
}

function fabricCounts(scope) {
  const m = {};
  scope.forEach(d => {
    const k = d.fabricKey || "__none__";
    m[k] = (m[k] || 0) + 1;
  });
  const result = [];
  FABRIC_CATEGORIES.forEach(cat => {
    if (m[cat.key]) result.push([cat.key, m[cat.key]]);
  });
  if (m["__none__"]) result.push(["__none__", m["__none__"]]);
  return result;
}

function buildFacets() {
  const scope = genderScope();
     const periodFilteredScope = state.months.size ? scope.filter(d => state.months.has(monthLabel(d.month))) : scope;

      // Country 필터가 선택된 경우 BrandGroups/Brands scope를 줄임
         const countryFilteredScope = state.countries.size
                 ? periodFilteredScope.filter(d => state.countries.has(d.country || "GL"))
                          : periodFilteredScope;

         // Brand/브랜드그룹(상위 카테고리) 필터가 선택된 경우 Item Categories/Sub-categories scope를 줄임
         const brandFilteredScope = (state.brandGroups.size || state.brands.size) ? countryFilteredScope.filter(d => (!state.brandGroups.size || state.brandGroups.has(d.brandGroup)) && (!state.brands.size || state.brands.has(d.brand))) : countryFilteredScope;
         const categoryFilteredScope = state.categories.size ? brandFilteredScope.filter(d => state.categories.has(d.category)) : brandFilteredScope;

         const defs = [
            {id:"Period",       title:"Period · 시즌",        key:"month",       set:state.months,        fmt:monthLabel,   scope: scope},
            {id:"Country",      title:"Country · 국가",       key:"country",     set:state.countries,      fmt:countryLabel, scope: periodFilteredScope},
            {id:"BrandGroups",  title:"Category · 카테고리",  key:"brandGroup",  set:state.brandGroups,                       scope: countryFilteredScope},
            {id:"Brands",       title:"Brands",               key:"brand",       set:state.brands,                           scope: countryFilteredScope},
            {id:"Categories",   title:"Item Categories",      key:"category",    set:state.categories,                       scope: brandFilteredScope},
            {id:"Subcategories",title:"Sub-categories",       key:"subcategory", set:state.subcategories,                    scope: categoryFilteredScope},
            {id:"Keywords",     title:"Keywords · 제품명",    key:"__keyword",   set:state.kwActive,                         scope: scope},
            {id:"Fabric",       title:"Fabric · 소재",        key:"fabric",      set:state.fabrics,                          scope: periodFilteredScope},
                  ];

  $("#facets").innerHTML = defs.map(def => {
    const sel = def.set.size;
    let body;

    if (def.id === "Brands") {
      // Country 필터 적용된 scope 사용
      const brandScope = state.brandGroups.size
        ? def.scope.filter(d => state.brandGroups.has(d.brandGroup))
        : def.scope;

      const counts = facetCounts(brandScope, def.key);
      const cmap = new Map(counts.filter(([v]) => v !== "—"));
      const byGroup = {};
      brandScope.forEach(d => {
        const g = d.brandGroup || "기타";
        (byGroup[g] = byGroup[g] || new Set()).add(d.brand);
      });
      const groups = BRAND_GROUP_ORDER.filter(g => byGroup[g] && byGroup[g].size);
      Object.keys(byGroup).forEach(g => {
        if (!groups.includes(g) && byGroup[g].size) groups.push(g);
      });

      body = groups.map(g => {
        const brands = [...byGroup[g]].sort((a,b) => (cmap.get(b)||0) - (cmap.get(a)||0));
        const gcount = brands.reduce((s,b) => s + (cmap.get(b)||0), 0);
        const gsel = brands.filter(b => def.set.has(b)).length;
        const open = state.brandGroupsOpen.has(g);

        let checkClass = '';
        if (gsel === brands.length) checkClass = 'all';
        else if (gsel > 0) checkClass = 'partial';

        const children = brands.map(b => {
          const on = def.set.has(b);
          return `<div class="opt subopt ${on?'on':''}" data-facet="Brands" data-val="${esc(b)}">
            <span class="box"></span>
            <span class="lbl">${esc(b)}</span>
            <span class="cnt">${cmap.get(b)||0}</span>
          </div>`;
        }).join("");

        return `<div class="bgroup ${open?'open':''}">
          <div class="bgroup-top">
            <span class="bg-check ${checkClass}" data-bgcheck="${esc(g)}" title="그룹 전체 선택"></span>
            <span class="bgcaret" data-bgtoggle="${esc(g)}"></span>
            <span class="lbl" data-bgtoggle="${esc(g)}">${esc(g)}</span>
            ${gsel?`<span class="fcount">${gsel}</span>`:''}
            <span class="cnt">${gcount}</span>
          </div>
          <div class="bgroup-body">${children}</div>
        </div>`;
      }).join("");

    } else if (def.id === "Fabric") {
      const totalCount = periodFilteredScope.filter(d => d.fabricKey).length;
      body = `<div class="opt fabric-all-link" data-fabric-all="1">
        <span class="lbl" style="display:flex;align-items:center;gap:6px;font-weight:600">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0"></span>
          All · 전체 분석 보기
        </span>
        <span class="cnt">${totalCount}</span>
      </div>`;

    } else if (def.id === "Keywords") {
      const groups = state.kwGroups || [];
      if (!groups.length) {
        body = '<div style="font-size:11px;color:var(--ink-soft);padding:6px 4px;line-height:1.55">저장된 키워드가 없습니다.<br>상단 검색창에 키워드를 넣고<br>“그룹 저장”을 누르세요.</div>';
      } else {
        const kwBase = genderScopeRaw();
        body = groups.map(g => {
          const on = state.kwActive.has(g.id);
          const editing = state.kwEditing === g.id;
          const n = (typeof kwCount === "function") ? kwCount(g, kwBase) : 0;
          return `<div class="opt kwopt ${on?'on':''} ${editing?'editing':''}" data-facet="Keywords" data-val="${esc(g.id)}"
                       title="${esc((g.include || []).join(', '))}">
            <span class="box"></span>
            <span class="lbl">${esc(g.label)}</span>
            <span class="cnt">${n}</span>
            <span class="kwopt-btn" data-kwedit="${esc(g.id)}" title="키워드 수정">✎</span>
            <span class="kwopt-btn kwopt-del" data-kwdel="${esc(g.id)}" title="이 그룹 삭제">×</span>
          </div>`;
        }).join("");
        if (state.kwActive.size || (state.kwQuery || '').trim()) {
          body += `<div class="kwopt-clear" id="kwFacetClear">키워드 선택 해제</div>`;
        }
      }

    } else {
      // 일반 facet - 각 def.scope 사용
      const counts = facetCounts(def.scope, def.key);
      const hasData = counts.some(([v]) => v !== "—");
      const opts = counts.map(([v, c]) => {
        const on = def.set.has(v);
        return `<div class="opt ${on?'on':''}" data-facet="${def.id}" data-val="${esc(v)}">
          <span class="box"></span>
          <span class="lbl">${def.fmt ? def.fmt(v) : esc(v)}</span>
          <span class="cnt">${c}</span>
        </div>`;
      }).join("");
      body = hasData ? opts
        : '<div style="font-size:11px;color:var(--ink-soft);padding:6px 4px">아직 데이터 없음</div>';
    }

    return `<div class="facet ${state.facetOpen[def.id]?'':'collapsed'}" data-facet="${def.id}">
      <div class="facet-top">
        <span class="ftitle">${def.title}</span>
        ${sel?`<span class="fcount">${sel}</span>`:''}
        <span class="caret"></span>
      </div>
      <div class="facet-body">${body}</div>
    </div>`;
  }).join("");

  // 이벤트 바인딩
  $$(".facet-top").forEach(t => t.onclick = () => {
    const id = t.parentElement.dataset.facet;
    state.facetOpen[id] = !state.facetOpen[id];
    t.parentElement.classList.toggle("collapsed");
  });

  $$(".opt").forEach(o => o.onclick = () => {
    if (o.dataset.fabricAll) {
      state.view = "analytics";
      renderContent();
      setTimeout(() => {
        const mainEl = $(".main");
        if (mainEl) mainEl.scrollTo({top: 0, behavior: "smooth"});
      }, 50);
      return;
    }

    const fid = o.dataset.facet;
    const val = o.dataset.val;
    const set = ({
      Period: state.months,
      Country: state.countries,
      BrandGroups: state.brandGroups,
      Brands: state.brands,
      Categories: state.categories,
      Subcategories: state.subcategories,
      Keywords: state.kwActive,
      Fabric: state.fabrics
    })[fid];
    if (!set) return;
    if (set.has(val)) set.delete(val); else set.add(val);

    // BrandGroups 변경 시, 그 그룹에 속하지 않는 brand들은 선택 해제
    if (fid === 'BrandGroups' && state.brandGroups.size) {
      const validBrands = new Set();
      countryFilteredScope.forEach(d => {
        if (state.brandGroups.has(d.brandGroup)) validBrands.add(d.brand);
      });
      state.brands = new Set([...state.brands].filter(b => validBrands.has(b)));
    }

    // Country 변경 시, 해당 country에 없는 brandGroups/brands 선택 해제
    if (fid === 'Country') {
      const newCountryScope = state.countries.size
        ? genderScope().filter(d => state.countries.has(d.country || "GL"))
        : genderScope();
      const validGroups = new Set(newCountryScope.map(d => d.brandGroup));
      const validBrands = new Set(newCountryScope.map(d => d.brand));
      state.brandGroups = new Set([...state.brandGroups].filter(g => validGroups.has(g)));
      state.brands = new Set([...state.brands].filter(b => validBrands.has(b)));
    }

    state.page = 1;
    state.drillDown = null;
    render();
  });

  // 키워드 그룹 수정 / 삭제
  $$("#facets [data-kwedit]").forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    if (typeof kwBeginEdit === "function") kwBeginEdit(b.dataset.kwedit);
  });
  $$("#facets [data-kwdel]").forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const id = b.dataset.kwdel;
    const g = (state.kwGroups || []).find(x => x.id === id);
    if (!g) return;
    if (!confirm(`"${g.label}" 키워드 그룹을 삭제할까요?`)) return;
    state.kwGroups = state.kwGroups.filter(x => x.id !== id);
    state.kwActive.delete(id);
    if (state.kwEditing === id && typeof kwCancelEdit === "function") kwCancelEdit(true);
    if (typeof kwPersist === "function") kwPersist();
    state.page = 1;
    render();
  });

  const kwfc = $("#kwFacetClear");
  if (kwfc) kwfc.onclick = (e) => {
    e.stopPropagation();
    if (typeof kwClearAll === "function") kwClearAll();
  };

  // 브랜드 그룹 펼치기/접기
  $$(".bgroup-top [data-bgtoggle]").forEach(el => el.onclick = (e) => {
    e.stopPropagation();
    const name = el.dataset.bgtoggle;
    if (state.brandGroupsOpen.has(name)) {
      state.brandGroupsOpen.delete(name);
    } else {
      state.brandGroupsOpen.add(name);
    }
    el.closest('.bgroup').classList.toggle("open");
  });

  // 브랜드 그룹 전체선택 체크박스
  $$(".bg-check").forEach(chk => chk.onclick = (e) => {
    e.stopPropagation();
    const groupName = chk.dataset.bgcheck;
    const scope2 = state.brandGroups.size
      ? countryFilteredScope.filter(d => state.brandGroups.has(d.brandGroup))
      : countryFilteredScope;
    const brandsInGroup = new Set();
    scope2.forEach(d => {
      if ((d.brandGroup || "기타") === groupName) {
        brandsInGroup.add(d.brand);
      }
    });

    const allSelected = [...brandsInGroup].every(b => state.brands.has(b));
    if (allSelected) {
      brandsInGroup.forEach(b => state.brands.delete(b));
    } else {
      brandsInGroup.forEach(b => state.brands.add(b));
    }
    state.page = 1;
    state.drillDown = null;
    render();
  });
}

function buildCrumbs() {
  const c = [`<span class="crumb static">${state.gender==='All'?'전체':esc(state.gender)}</span>`];
  const groups = [
    [state.months,        "month",      monthLabel],
    [state.countries,     "country",    countryLabel],
    [state.brandGroups,   "brandGroup", null],
    [state.brands,        "brand",      null],
    [state.categories,    "category",   null],
    [state.subcategories, "subcat",     null],
    [state.fabrics,       "fabric",     k => fabricLabel(k)]
  ];
  groups.forEach(([set, kind, fmt]) => {
    set.forEach(v => {
      c.push(`<span class="crumb" data-kind="${kind}" data-val="${esc(v)}">
        ${fmt ? fmt(v) : esc(v)}<span class="x">×</span></span>`);
    });
  });
  // 키워드 그룹은 crumbs 대신 사이드바 Keywords 섹션에서 표시/해제한다
  $("#crumbs").innerHTML = c.join("");
  $$('#crumbs .crumb[data-kind]').forEach(cr => {
    cr.querySelector(".x").onclick = () => {
      const k = cr.dataset.kind;
      const v = cr.dataset.val;
      ({
        month:      state.months,
        country:    state.countries,
        brandGroup: state.brandGroups,
        brand:      state.brands,
        category:   state.categories,
        subcat:     state.subcategories,
        fabric:     state.fabrics
      }[k]).delete(v);
      state.page = 1;
      state.drillDown = null;
      render();
    };
  });
}
