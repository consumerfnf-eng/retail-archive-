/* ============================================
   F&F Retail Archive - Sheet Loader (Multi-Sheet)
   여러 Google Sheets를 병렬 fetch 후 통합
   각 시트의 컬럼 매핑은 CONFIG.SHEETS[i].columns 참조
   ============================================ */

/**
 * 단일 시트 로드 + 정규화
 */
async function loadSingleSheet(sheetCfg, sheetIndex) {
  const url = CONFIG.getCsvUrl(sheetCfg);
  const cols = sheetCfg.columns;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[${sheetCfg.label}] HTTP ${res.status}`);
  }
  const csvText = await res.text();

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase()
  });

  if (parsed.errors && parsed.errors.length > 0) {
    console.warn(`[${sheetCfg.label}] CSV 파싱 경고:`, parsed.errors.slice(0, 3));
  }

  const data = [];
  parsed.data.forEach((row, i) => {
    // 컬럼 매핑으로 값 추출 (대소문자/공백 정규화 후)
    const get = (colName) => {
      if (!colName) return '';
      // header가 lowercase로 들어오므로
      return (row[colName.toLowerCase()] || '').toString().trim();
    };

    const brand = get(cols.brand);
    if (!brand) return;

    const productName = get(cols.product_name);
    if (!productName) return;

    // season 처리: 시트에 season 컬럼 있으면 그 값, 없으면 defaultSeason
let season = get(cols.season) || sheetCfg.defaultSeason;
// 모든 구분자(. / 공백)를 - 로 통일 → "2025.09", "2026. 6. 1", "2026/06" 등 흡수
season = season.replace(/[.\/\s]+/g, '-');
// 문자열 어디서든 연·월(YYYY-M 또는 YYYY-MM)을 추출 (^ $ 앵커 제거가 핵심)
const seasonMatch = season.match(/(\d{4})-(\d{1,2})/);
if (seasonMatch) {
  season = `${seasonMatch[1]}-${seasonMatch[2].padStart(2, '0')}`;
}

    // 컬러 (있을 때만)
    const colorStr = get(cols.color);
    const colors = colorStr ? colorStr.split(/,\s*/).filter(Boolean) : [];

    // hex colors
    const hexStr = get(cols.hex);
    let hexColors = [];
    if (hexStr) {
      hexColors = hexStr.split(/\s*\/\s*/)
        .map(h => h.trim())
        .filter(h => /^#[0-9A-Fa-f]{3,8}$/.test(h));
    }

    // debug에서 hex_breakdown 파싱
    const debugStr = get(cols.debug);
    let hexBreakdown = [];
    if (debugStr && debugStr !== 'failed' && debugStr.includes(':')) {
      const cleaned = debugStr.replace(/^image:\s*/i, '');
      cleaned.split(/\s*\|\s*/).forEach(part => {
        const m = part.match(/(#[0-9A-Fa-f]{3,8})\s*:\s*([0-9.]+)\s*%?/);
        if (m) {
          hexBreakdown.push({
            hex: m[1].toUpperCase(),
            pct: parseFloat(m[2])
          });
        }
      });
    }

    // fabric (시트마다 컬럼명 다름, 없으면 빈값)
    const fabricRaw = get(cols.fabric);
    const fabricKey = classifyFabric(fabricRaw);

    // 카테고리 정규화 (소문자)
    const category = (get(cols.category) || '—').toLowerCase();

    // gender
    const gender = get(cols.gender) || 'Unisex';

    // image_url
    const imageUrl = get(cols.image_url);

    // country: 시트에 country 컬럼 있으면 그 값, 없으면 sheetCfg.defaultCountry
    let country = normalizeCountry(get(cols.country)) || sheetCfg.defaultCountry || 'GL';

    // 브랜드명에 (CN)/(KR)/(EU) 태그 있으면 country 강제 오버라이드
    const brandCountryTag = getBrandCountryTag(brand);
    if (brandCountryTag) country = brandCountryTag;

    // 브랜드 그룹: MAP 명시 우선, 없으면 시트 label
    // country prefix 없이 단순하게 유지 (Country 필터로 구분)
    const brandGroup = getBrandGroup(brand) || sheetCfg.label;

    data.push({
      _id: `s${sheetIndex}-${i}`,
      _sheetLabel: sheetCfg.label,
      month: season,
      season: season,
      country: country,
      brand: brand,
      gender: gender,
      category: category,
      subcategory: '—',
      fabric: fabricRaw,
      fabricKey: fabricKey,
      product_name: productName,
      colors: colors,
      hex_colors: hexColors,
      hex_breakdown: hexBreakdown,
      image_url: imageUrl,
      brandGroup: brandGroup
    });
  });

  console.log(`[Sheet Loader] ${sheetCfg.label}: ${data.length}개 제품 로드됨`);
  return data;
}

/**
 * 모든 시트 병렬 로드 + 통합
 */
async function loadFromSheet() {
  const sheets = CONFIG.SHEETS;
  if (!sheets || !sheets.length) {
    throw new Error('CONFIG.SHEETS가 비어있습니다');
  }

  try {
    updateLoaderText(`${sheets.length}개 시트에서 데이터 가져오는 중...`);

    // 병렬 fetch
    const promises = sheets.map((s, idx) => loadSingleSheet(s, idx).catch(err => {
      console.error(`[${s.label}] 로딩 실패:`, err);
      return { __error: true, label: s.label, message: err.message };
    }));

    const results = await Promise.all(promises);

    // 에러 체크
    const errors = results.filter(r => r && r.__error);
    const successes = results.filter(r => Array.isArray(r));

    if (successes.length === 0) {
      throw new Error('모든 시트 로딩 실패: ' + errors.map(e => `${e.label}(${e.message})`).join(', '));
    }

    if (errors.length > 0) {
      console.warn(`일부 시트 로딩 실패:`, errors);
      updateLoaderText(`${errors.length}개 시트 로딩 실패. 나머지 표시 중...`);
    } else {
      updateLoaderText(`데이터 통합 중...`);
    }

    // 통합
    const combined = [].concat(...successes);
    console.log(`[Sheet Loader] 총 ${combined.length}개 제품 통합 완료`);

    return combined;

  } catch (err) {
    console.error("[Sheet Loader] 로딩 실패:", err);
    throw err;
  }
}

function updateLoaderText(msg) {
  const el = document.getElementById('loaderSub');
  if (el) el.textContent = msg;
}

function showLoaderError(msg) {
  const loader = document.getElementById('loader');
  if (!loader) return;
  loader.innerHTML = `
    <div class="loader-inner" style="max-width:480px;text-align:center;padding:0 24px">
      <div style="font-size:32px;margin-bottom:14px">⚠</div>
      <div class="loader-text" style="color:var(--warn);margin-bottom:8px">데이터 로딩 실패</div>
      <div class="loader-sub" style="line-height:1.6">${esc(msg)}</div>
      <div style="margin-top:18px;padding:12px;background:var(--panel);border-radius:6px;font-size:11.5px;color:var(--ink-soft);text-align:left;line-height:1.6">
        <b style="color:var(--ink)">확인 사항:</b><br>
        1. 모든 Google Sheets 공유 권한이 "링크 보유 사용자 모두 → 뷰어"로 되어 있나요?<br>
        2. js/config.js의 SHEETS 배열에 시트 ID가 올바른가요?<br>
        3. 네트워크 연결 상태를 확인하세요.
      </div>
      <button onclick="location.reload()" style="margin-top:14px;padding:8px 18px;background:var(--accent);color:var(--panel);border-radius:6px;font-size:12px;border:none;cursor:pointer">다시 시도</button>
    </div>
  `;
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 500);
  }
}
