# F&F Retail Archive

전사용 리테일 아카이브 - Consumer Strategy Team

> 📊 **Live Data Source:** 여러 Google Sheets에서 직접 데이터 로드 (자동 동기화)
>
> 🎨 **3개 카테고리 그룹**: 애슬레저 · 아웃도어·스포츠 · 럭셔리

---

## 🚀 Quick Start

### 1. GitHub Pages 배포

```bash
# 1) 이 폴더 전체를 GitHub 저장소에 push
# 2) Settings → Pages → Source: main branch, root → Save
# 3) https://[username].github.io/[repo]/ 로 접속
```

### 2. Google Sheets 공유 설정 (필수!)

**3개 시트 모두** 우측 상단 **공유** 버튼 클릭 →
**"링크가 있는 모든 사용자"** → **뷰어** 권한 설정

> ⚠️ 이 설정 없으면 HTML이 시트 데이터를 못 읽어옵니다.

---

## 📁 폴더 구조

```
retail-archive/
├── index.html              ← 메인 HTML
├── README.md
├── css/
│   └── style.css           ← 전체 스타일
└── js/
    ├── config.js           ← ⚙ 설정 (시트 배열, fabric 분류 등)
    ├── state.js            ← 전역 상태
    ├── utils.js            ← 유틸 함수
    ├── sheet-loader.js     ← 다중 Google Sheets 병렬 로드 + 통합
    ├── filters.js          ← 사이드바 필터 (카테고리 그룹 포함)
    ├── gallery.js          ← 갤러리 뷰
    ├── analytics.js        ← 분석 뷰 + Fabric 히트맵
    ├── csv.js              ← CSV 다운로드
    └── app.js              ← 메인 앱 로직
```

---

## 📊 데이터 소스 (3개 시트)

`js/config.js`의 `CONFIG.SHEETS` 배열에서 관리:

| # | 시트 ID (앞 8자) | 라벨 (=카테고리 그룹) | 기본 시즌 | Fabric 컬럼 |
|---|----------------|--------------------|---------|------------|
| 1 | `1iqyZhiZ...` | 애슬레저 | 2025-12 | `fabric` (J열) |
| 2 | `1hRSkBD8...` | 아웃도어·스포츠 | 2025-09 | (없음, 비어있음) |
| 3 | `1VOOVTnp...` | 럭셔리 | 2025-12 | `material` (G열) |

### 시트별 컬럼 구조 차이

3개 시트의 컬럼이 다 다르기 때문에 `CONFIG.SHEETS[i].columns`에서 매핑을 관리:

**시트 1 (애슬레저)** - season 컬럼 없음
```
A:brand | B:gender | C:category1 | D:picture | E:product_name |
F:color | G:image_hex_color | H:image_url | I:debug | J:fabric
```

**시트 2 (아웃도어·스포츠)** - season 컬럼 있음, fabric 없음
```
A:season | B:brand | C:gender | D:category | E:picture | F:product_name |
G:image_hex_color | H:image_url | I:debug
```

**시트 3 (럭셔리)** - material 컬럼이 fabric 역할
```
A:season | B:brand | C:gender | D:category | E:picture | F:product_name |
G:material | H:color | I:image_hex_color | J:image_url | K:debug
```

---

## 🆕 시트 추가하기

새로운 시즌이나 카테고리를 추가하려면 `js/config.js`의 `CONFIG.SHEETS` 배열에 객체 하나만 추가:

```javascript
CONFIG.SHEETS.push({
  id: '시트ID여기에',
  gid: '0',
  label: '새카테고리명',       // 사이드바 카테고리 그룹으로 표시됨
  defaultSeason: '2026-03',
  columns: {
    season: 'season',         // 시트에 season 컬럼 있으면 컬럼명, 없으면 null
    brand: 'brand',
    gender: 'gender',
    category: 'category',     // 또는 'category1'
    product_name: 'product_name',
    color: 'color',           // 없으면 null
    hex: 'image_hex_color',
    image_url: 'image_url',
    debug: 'debug',
    fabric: 'fabric'          // 또는 'material', 없으면 null
  }
});
```

그리고 `BRAND_GROUP_ORDER`에 새 라벨 추가:

```javascript
const BRAND_GROUP_ORDER = ["럭셔리", "애슬레저", "아웃도어·스포츠", "새카테고리명", "기타"];
```

---

## 🎨 Fabric 자동 분류

`classifyFabric()` 함수가 시트의 자유 텍스트(예: "100% cotton", "wool blend",
"suede calfskin", "longue saison")를 12개 카테고리 중 하나로 자동 분류:

| 키 | 라벨 | 색상 |
|----|------|------|
| cotton_100 | Cotton 100% | 주황 |
| cotton_blend | Cotton Blend | 갈색 |
| denim | Denim | 파랑 |
| synth_perf | Synthetic Performance | 진주황 |
| synth_blend | Synthetic Blend | 진갈색 |
| wool_cash | Wool / Cashmere | 보라 |
| modal_tencel | Modal / Tencel | 청록 |
| down_insul | Down / Insulation | 노랑 |
| leather | Leather / Suede | 짙은 갈색 |
| fauxfur | Faux Fur / Sherpa | 베이지 |
| silk_satin | Silk / Satin | 핑크 |
| other | Other | 회색 |

분류 키워드는 `config.js`의 `classifyFabric()`에서 수정 가능.
빈값은 "미분류"로 표시되고 분석에서 제외됨.

---

## 🔧 사이드바 필터

- **Period · 시즌** - 시트별 다른 시즌이 자동으로 모임 (예: 2025-09, 2025-12)
- **Category · 카테고리** - 시트 라벨 기준 (애슬레저/아웃도어/럭셔리)
- **Brands** - 카테고리 선택 시 그 카테고리 브랜드만 표시
- **Item Categories** - top/bottom/outerwear/shoes 등
- **Fabric · 소재** - 12개 카테고리

카테고리 그룹 옆 ☐ 체크박스로 그룹 전체 브랜드 한 번에 선택/해제 가능.

---

## 💾 CSV 다운로드

분석 화면에서 3종 CSV 내보내기 가능:

1. **Color Rows** - 컬러별 raw 데이터 (제품×컬러)
2. **Product Rows** - 제품 단위 (top hex 1개씩)
3. **Color Family** - 색계열별 집계

모든 CSV에 `brand_group`, `season`, `fabric`, `fabric_group` 컬럼 포함.

---

## 🐛 트러블슈팅

**Q. "데이터 로딩 실패"가 뜸**
A. 시트 3개 모두 "링크 보유 사용자 모두 → 뷰어"인지 확인. 하나라도 누락이면 경고 표시.

**Q. 일부 시트만 로딩 실패함**
A. 콘솔(F12)에서 어느 시트인지 확인 가능. 나머지는 정상 표시됨.

**Q. fabric이 "미분류"로 잡힘**
A. 시트의 fabric 텍스트에 키워드가 매칭 안 됨. `classifyFabric()` 정규식 보강 필요.

**Q. 새 브랜드를 특정 그룹에 강제 매핑하고 싶음**
A. `BRAND_GROUP_MAP`에 추가: `"New Balance": "아웃도어·스포츠"`
   (기본은 시트 라벨로 자동 배정됨)

---

© F&F Consumer Strategy Team
