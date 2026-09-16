/* ============================================
   F&F Retail Archive - Colorway Merge
   같은 아이템의 컬러 변형을 한 장의 카드로 합친다.

     피그먼트 크루 넥 니트 [스모크 핑크]   ┐
     피그먼트 크루 넥 니트 [피콕 블루]     ├→  피그먼트 크루 넥 니트 (4 colors)
     피그먼트 크루 넥 니트 [더스티 베이지] │
     피그먼트 크루 넥 니트 [차콜 그레이]   ┘

     Sporty Windbreaker - Pink       ┐
     Sporty Windbreaker - Light Blue ┴→  Sporty Windbreaker (2 colors)

   [안전장치] 접미사가 "컬러로 판정된 경우"에만 잘라낸다.
   "Jacket - Cropped" 같은 핏/디테일 변형은 합치지 않는다.

   utils.js 다음, filters.js 앞에 로드.
   ============================================ */
(function () {
  'use strict';

  /* ---- 컬러 어휘 (부분 일치로 검사) ---------------------------- */
  var COLOR_WORDS = [
    // 영문
    'black','white','ivory','cream','beige','sand','stone','taupe','ecru','natural','offwhite','off white',
    'grey','gray','charcoal','silver','melange','heather',
    'navy','blue','indigo','cobalt','sky','denim','teal','turquoise','aqua',
    'green','khaki','olive','mint','sage','forest','lime',
    'red','wine','burgundy','bordeaux','maroon','crimson','rust','coral',
    'pink','rose','fuchsia','magenta','peach','salmon',
    'purple','violet','lavender','lilac','plum',
    'yellow','mustard','gold','ochre','lemon','butter',
    'orange','apricot','amber','tangerine',
    'brown','camel','tan','chocolate','mocha','cocoa','espresso','caramel','walnut','coffee',
    'multi','print','stripe','check','floral','camo','leopard',
    // 국문
    '블랙','화이트','아이보리','크림','베이지','샌드','스톤','토프','에크루','내추럴',
    '그레이','그레이지','차콜','실버','멜란지','멜란지그레이',
    '네이비','블루','인디고','코발트','스카이','데님','청','틸','터콰이즈',
    '그린','카키','올리브','민트','세이지','라임',
    '레드','와인','버건디','보르도','마룬','러스트','코랄',
    '핑크','로즈','푸시아','마젠타','피치','살몬',
    '퍼플','바이올렛','라벤더','라일락','플럼','보라',
    '옐로우','옐로','머스타드','골드','레몬','버터',
    '오렌지','앰버',
    '브라운','카멜','탄','초콜릿','모카','코코아','에스프레소','카라멜','월넛','커피',
    '멀티','프린트','스트라이프','체크','플로럴','카모','레오파드',
    '검정','흰색','남색','회색','빨강','파랑','초록','노랑'
  ];

  /* 구분자 없이 뒤에 붙는 컬러를 잡기 위한 "토큰 단위" 사전.
     substring이 아니라 단어 완전일치로만 판정한다 (오탐 방지). */
  var COLOR_TOKENS = new Set([
    'black','white','ivory','cream','beige','sand','stone','taupe','ecru','natural','oatmeal','bone','chalk',
    'grey','gray','charcoal','silver','melange','heather','graphite','ash',
    'navy','blue','indigo','cobalt','sky','denim','teal','turquoise','aqua','cyan','marine',
    'green','khaki','olive','mint','sage','forest','lime','moss',
    'red','wine','burgundy','bordeaux','maroon','crimson','rust','coral','brick','cherry',
    'pink','rose','fuchsia','magenta','peach','salmon','blush',
    'purple','violet','lavender','lilac','plum','mauve',
    'yellow','mustard','gold','ochre','lemon','butter','honey',
    'orange','apricot','amber','tangerine','terracotta',
    'brown','camel','tan','chocolate','mocha','cocoa','espresso','caramel','walnut','coffee','chestnut','cognac',
    'multi','multicolor',
    '블랙','화이트','아이보리','크림','베이지','샌드','스톤','토프','에크루','내추럴','오트밀',
    '그레이','그레이지','차콜','실버','멜란지','그라파이트',
    '네이비','블루','인디고','코발트','스카이','데님','틸','터콰이즈',
    '그린','카키','올리브','민트','세이지','라임',
    '레드','와인','버건디','보르도','마룬','러스트','코랄','벽돌',
    '핑크','로즈','푸시아','마젠타','피치','살몬',
    '퍼플','바이올렛','라벤더','라일락','플럼','보라',
    '옐로우','옐로','머스타드','골드','레몬','버터',
    '오렌지','앰버','테라코타',
    '브라운','카멜','탄','초콜릿','모카','코코아','에스프레소','카라멜','월넛','커피','꼬냑',
    '멀티','검정','흰색','남색','회색','빨강','파랑','초록','노랑'
  ]);

  /* 컬러 앞에 붙는 수식어. 단독으로는 컬러가 아니다. */
  var COLOR_MODIFIERS = new Set([
    'light','dark','deep','pale','soft','bright','neon','hot','off','mid','baby','ice','icy',
    'dusty','smoke','smoky','smoked','muted','washed','antique','vintage','warm','cool','dull',
    'peacock','marine','burnt','dirty','pastel','vivid','rich','pure','true','classic',
    '라이트','다크','딥','페일','소프트','브라이트','네온','베이비','아이스',
    '더스티','스모크','스모키','뮤트','워시드','앤티크','빈티지','웜','쿨','피콕','파스텔','비비드'
  ]);

  function normText(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /* 접미사가 컬러처럼 보이는가 (수식어 + 컬러 조합도 통과: "스모크 핑크", "피콕 블루") */
  function looksLikeColor(text) {
    var t = normText(text);
    if (!t || t.length > 40) return false;
    for (var i = 0; i < COLOR_WORDS.length; i++) {
      if (t.indexOf(COLOR_WORDS[i]) !== -1) return true;
    }
    return false;
  }

  function tokenize(s) {
    return normText(s).split(' ')
      .map(function (t) { return t.replace(/^[^0-9a-z가-힣#]+|[^0-9a-z가-힣#]+$/g, ''); })
      .filter(Boolean);
  }

  function isColorToken(t)    { return COLOR_TOKENS.has(t); }
  function isColorishToken(t) { return COLOR_TOKENS.has(t) || COLOR_MODIFIERS.has(t); }

  /* 구분자 없이 끝에 붙은 컬러 잘라내기
     "INNER POINTED FLUFFY FUR JACKET DUSTY PINK" -> base + "DUSTY PINK"
     조건: 꼬리 토큰이 전부 컬러/수식어 + 최소 1개는 진짜 컬러 + 앞에 최소 2토큰 남음 */
  function splitTrailingColor(name) {
    var raw = String(name == null ? '' : name).trim();
    var parts = raw.split(/\s+/);
    if (parts.length < 3) return null;
    var toks = parts.map(function (t) {
      return t.toLowerCase().replace(/^[^0-9a-z가-힣#]+|[^0-9a-z가-힣#]+$/g, '');
    });

    for (var n = Math.min(3, parts.length - 2); n >= 1; n--) {
      var tail = toks.slice(toks.length - n);
      var allColorish = tail.every(isColorishToken);
      var hasReal = tail.some(isColorToken);
      if (allColorish && hasReal) {
        return {
          base:  parts.slice(0, parts.length - n).join(' ').trim(),
          color: parts.slice(parts.length - n).join(' ').trim()
        };
      }
    }
    return null;
  }

  /* 시트의 컬러 컬럼 값과 접미사가 일치하는가 */
  function matchesColorColumn(suffix, colors) {
    if (!colors || !colors.length) return false;
    var s = normText(suffix);
    if (!s) return false;
    for (var i = 0; i < colors.length; i++) {
      var c = normText(colors[i]);
      if (!c) continue;
      if (c === s || c.indexOf(s) !== -1 || s.indexOf(c) !== -1) return true;
    }
    return false;
  }

  /* 제품명 -> {base, color} · 컬러로 판정되지 않으면 color = null */
  function splitColorway(name, colorColumn) {
    var s = String(name == null ? '' : name).trim();
    if (!s) return { base: s, color: null };

    var mt, base, suffix;

    // 1) 끝에 붙은 대괄호/소괄호  "니트 [스모크 핑크]"  "Knit (Pink)"
    mt = s.match(/^(.*\S)\s*[\[\(]([^\[\]\(\)]{1,40})[\]\)]\s*$/);
    if (mt) {
      base = mt[1].trim(); suffix = mt[2].trim();
      if (looksLikeColor(suffix) || matchesColorColumn(suffix, colorColumn)) {
        return { base: base, color: suffix };
      }
    }

    // 2) 끝에 붙은 구분자  "Sporty Windbreaker - Light Blue"  "니트 / 네이비"
    //    앞뒤 공백이 있는 구분자만 인정 -> "MA-1", "T-Shirt", "Gore-Tex"는 건드리지 않음
    mt = s.match(/^(.*\S)\s+[-–—/|·]\s+(\S[^-–—/|]{0,39})$/);
    if (mt) {
      base = mt[1].trim(); suffix = mt[2].trim();
      if (looksLikeColor(suffix) || matchesColorColumn(suffix, colorColumn)) {
        return { base: base, color: suffix };
      }
    }

    // 3) 구분자 없이 끝에 붙은 컬러  "FUR JACKET DUSTY PINK"
    var tail = splitTrailingColor(s);
    if (tail) return { base: tail.base, color: tail.color };

    return { base: s, color: null };
  }

  /* 그룹 키: 컬러를 뺀 나머지가 전부 같아야 한 아이템으로 본다 */
  function groupKeyOf(d, base) {
    return [
      d.brand || '', d.gender || '', d.category || '', d.subcategory || '',
      d.season || '', d.country || '', normText(base)
    ].join('\u0001');
  }

  /* 변형 행에서 대표 hex 하나 뽑기 */
  function topHexOf(d) {
    if (d.hex_colors && d.hex_colors.length) return d.hex_colors[0];
    if (d.hex_breakdown && d.hex_breakdown.length) return d.hex_breakdown[0].hex;
    return '';
  }

  /* ============================================
     메인: 원본 배열 -> 컬러웨이 병합 배열
     ============================================ */
  function mergeColorways(rows) {
    if (!rows || !rows.length) return rows || [];

    var groups = new Map();

    rows.forEach(function (d) {
      var sp = splitColorway(d.product_name, d.colors);
      var base = sp.color ? sp.base : d.product_name;      // 컬러가 아니면 원본 이름 유지
      var key = groupKeyOf(d, base);

      var g = groups.get(key);
      if (!g) {
        g = { base: base, rows: [], colorTexts: [] };
        groups.set(key, g);
      }
      g.rows.push(d);
      g.colorTexts.push(sp.color);
    });

    var out = [];

    groups.forEach(function (g) {
      // 변형이 하나뿐이고 컬러 접미사도 없으면 원본 그대로 통과
      if (g.rows.length === 1 && !g.colorTexts[0]) { out.push(g.rows[0]); return; }

      // 대표 행: 이미지가 있는 첫 행 우선
      var rep = null;
      for (var i = 0; i < g.rows.length; i++) {
        if (g.rows[i].image_url && g.rows[i].image_url.trim()) { rep = g.rows[i]; break; }
      }
      if (!rep) rep = g.rows[0];

      // 컬러명 / hex 를 변형 단위로 1:1 수집
      var names = [], hexes = [], anyHex = false;
      g.rows.forEach(function (d, idx) {
        var nm = g.colorTexts[idx]
          || (d.colors && d.colors.length ? d.colors.join(' ') : '')
          || '';
        var hx = topHexOf(d);
        if (hx) anyHex = true;
        names.push(nm);
        hexes.push(hx);
      });

      // hex가 하나도 없으면 컬러명만 남긴다 (빈 스와치 방지)
      if (!anyHex) hexes = [];
      else {
        // hex 없는 변형은 대표 행의 hex로 채워 길이를 맞춘다
        var fallback = topHexOf(rep) || '#CCCCCC';
        hexes = hexes.map(function (h) { return h || fallback; });
      }

      var merged = Object.assign({}, rep, {
        product_name: g.base,
        colors: names.filter(function (n) { return n !== ''; }).length ? names : (rep.colors || []),
        hex_colors: hexes.length ? hexes : (rep.hex_colors || []),
        _colorwayCount: g.rows.length,
        _variants: g.rows,
        _variantRows: g.rows.map(function (d) { return d._sheetRow; }).filter(Boolean)
      });

      out.push(merged);
    });

    return out;
  }

  /* ---- 진단 ---------------------------------------------------- */
  function colorwayCheck(n) {
    var raw = window.RETAIL_DATA_RAW;
    if (!raw || !raw.length) { console.log('데이터가 아직 로드되지 않았습니다.'); return; }
    var merged = mergeColorways(raw);
    console.log('원본 ' + raw.length + '행 -> 병합 후 ' + merged.length + '건 ('
      + (raw.length - merged.length) + '행 흡수)');

    var multi = merged.filter(function (d) { return d._colorwayCount > 1; })
      .sort(function (a, b) { return b._colorwayCount - a._colorwayCount; });
    console.log('컬러웨이 2개 이상인 아이템: ' + multi.length + '건');
    console.table(multi.slice(0, n || 25).map(function (d) {
      return {
        브랜드: d.brand, 아이템: d.product_name,
        컬러수: d._colorwayCount, 컬러: (d.colors || []).join(' / ')
      };
    }));
  }

  /* 컬러로 판정되지 않아 안 합쳐진 접미사 후보를 보여준다 (오탐/누락 점검용) */
  function colorwaySuspects(n) {
    var raw = window.RETAIL_DATA_RAW;
    if (!raw || !raw.length) { console.log('데이터가 아직 로드되지 않았습니다.'); return; }
    var seen = new Map();
    raw.forEach(function (d) {
      var s = String(d.product_name || '');
      var mt = s.match(/^(.*\S)\s*[\[\(]([^\[\]\(\)]{1,40})[\]\)]\s*$/)
            || s.match(/^(.*\S)\s+[-–—/|·]\s+(\S[^-–—/|]{0,39})$/);
      if (!mt) return;
      if (splitTrailingColor(s)) return;
      var suffix = mt[2].trim();
      if (looksLikeColor(suffix) || matchesColorColumn(suffix, d.colors)) return;
      seen.set(suffix, (seen.get(suffix) || 0) + 1);
    });
    var list = [].slice.call(seen).sort(function (a, b) { return b[1] - a[1]; });
    console.log('컬러로 인식되지 않은 접미사 ' + list.length + '종 (컬러라면 COLOR_WORDS에 추가 필요)');
    console.table(list.slice(0, n || 40).map(function (p) { return { 접미사: p[0], 건수: p[1] }; }));
  }

  window.splitColorway    = splitColorway;
  window.mergeColorways   = mergeColorways;
  window.colorwayCheck    = colorwayCheck;
  window.colorwaySuspects = colorwaySuspects;
})();
