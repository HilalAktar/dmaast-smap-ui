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

Doğrulama: `node tests/mock-modules.verify.cjs`
