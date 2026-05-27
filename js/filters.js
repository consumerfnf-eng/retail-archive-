/* ============================================
   F&F Retail Archive - Filters & Facets
   사이드바 필터 + 빵부스러기(crumbs)
   ============================================ */

function genderScope() {
  return RETAIL_DATA.filter(d =>
    !removed.has(d._id) &&
    (state.gender === "All" || d.gender === state.gender)
  );
}

function filtered() {
  return genderScope().filter(d =>
    (!state.months.size       || state.months.has(d.month)) &&
    (!state.brandGroups.size  || state.brandGroups.has(d.brandGroup)) &&
    (!state.brands.size       || state.brands.has(d.brand)) &&
    (!state.categories.size   || state.categories.has(d.category)) &&
    (!state.subcategories.size || state.subcategories.has(d.subcategory || "—")) &&
    (!state.fabrics.size      || state.fabrics.has(d.fabricKey || "__none__"))
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
    const v = d[key] || "—";
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
      // BRAND_GROUP_ORDER 순서 우선
      const ai = BRAND_GROUP_ORDER.indexOf(a[0]);
      const bi = BRAND_GROUP_ORDER.indexOf(b[0]);
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
  const defs = [
    {id:"Period",       title:"Period · 시즌",       key:"month",       set:state.months,        fmt:monthLabel},
    {id:"BrandGroups",  title:"Category · 카테고리", key:"brandGroup",  set:state.brandGroups},
    {id:"Brands",       title:"Brands",              key:"brand",       set:state.brands},
    {id:"Categories",   title:"Item Categories",     key:"category",    set:state.categories},
    {id:"Subcategories",title:"Sub-categories",      key:"subcategory", set:state.subcategories},
    {id:"Fabric",       title:"Fabric · 소재",       key:"fabric",      set:state.fabrics}
  ];

  $("#facets").innerHTML = defs.map(def => {
    const sel = def.set.size;
    let body;

    if (def.id === "Brands") {
      // 2단계: 브랜드 그룹 → 개별 브랜드
      // 단, 사용자가 BrandGroups에서 선택한 게 있으면 그것만 표시
      const brandScope = state.brandGroups.size
        ? scope.filter(d => state.brandGroups.has(d.brandGroup))
        : scope;

      const counts = facetCounts(brandScope, def.key);
      const cmap = new Map(counts.filter(([v]) => v !== "—"));
      const byGroup = {};
      brandScope.forEach(d => {
        const g = d.brandGroup || "기타";
        (byGroup[g] = byGroup[g] || new Set()).add(d.brand);
      });
      const groups = BRAND_GROUP_ORDER.filter(g => byGroup[g] && byGroup[g].size);
      // BRAND_GROUP_ORDER에 없는 그룹도 뒤에 추가
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
      const counts = fabricCounts(scope);
      const hasFabric = counts.some(([k]) => k !== "__none__");

      if (!hasFabric && counts.length === 0) {
        body = '<div style="font-size:11px;color:var(--ink-soft);padding:6px 4px;line-height:1.5">아직 fabric 데이터 없음<br>(시트 J열에 추가 시 표시)</div>';
      } else {
        body = counts.map(([k, c]) => {
          const on = def.set.has(k);
          const isNone = k === "__none__";
          const label = isNone ? "미분류" : fabricLabel(k);
          const dotColor = isNone ? "#bbb" : fabricColor(k);
          return `<div class="opt ${on?'on':''}" data-facet="Fabric" data-val="${esc(k)}">
            <span class="box"></span>
            <span class="lbl" style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:2px;background:${dotColor};flex-shrink:0"></span>
              ${esc(label)}
            </span>
            <span class="cnt">${c}</span>
          </div>`;
        }).join("");
      }

    } else {
      // 일반 facet (Period, BrandGroups, Categories, Subcategories)
      const counts = facetCounts(scope, def.key);
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
    const fid = o.dataset.facet;
    const val = o.dataset.val;
    const set = ({
      Period: state.months,
      BrandGroups: state.brandGroups,
      Brands: state.brands,
      Categories: state.categories,
      Subcategories: state.subcategories,
      Fabric: state.fabrics
    })[fid];
    if (set.has(val)) set.delete(val); else set.add(val);

    // BrandGroups 변경 시, 그 그룹에 속하지 않는 brand들은 선택 해제
    if (fid === 'BrandGroups' && state.brandGroups.size) {
      const validBrands = new Set();
      genderScope().forEach(d => {
        if (state.brandGroups.has(d.brandGroup)) validBrands.add(d.brand);
      });
      state.brands = new Set([...state.brands].filter(b => validBrands.has(b)));
    }

    state.page = 1;
    state.drillDown = null;
    render();
  });

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
      ? genderScope().filter(d => state.brandGroups.has(d.brandGroup))
      : genderScope();
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
  $("#crumbs").innerHTML = c.join("");
  $$('#crumbs .crumb[data-kind]').forEach(cr => {
    cr.querySelector(".x").onclick = () => {
      const k = cr.dataset.kind;
      const v = cr.dataset.val;
      ({
        month:      state.months,
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
