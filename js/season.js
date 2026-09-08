/* ============================================
   F&F Retail Archive - Season Labels
   달력 분기(1Q=1~3월) -> 패션 시즌으로 교체

     SPRING  3, 4, 5월
     SUMMER  6, 7, 8월
     FALL    9, 10, 11월
     WINTER  12, 1, 2월   ← 12월의 연도를 따라감
                            (25' WINTER = 2025-12, 2026-01, 2026-02)

   utils.js 다음에 로드해서 monthLabel()을 덮어쓴다.
   ============================================ */

const SEASON_DEFS = [
  { key: 'SPRING', label: 'SPRING', months: [3, 4, 5] },
  { key: 'SUMMER', label: 'SUMMER', months: [6, 7, 8] },
  { key: 'FALL',   label: 'FALL',   months: [9, 10, 11] },
  { key: 'WINTER', label: 'WINTER', months: [12, 1, 2] }
];

/* 월 -> 시즌 인덱스 (0 SPRING ~ 3 WINTER) */
function seasonIndexOfMonth(m) {
  if (m >= 3 && m <= 5) return 0;
  if (m >= 6 && m <= 8) return 1;
  if (m >= 9 && m <= 11) return 2;
  return 3;                                  // 12, 1, 2
}

/* 원본 값에서 {y, m} 추출.
   지원: Date, 202503, "2025-03", "2025/3", "2025.03", "2025-03-15", "202503" */
function parseYearMonth(v) {
  if (v == null || v === '') return null;

  if (v instanceof Date && !isNaN(v)) {
    return { y: v.getFullYear(), m: v.getMonth() + 1 };
  }

  const s = String(v).trim();

  // 2025-03 / 2025/3 / 2025.03 / 2025 03 (뒤에 일자가 붙어도 됨)
  let mt = s.match(/^(\d{4})[-/.\s](\d{1,2})(?:[-/.\s]\d{1,2})?$/);
  if (mt) return { y: +mt[1], m: +mt[2] };

  // 202503
  mt = s.match(/^(\d{4})(\d{2})$/);
  if (mt) {
    const m = +mt[2];
    if (m >= 1 && m <= 12) return { y: +mt[1], m };
  }

  // 2025-03-15T00:00:00 같은 ISO 문자열
  mt = s.match(/^(\d{4})-(\d{2})-\d{2}T/);
  if (mt) return { y: +mt[1], m: +mt[2] };

  return null;
}

/* {y, m} -> 시즌 연도 (WINTER의 1·2월은 앞 해에 붙는다) */
function seasonYearOf(y, m) {
  return (m === 1 || m === 2) ? y - 1 : y;
}

/* 정렬용 숫자 키: 2025 SPRING -> 20250, 2025 WINTER -> 20253 */
function seasonSortKey(y, m) {
  return seasonYearOf(y, m) * 10 + seasonIndexOfMonth(m);
}

/* 라벨 -> 정렬 키 (facetCounts에서 라벨만 가지고 정렬할 때 사용) */
function seasonLabelSortKey(label) {
  const mt = String(label || '').match(/^(\d{2})'\s*(SPRING|SUMMER|FALL|WINTER)$/i);
  if (!mt) return 999999;                          // 파싱 실패한 값은 맨 뒤로
  const y = 2000 + (+mt[1]);
  const idx = ['SPRING', 'SUMMER', 'FALL', 'WINTER'].indexOf(mt[2].toUpperCase());
  return y * 10 + (idx === -1 ? 9 : idx);
}

/* ============================================
   monthLabel 덮어쓰기
   기존 시그니처 그대로 (원본 값 -> 표시 문자열)
   ============================================ */
function monthLabel(v) {
  const ym = parseYearMonth(v);
  if (!ym) return v == null ? '' : String(v);      // 못 읽으면 원본 그대로
  const sy = seasonYearOf(ym.y, ym.m);
  const s = SEASON_DEFS[seasonIndexOfMonth(ym.m)];
  return String(sy).slice(2) + "' " + s.label;
}

/* 디버그용: 콘솔에서 seasonCheck() 실행하면 원본 -> 라벨 매핑을 보여준다 */
function seasonCheck(n) {
  if (typeof RETAIL_DATA === 'undefined' || !RETAIL_DATA.length) {
    console.log('데이터가 아직 로드되지 않았습니다.');
    return;
  }
  const seen = new Map();
  RETAIL_DATA.forEach(d => {
    const raw = d.month;
    if (!seen.has(String(raw))) seen.set(String(raw), monthLabel(raw));
  });
  console.table([...seen].slice(0, n || 40).map(([raw, label]) => ({ 원본: raw, 시즌: label })));
  const bad = [...seen].filter(([raw, label]) => raw === label && raw !== '');
  if (bad.length) console.warn('시즌으로 변환되지 않은 값:', bad.map(b => b[0]));
}
