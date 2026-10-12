# Mock veri modülleri — `src/data/mock/`

**Karar (Asrınalp Şahin, 2026-09-17):** `dmaast-smap-ui-feature-kam-jpb-role-based-design`
ağacında "Planned" yer tutucu olarak duran dört sayfa, adına ve amacına uygun
**mock** içerikle dolduruldu. Bu klasördeki her dosya yalnızca sentetik,
deterministik ve açıkça işaretlenmiş mock veri taşır.

| Dosya | Sayfa | İçerik |
|---|---|---|
| `manufacturingSimMock.ts` | `/digital-twin/manufacturing-sim` | Senaryo presetleri, parametre tanımları (ShockConfig adlarıyla), firma bazlı baseline, deterministik mock motor |
| `modssMock.ts` | `/decision-support/mo-dss` | Firma bazlı amaç fonksiyonları, Pareto aday çözümler, ağırlıklı sıralama, mock öneriler |
| `sustainabilityMock.ts` | `/sustainability` | Skor kartı KPI'ları (birim/pencere/hedef), aylık trend, süreç kırılımı, döngüsellik aksiyonları |
| `knowledgeGraphMock.ts` | `/knowledge-graph` | Karar–KPI–senaryo–veri kaynağı–aktör düğümleri ve ilişkileri, SVG yerleşim koordinatları |
| `valueChainSimMock.ts` | `/digital-twin/value-chain-sim` | **(2026-10-12)** Value Chain Digital Twin arayüzünün birebir kopyası için mock motor: `getMockDemoMeta()` (= twin `GET /api/demo/metadata`) ve `runMockSimulation()` (= twin `POST /api/demo/simulate`); aynı JSON sözleşmesi, sentetik/deterministik değerler |
| `valueChainHierarchy.ts` + `valueChainHierarchyData.ts` | `/digital-twin/value-chain-sim` | Maskeli demo ürününün (021XBXXXXXXF04) BOM **yapısı** (twin `hierarchyData.json`'dan üretilmiş) ve ağaç dönüştürücüsü; stok/süre/fiyat içermez |

Kurallar:

- Her dosya bir `*_MOCK_PROVENANCE` sabiti dışa aktarır; sayfalar `MockDataBadge` /
  `MockDataNotice` ile bunu görünür kılar.
- Gerçek/canlı veri, ölçülmüş ERP rakamı, secret veya partner payload'ı **yoktur**.
  Büyüklükler yalnızca tasarım için makul ölçektedir; kalibre değildir.
- KAM (`IFS`, su sayacı PCB montajı, `021XBXXXXXXF04`) ve JPB (`Clipper`, LULYLOK
  somun işleme, `ST5253-06`) bağlamı `CompanyContext` üzerinden ayrışır; rol görünürlüğü
  `pageLayouts` + `RoleContext` izinleriyle belirlenir.
- Canlı kaynağa geçiş: mock modül → SMAP backend API (sahibi `dmaast-smap-backend-agent`).
  Motor/sıralama hesapları tarayıcıda yalnızca mock aşaması için yapılır.

Value Chain Simulation notu (Asrınalp Şahin, 2026-10-12): sayfa, twin frontend'inin
(`dmaast-value-chain-digital-twin/frontend`) `.vcdt` kapsamına alınmış birebir kopyasıdır
(`src/components/value-chain-sim/`). Backend yoktur; "Run Simulation" her basışta mock
motoru gün 0'dan hedef ufka deterministik olarak yeniden koşturur (twin'in Step Forward
semantiği). Önceki `data/sim/` pre-generated artifact akışı bu sayfa tarafından artık
kullanılmaz.

Doğrulama: `node tests/mock-modules.verify.cjs` ve `node tests/qa-mock-pages.verify.cjs`
