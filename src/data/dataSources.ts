import type { PageId, LayoutItemType, CardScope } from '../types/pageLayout';
import { PAGE_LAYOUTS } from './pageLayouts';

/**
 * ============================================================================
 *  KONSOLIDE VERI KAYNAGI KAYIT DEFTERI  (T4.2 · alt-gorev iv)
 * ============================================================================
 *
 * AMAC: SMAP arayuzundeki her kart / KPI'in ARKASINDAKI gercek veri kaynagini
 * tek, tipli, makine-okunur bir yapida toplamak — boylece backend baglantisi
 * (fetch/axios katmani) kuruldugunda her gosterge dogrudan bir ERP tablosuna,
 * kolona ve olcume eslesir. Bu dosya "sozlesme"dir; deger uretmez.
 *
 * SU AN ARAYUZ SALT-STATIK: fetch/axios/api KATMANI YOK. mockData.ts ve
 * alerts.ts icindeki sayilar YER TUTUCUDUR. Bu kayit defteri, o sayilarin
 * hangi GERCEK kolondan gelmesi gerektigini beyan eder. Baglama isi (iii)
 * alt-gorevinin ve backend entegrasyonunun konusudur.
 *
 * ---------------------------------------------------------------------------
 * KAYNAK DURUMU (sourceStatus) — kesin anlamlari:
 *   'real'      (gercek)   : Gostergeyi belirli, DOGRULANMIS bir ham ERP
 *                            kolonu/tablosu besler; olcum gercek veri uzerinde
 *                            gosterilmistir (usable% / satir sayisi notta).
 *   'mock'      (mock)     : Ham ERP karsiligi YOK; degerler elle uydurulmus
 *                            yer tutuculardir (ornek diyagram serisi veya
 *                            motoru olmayan simulasyon/karar-destek ciktisi).
 *   'uncertain' (belirsiz) : Gosterge adlandirilmis ama ham kaynagi eksik,
 *                            kolon bos / hep sifir, belirsiz, ya da yalniz
 *                            capraz-tablo VARSAYIMIYLA hesaplanabilir —
 *                            dogrudan olcum olarak guvenilemez.
 *
 * ---------------------------------------------------------------------------
 * HAM KAYNAK YOLLARI (salt-oku, DEGISTIRILMEDI):
 *   KAM (ERP: IFS)     -> dmaast-value-chain-digital-twin/ALL_DATA/*.csv
 *   JPB (ERP: Clipper) -> DMaaST_summary/.../JPB_UC_Data/*.csv  (TAM surum)
 *
 * !! YOL UYARISI (2026-09-09 dogrulandi): Gorevde JPB icin gosterilen
 *    "jpb-value-chain-digital-twin/.../Proje JPB/JPB Database csv/" klasoru
 *    SADELESTIRILMIS surumdur — TBL_CtrlCommande orada yalnizca (NAF,
 *    DateExpedition), TBL_LOTIE ise LOT/CERTIF kolonlarini TASIMAZ ve
 *    TBL_Qual_Blocage o klasorde HIC YOK. Arayuzun dataSource metinlerinde
 *    gecen kolonlar (BLCOCCheck, TypeDefaut, CERTIF, LOT, QTEFAB, GA_NBH,
 *    CAPEMPR, TAUXHOMMETP, QTECheck ...) yalnizca yukaridaki TAM surumde
 *    (JPB_UC_Data) bulunur ve tum kolon adlari 2026-09-09'da oradan
 *    dogrulanmistir. Backend entegrasyonu Clipper tablolarinin TAM surumune
 *    baglanmalidir. (bkz. RISK/SINIR)
 * ============================================================================
 */

/** Kayit defterinde bir bagin ait oldugu firma; 'both' = iki arayuz ayni kaynak. */
export type SourceCompany = 'kam' | 'jpb' | 'both';

/** Kaynak ERP. 'none' = ham ERP kaynagi yok (mock / simulasyon ciktisi). */
export type SourceErp = 'IFS' | 'Clipper' | 'none';

export type SourceStatus = 'real' | 'mock' | 'uncertain';

/**
 * Bir kart/KPI'in TEK bir firma icin veri kaynagi bagi.
 * Ayni kart KAM ve JPB'de farkli kolonlara baglaniyorsa iki ayri kayit olur.
 */
export interface DataSourceBinding {
  /** pageLayouts.ts / KPI katalogundaki kimlik (LayoutItemDefinition.id veya KpiData.id) */
  cardId: string;
  /** Insan-okunur baslik */
  title: string;
  /** kpi | card | widget */
  itemType: LayoutItemType;
  /** pageLayouts'taki kapsam (belirtilmemisse 'both') */
  scope: CardScope;
  /** Bu kartin gorundugu sayfa(lar) */
  pages: PageId[];
  /** Bu bagin firmasi */
  company: SourceCompany;
  /** Kaynak ERP */
  erp: SourceErp;
  /** Ham kaynak tablo adi (ERP/CSV). Kaynak yoksa null. */
  sourceTable: string | null;
  /** DOGRULANMIS ham kolon adlari (gercek CSV basliklariyla birebir) */
  columns: string[];
  /** Olculen deger / metrik: ne hesaplanir (formul veya tanim) */
  measure: string;
  /** Birim (varsa) */
  unit?: string;
  /** gercek | mock | belirsiz */
  sourceStatus: SourceStatus;
  /** Kolonlarin dogrulandigi ham dosya (kanit) */
  verifiedIn?: string;
  /** Gerekce / cekince / olcum notu (usable%, satir sayisi, neden belirsiz vb.) */
  note?: string;
  /** Bir 'widget' ise: hangi KPI kimliklerini birlestirir */
  derivedFrom?: string[];
}

// Ham dosya yolu kisayollari (kanit referansi; salt-oku)
const KAM = 'dmaast-value-chain-digital-twin/ALL_DATA';
const JPB = 'DMaaST_summary/.../JPB_UC_Data (tam surum)';

export const DATA_SOURCES: DataSourceBinding[] = [
  // ==========================================================================
  // KPI'lar
  // ==========================================================================

  // -- production-throughput ------------------------------------------------
  {
    cardId: 'production-throughput', title: 'Production Throughput', itemType: 'kpi',
    scope: 'both', pages: ['dashboard', 'value-chain', 'manufacturing', 'product'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Shop Orders - Assembly', columns: ['Completed Qty', 'Lot Size', 'Finish Date'],
    measure: 'Uretilen adet (Completed Qty). units/day icin GUNLUK zaman temeli yok.',
    unit: 'units/day', sourceStatus: 'uncertain', verifiedIn: `${KAM}/Shop Orders - Assembly.csv`,
    note: 'Aday kolon dogrulandi ama "gun basi" (throughput) icin fiili uretim gunu ayrimi yok; mockData degeri (1248) yer tutucu.',
  },
  {
    cardId: 'production-throughput', title: 'Production Throughput', itemType: 'kpi',
    scope: 'both', pages: ['dashboard', 'value-chain', 'manufacturing', 'product'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBLVIEW_NBPOINT_SUIVIPROD', columns: ['NBPIE', 'NAF', 'PHASE'],
    measure: 'Uretilen parca adedi (NBPIE). 5.779 satir.',
    unit: 'units/day', sourceStatus: 'uncertain', verifiedIn: `${JPB}/TBLVIEW_NBPOINT_SUIVIPROD  (production follow up).csv`,
    note: 'Parca sayisi var ama gun basi orana cevirecek guvenilir tarih boyutu bu goruntude yok.',
  },

  // -- defect-rate (iki firmada da GERCEK) ----------------------------------
  {
    cardId: 'defect-rate', title: 'Defect Rate', itemType: 'kpi',
    scope: 'both', pages: ['dashboard', 'manufacturing', 'product'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Receipts', columns: ['Scrapped Qty', 'Arrived Qty'],
    measure: 'Scrapped Qty / Arrived Qty (kabul edilen mala gore hurda payi)', unit: '%',
    sourceStatus: 'real', verifiedIn: `${KAM}/Receipts.csv`,
    note: 'Olculdu 2026-09-02: KAM %0,79 (pcs).',
  },
  {
    cardId: 'defect-rate', title: 'Defect Rate', itemType: 'kpi',
    scope: 'both', pages: ['dashboard', 'manufacturing', 'product'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBLVIEW_NBPOINT_SUIVIPROD', columns: ['NBPIEABIME', 'NBPIE'],
    measure: 'NBPIEABIME / NBPIE (hasarli parca / toplam parca)', unit: '%',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBLVIEW_NBPOINT_SUIVIPROD  (production follow up).csv`,
    note: 'Olculdu 2026-09-02: JPB %2,04 · 5.779 satir.',
  },

  // -- yield-rate -----------------------------------------------------------
  {
    cardId: 'yield-rate', title: 'Yield Rate', itemType: 'kpi',
    scope: 'both', pages: ['manufacturing', 'product'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Shop Orders - Assembly', columns: ['Completed Qty', 'Lot Size', 'Operation Scrapped'],
    measure: 'Iyi adet / baslatilan adet. KAM"da baslatilan-vs-iyi ayrimi net degil.', unit: '%',
    sourceStatus: 'uncertain', verifiedIn: `${KAM}/Shop Orders - Assembly.csv`,
    note: 'Ilk-gecis / iyi urun ayrimi tek kolonda yok; mockData degeri (98,2) yer tutucu.',
  },
  {
    cardId: 'yield-rate', title: 'Yield Rate', itemType: 'kpi',
    scope: 'both', pages: ['manufacturing', 'product'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBLVIEW_NBPOINT_SUIVIPROD', columns: ['NBPIE', 'NBPIEABIME'],
    measure: 'NBPIE / (NBPIE + NBPIEABIME) (saglam parca payi)', unit: '%',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBLVIEW_NBPOINT_SUIVIPROD  (production follow up).csv`,
    note: 'defect-rate ile ayni tablodan turetilir (1 - defect).',
  },

  // -- lead-time ------------------------------------------------------------
  {
    cardId: 'lead-time', title: 'End-to-End Lead Time', itemType: 'kpi',
    scope: 'both', pages: ['dashboard', 'value-chain', 'logistics'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Ext Customer Order Lines', columns: ['Created', 'Last Actual Ship Date', 'Promised Delivery Date/Time'],
    measure: 'Siparis olusturma -> fiili sevk arasi gecen sure', unit: 'days',
    sourceStatus: 'real', verifiedIn: `${KAM}/Ext Customer Order Lines.csv`,
    note: 'Tarih kolonlari dolu; fiili TESLIM tarihi yok, uctan-uca sure alt-sinirdir.',
  },
  {
    cardId: 'lead-time', title: 'End-to-End Lead Time', itemType: 'kpi',
    scope: 'both', pages: ['dashboard', 'value-chain', 'logistics'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_AFFAIRE + TBL_BL (TBL_AFF_BL ile join)', columns: ['DATEAF', 'DDP', 'DATEBL', 'NAF', 'NUMBL'],
    measure: 'Is emri acilis (DATEAF) -> irsaliye tarihi (DATEBL); 3 tablo join', unit: 'days',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_AFFAIRE (business table).csv · TBL_BL  (delivery note).csv`,
    note: 'field_status: Ship_Delay_Days CALCULABLE_WITH_ASSUMPTIONS · 10.378 satir.',
  },

  // -- delivery-accuracy ----------------------------------------------------
  {
    cardId: 'delivery-accuracy', title: 'Delivery Accuracy', itemType: 'kpi',
    scope: 'both', pages: ['dashboard', 'value-chain', 'logistics'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Ext Customer Order Lines', columns: ['Promised Delivery Date/Time', 'Last Actual Ship Date', 'Delivered Qty'],
    measure: 'Soz verilen tarihte ve tam gonderilen siparis satiri payi (OTIF)', unit: '%',
    sourceStatus: 'real', verifiedIn: `${KAM}/Ext Customer Order Lines.csv`,
    note: 'late-delivery-rate ile ayni kaynak (tersi). mockData degeri (96,8) yer tutucu.',
  },
  {
    cardId: 'delivery-accuracy', title: 'Delivery Accuracy', itemType: 'kpi',
    scope: 'both', pages: ['dashboard', 'value-chain', 'logistics'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_BL + TBL_AFFAIRE (TBL_AFF_BL ile join)', columns: ['DATEBL', 'DDP', 'NAF', 'NUMBL'],
    measure: 'DATEBL <= DDP olan irsaliye payi (zamaninda teslim)', unit: '%',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_BL  (delivery note).csv · TBL_AFFAIRE (business table).csv`,
    note: 'field_status: Delivery_Delay CALCULABLE_WITH_ASSUMPTIONS · 10.378 satir.',
  },

  // -- inventory-turnover  (BASLIK: Inventory Value — DEVIR HIZI DEGIL) ------
  {
    cardId: 'inventory-turnover', title: 'Inventory Value', itemType: 'kpi',
    scope: 'both', pages: ['value-chain', 'logistics', 'dashboard'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Inventory Part in Stock', columns: ['Total Inventory Value', 'On Hand Qty', 'Unit Cost'],
    measure: 'Stok DEGERI toplami (Total Inventory Value)', unit: 'value',
    sourceStatus: 'real', verifiedIn: `${KAM}/Inventory Part in Stock.csv`,
    note: 'DIKKAT: bu bir DEGER, devir hizi degil. 1.380 satir %100 dolu, toplam 85.300.998; stok tek anlik goruntu (19 Kas 2024) -> devir hizi kurulamaz.',
  },
  {
    cardId: 'inventory-turnover', title: 'Inventory Value', itemType: 'kpi',
    scope: 'both', pages: ['value-chain', 'logistics', 'dashboard'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_LOTIE + TBL_STOCK', columns: ['QTE', 'MONTANT', 'COARTI'],
    measure: 'TBL_LOTIE.QTE × (TBL_STOCK.MONTANT / QTE) — birim maliyet YAKLASIK', unit: 'value',
    sourceStatus: 'uncertain', verifiedIn: `${JPB}/TBL_LOTIE (batch table).csv`,
    note: 'field_status: Total_Inventory_Value MEDIUM · 34.861 satir · %5 null; MONTANT hareket basi, birim maliyet varsayimi gerekir.',
  },

  // -- cost-efficiency  (BASLIK: Unit Cost) ---------------------------------
  {
    cardId: 'cost-efficiency', title: 'Unit Cost', itemType: 'kpi',
    scope: 'both', pages: ['value-chain', 'manufacturing', 'dashboard'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Ext Customer Order Lines', columns: ['Total Cost/Base', 'Net Amt/Base'],
    measure: 'Toplam maliyet / net gelir (maliyet-gelir orani)', unit: '%',
    sourceStatus: 'real', verifiedIn: `${KAM}/Ext Customer Order Lines.csv`,
    note: '549 satir, olculen oran %37,36.',
  },
  {
    cardId: 'cost-efficiency', title: 'Unit Cost', itemType: 'kpi',
    scope: 'both', pages: ['value-chain', 'manufacturing', 'dashboard'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_GAMME', columns: ['TAUXHOMMETP', 'TAUXHOMMETU'],
    measure: 'Islem birim maliyeti (isci saat ucreti)', unit: '%',
    sourceStatus: 'uncertain', verifiedIn: `${JPB}/TBL_GAMME (manufacturing process routing table).csv`,
    note: 'TAUXHOMMETP/TAUXHOMMETU 244.290 satirda HEP 0 -> JPB"de olculemez.',
  },

  // -- supplier-reliability (iki firmada da KURULAMAZ) ----------------------
  {
    cardId: 'supplier-reliability', title: 'Supplier Reliability', itemType: 'kpi',
    scope: 'both', pages: ['value-chain'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Purchase Order Lines', columns: ['Planned Receipt Date', 'Planned Arrival Date', 'Supplier'],
    measure: 'Tedarikci zamaninda teslim payi', unit: '%',
    sourceStatus: 'uncertain', verifiedIn: `${KAM}/Purchase Order Lines.csv`,
    note: 'KAM"da FIILI kabul tarihi yok (yalniz Planned Receipt Date); plana gore olcum guvenilir degil.',
  },
  {
    cardId: 'supplier-reliability', title: 'Supplier Reliability', itemType: 'kpi',
    scope: 'both', pages: ['value-chain'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: null, columns: [],
    measure: 'Tedarikci zamaninda teslim payi', unit: '%',
    sourceStatus: 'uncertain',
    note: 'JPB"de tedarikci master"i / tedarikci performans tablosu HIC YOK -> kurulamaz.',
  },

  // -- completion-rate (JPB) ------------------------------------------------
  {
    cardId: 'completion-rate', title: 'Completion Rate', itemType: 'kpi',
    scope: 'jpb', pages: ['manufacturing'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBLVIEW_NBPOINT_SUIVIPROD + TBL_GAMME', columns: ['NBPIE', 'NAF', 'QTEFAB'],
    measure: 'max(NBPIE per NAF) / QTEFAB (uretilen / siparis edilen)', unit: '%',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBLVIEW_NBPOINT_SUIVIPROD  (production follow up).csv · TBL_GAMME (...).csv`,
    note: 'usable %99,9. QTEFAB TBL_GAMME"de dogrulandi.',
  },

  // -- late-delivery-rate (KAM) ---------------------------------------------
  {
    cardId: 'late-delivery-rate', title: 'Late Delivery Rate', itemType: 'kpi',
    scope: 'kam', pages: ['logistics'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Ext Customer Order Lines', columns: ['Promised Delivery Date/Time', 'Last Actual Ship Date'],
    measure: 'Soz verilen tarihten sonra sevk edilen siparis satiri payi', unit: '%',
    sourceStatus: 'real', verifiedIn: `${KAM}/Ext Customer Order Lines.csv`,
    note: 'Olculdu 2026-08-31: 84/626 satir gec (%13,4), ort. 3,7 g, en kotu 36 g. alerts.ts kam-late-delivery ile ayni kaynak.',
  },

  // -- avg-transit-time (KAM) -----------------------------------------------
  {
    cardId: 'avg-transit-time', title: 'Avg Transit Time', itemType: 'kpi',
    scope: 'kam', pages: ['logistics'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Shipments + Receipts', columns: ['Actual Ship Date', 'Actual Delivery Date'],
    measure: 'Fiili sevk -> fiili teslim arasi gecen sure', unit: 'days',
    sourceStatus: 'real', verifiedIn: `${KAM}/Shipments.csv · Receipts.csv`,
    note: 'Actual_Ship_Date %100 + Actual_Delivery_Date %99,2. JPB"de karsiligi yok (DUREETRANS %0 dolu).',
  },

  // -- dispatch-conformity (JPB) --------------------------------------------
  {
    cardId: 'dispatch-conformity', title: 'Dispatch Conformity Check', itemType: 'kpi',
    scope: 'jpb', pages: ['logistics'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_CtrlCommande', columns: ['BLCOCCheck'],
    measure: 'Irsaliye uygunluk kontrolunu gecen sevkiyat payi', unit: '%',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_CtrlCommande (order control table).csv`,
    note: 'usable %81,1.',
  },

  // -- first-pass-yield (JPB) -----------------------------------------------
  {
    cardId: 'first-pass-yield', title: 'First Pass Yield', itemType: 'kpi',
    scope: 'jpb', pages: ['product'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_CtrlCommande', columns: ['QTECheck', 'QTELOTIE', 'QTEAF'],
    measure: 'Ilk kontrolde gecen (kontrol edilen) parca payi', unit: '%',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_CtrlCommande (order control table).csv`,
    note: 'Parts_Inspected_Qty (QTECheck) usable %33,8 — kapsam dusuk. KAM"da ilk-gecis ayrimi yok.',
  },

  // -- rework-rate (JPB) ----------------------------------------------------
  {
    cardId: 'rework-rate', title: 'Rework Rate', itemType: 'kpi',
    scope: 'jpb', pages: ['product'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_POINT / TBL_GAMME', columns: ['COFRAIS'],
    measure: 'COFRAIS = RETCH (retouch/rework) olan islem payi', unit: '%',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_POINT (workstation-operation point table).csv`,
    note: 'usable %100 (COFRAIS masraf kodu RETCH payi).',
  },

  // -- quality-hold-rate (JPB) ----------------------------------------------
  {
    cardId: 'quality-hold-rate', title: 'Quality Hold Rate', itemType: 'kpi',
    scope: 'jpb', pages: ['product'],
    company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_LOTIE (TBL_Qual_Blocage ile join)', columns: ['BLOCAGE', 'QTE'],
    measure: 'BLOCAGE"li (kalite bekletme) lot payi', unit: '%',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_LOTIE (batch table).csv · TBL_Qual_Blocage (quality blocking table).csv`,
    note: 'usable %98. BLOCAGE=101 -> QUARANTAINE (TBL_Qual_Blocage COPAR/DESPAR). alerts.ts jpb-quarantine ile ayni kaynak.',
  },

  // -- inspection-coverage (KAM) --------------------------------------------
  {
    cardId: 'inspection-coverage', title: 'Inspection Coverage', itemType: 'kpi',
    scope: 'kam', pages: ['product'],
    company: 'kam', erp: 'IFS',
    sourceTable: 'Receipts', columns: ['Inspected Qty', 'Qty to Inspect', 'Arrived Qty'],
    measure: 'Muayene edilen miktar / kabul edilen miktar', unit: '%',
    sourceStatus: 'real', verifiedIn: `${KAM}/Receipts.csv`,
    note: 'usable %20,8 — kapsam dusuk, gosterge olarak okunmali (garanti degil).',
  },

  // ==========================================================================
  // KATALOGDA OLAN AMA HICBIR SAYFA KAYIT DEFTERINDE OLMAYAN KPI'lar
  // (mockData.dashboardKpis icinde durur, ekranda cizilmez — kaynagi yok)
  // ==========================================================================
  {
    cardId: 'equipment-availability', title: 'Equipment Availability', itemType: 'kpi',
    scope: 'both', pages: [], company: 'both', erp: 'none',
    sourceTable: null, columns: [],
    measure: 'Planli surenin ekipmanin calisir oldugu payi (OEE Availability bacagi)', unit: '%',
    sourceStatus: 'uncertain', verifiedIn: `${KAM}/Routing Operations.csv · ${JPB}/TBL_GAMME`,
    note: 'Availability bacagi iki firmada da OLCULEMEZ: KAM "Machine No" 1502/1502 satirda BOS · JPB "CAPEMPR" 244.290 satirda HEP 0. Kayit defterinden cikarildi; katalogda artik (2026-09-02).',
  },
  {
    cardId: 'oee', title: 'OEE', itemType: 'kpi',
    scope: 'both', pages: [], company: 'both', erp: 'none',
    sourceTable: null, columns: [],
    measure: 'Availability × Performance × Quality', unit: '%',
    sourceStatus: 'uncertain',
    note: 'Availability bacagi yok (bkz. equipment-availability) -> OEE kurulamaz. Sayfalardan cikarildi (2026-08-30/09-02); katalog artigi.',
  },
  {
    cardId: 'energy-per-unit', title: 'Energy per Unit', itemType: 'kpi',
    scope: 'both', pages: [], company: 'both', erp: 'none',
    sourceTable: null, columns: [],
    measure: 'Birim urun basi elektrik tuketimi', unit: 'kWh/unit',
    sourceStatus: 'uncertain',
    note: 'Enerji alani iki firmanin ~3.200 kolonunda da YOK (MES/SCADA/IoT gerekir). Katalog artigi.',
  },
  {
    cardId: 'carbon-footprint', title: 'Carbon Footprint', itemType: 'kpi',
    scope: 'both', pages: [], company: 'both', erp: 'none',
    sourceTable: null, columns: [],
    measure: 'Birim urun basi CO2 esdegeri emisyon', unit: 'kg CO2/unit',
    sourceStatus: 'uncertain',
    note: 'Emisyon alani iki firmanin verisinde de YOK. Katalog artigi.',
  },

  // ==========================================================================
  // KARTLAR — Value Chain DT
  // ==========================================================================
  {
    cardId: 'supply-chain-flow', title: 'Supply Chain Flow', itemType: 'card',
    scope: 'both', pages: ['value-chain'], company: 'both', erp: 'none',
    sourceTable: null, columns: [],
    measure: 'Tedarik zinciri agi (dugum + akis) gorsellestirmesi',
    sourceStatus: 'mock', verifiedIn: 'src/data/mockData.ts:valueChainNodes',
    note: 'valueChainNodes elle uydurulmus (Raw Material Supplier A/B, European Market...). Ham ERP karsiligi yok.',
  },
  {
    cardId: 'network-nodes', title: 'Network Nodes', itemType: 'card',
    scope: 'both', pages: ['value-chain'], company: 'both', erp: 'none',
    sourceTable: null, columns: [],
    measure: 'Ag dugumleri metrik kartlari',
    sourceStatus: 'mock', verifiedIn: 'src/data/mockData.ts:valueChainNodes',
    note: 'supply-chain-flow ile ayni mock kaynak.',
  },
  {
    cardId: 'lead-time-trend', title: 'Lead Time Trend', itemType: 'card',
    scope: 'both', pages: ['value-chain'], company: 'both', erp: 'IFS',
    sourceTable: 'KAM: Ext Customer Order Lines · JPB: TBL_AFFAIRE/TBL_BL',
    columns: ['Created', 'Last Actual Ship Date', 'DATEAF', 'DATEBL'],
    measure: 'Lead time"in zaman icindeki egilimi',
    sourceStatus: 'uncertain', verifiedIn: `${KAM}/Ext Customer Order Lines.csv · ${JPB}/TBL_BL`,
    note: 'lead-time ile ayni kolonlar; zaman serisine bolecek donem alani net degil, gosterilen seri yer tutucu.',
  },
  {
    cardId: 'order-status', title: 'Order Status', itemType: 'card',
    scope: 'both', pages: ['value-chain'], company: 'kam', erp: 'IFS',
    sourceTable: 'Ext Customer Order Lines', columns: ['Order Status', 'Status', 'Delivered Qty'],
    measure: 'Siparislerin durum dagilimi',
    sourceStatus: 'real', verifiedIn: `${KAM}/Ext Customer Order Lines.csv`,
    note: 'Durum kolonlari dolu.',
  },
  {
    cardId: 'order-status', title: 'Order Status', itemType: 'card',
    scope: 'both', pages: ['value-chain'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_AFFAIRE', columns: ['ETATAF', 'QTEAF', 'QTEFAB'],
    measure: 'Is emri (affaire) durum dagilimi (ETATAF)',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_AFFAIRE (business table).csv`,
    note: 'ETATAF is durumu kolonu dogrulandi.',
  },

  // ==========================================================================
  // KARTLAR — Manufacturing DT
  // ==========================================================================
  {
    cardId: 'production-output', title: 'Production Output', itemType: 'card',
    scope: 'both', pages: ['manufacturing', 'manufacturing-sim'], company: 'kam', erp: 'IFS',
    sourceTable: 'Shop Orders - Assembly', columns: ['Completed Qty', 'Finish Date'],
    measure: 'Zaman icinde tamamlanan uretim adedi',
    sourceStatus: 'uncertain', verifiedIn: `${KAM}/Shop Orders - Assembly.csv`,
    note: 'production-throughput ile ayni belirsizlik (gun temeli). manufacturing-sim"de simulasyon ciktisi olarak da kullanilir.',
  },
  {
    cardId: 'production-output', title: 'Production Output', itemType: 'card',
    scope: 'both', pages: ['manufacturing', 'manufacturing-sim'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBLVIEW_NBPOINT_SUIVIPROD', columns: ['NBPIE', 'NAF', 'PHASE'],
    measure: 'Faz basi uretilen parca adedi',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBLVIEW_NBPOINT_SUIVIPROD  (production follow up).csv`,
    note: 'Adet dogru; manufacturing-sim baglaminda simulasyon ciktisidir.',
  },
  {
    cardId: 'cycle-time-analysis', title: 'Cycle Time Analysis', itemType: 'card',
    scope: 'jpb', pages: ['manufacturing'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_POINT', columns: ['TPSPASSE', 'DAT', 'DATEFIN', 'NAF'],
    measure: 'Fiili uretim/islem suresi (TPSPASSE)', unit: 'hours',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_POINT (workstation-operation point table).csv`,
    note: 'Actual_Production_Hours (TPSPASSE) usable %97,7. KAM"da yalniz planlanan (%30,6).',
  },
  {
    cardId: 'oee-breakdown', title: 'OEE Breakdown', itemType: 'card',
    scope: 'both', pages: ['manufacturing'], company: 'both', erp: 'none',
    sourceTable: null, columns: [],
    measure: 'OEE bacaklarinin (A/P/Q) kaynagini ve bagli olup olmadigini gosterir',
    sourceStatus: 'uncertain', verifiedIn: `${KAM}/Routing Operations.csv · ${JPB}/TBL_GAMME`,
    note: 'DEGER gostermez; teshis karti. Quality bacagi gercek (defect-rate), Availability bacagi iki firmada da yok (Machine No bos / CAPEMPR sifir).',
  },
  {
    cardId: 'machine-status', title: 'Machine Status', itemType: 'card',
    scope: 'both', pages: ['manufacturing'], company: 'kam', erp: 'IFS',
    sourceTable: 'Routing Operations', columns: ['Machine No', 'Work Center No'],
    measure: 'Makine calisma/durus durumu',
    sourceStatus: 'uncertain', verifiedIn: `${KAM}/Routing Operations.csv`,
    note: 'KAM "Machine No" 1502/1502 satirda BOS -> makine kimligi yok, durus kurulamaz.',
  },
  {
    cardId: 'machine-status', title: 'Machine Status', itemType: 'card',
    scope: 'both', pages: ['manufacturing'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_GAMME', columns: ['CAPEMPR'],
    measure: 'Makine kapasite/durum',
    sourceStatus: 'uncertain', verifiedIn: `${JPB}/TBL_GAMME (manufacturing process routing table).csv`,
    note: 'JPB "CAPEMPR" 244.290 satirda HEP 0 -> makine durumu kurulamaz.',
  },
  {
    cardId: 'material-readiness', title: 'Material Readiness', itemType: 'card',
    scope: 'kam', pages: ['manufacturing'], company: 'kam', erp: 'IFS',
    sourceTable: 'Shop Orders - Assembly / Shop Order Materials - Assembly',
    columns: ['Shop Order Material Summary Status', 'Material Line Status', 'Qty Issued', 'Qty Required'],
    measure: 'Is emri malzeme hazirlik durumu dagilimi',
    sourceStatus: 'real', verifiedIn: `${KAM}/Shop Orders - Assembly.csv · Shop Order Materials - Assembly.csv`,
    note: 'Shop Order Material Summary Status olculdu: tekil=3 (760 Completely Issued / 208 Partially Issued / 2 Not Reserved).',
  },
  {
    cardId: 'actual-vs-planned-hours', title: 'Actual vs Planned Hours', itemType: 'card',
    scope: 'jpb', pages: ['manufacturing'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_POINT (actual) + TBL_GAMME (planned)', columns: ['TPSPASSE', 'GA_NBH'],
    measure: 'Fiili saat (TPSPASSE) vs tahmini saat (GA_NBH)', unit: 'hours',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_POINT (...).csv · TBL_GAMME (...).csv`,
    note: 'Actual %97,7 ↔ Estimated (GA_NBH) %26,7.',
  },

  // ==========================================================================
  // KARTLAR — Logistics DT
  // ==========================================================================
  {
    cardId: 'shipment-stats', title: 'Shipment Status Cards', itemType: 'card',
    scope: 'both', pages: ['logistics'], company: 'kam', erp: 'IFS',
    sourceTable: 'Shipments', columns: ['Shipment Status', 'Actual Ship Date'],
    measure: 'Sevkiyat durum dagilimi (ozet kart)',
    sourceStatus: 'real', verifiedIn: `${KAM}/Shipments.csv`,
    note: 'Shipment_Status usable %100.',
  },
  {
    cardId: 'shipment-stats', title: 'Shipment Status Cards', itemType: 'card',
    scope: 'both', pages: ['logistics'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_AFFAIRE / TBL_BL', columns: ['RESTE'],
    measure: 'Sevkiyat durum dagilimi',
    sourceStatus: 'uncertain', verifiedIn: `${JPB}/TBL_AFFAIRE (business table).csv`,
    note: 'JPB karsiligi RESTE %27,5 — zayif kapsam, guvenilir durum ayrimi yok.',
  },
  {
    cardId: 'volume-trend', title: 'Volume Trend', itemType: 'card',
    scope: 'both', pages: ['logistics'], company: 'kam', erp: 'IFS',
    sourceTable: 'Shipments', columns: ['Actual Ship Date', 'Net Weight'],
    measure: 'Sevkiyat hacminin zaman egilimi',
    sourceStatus: 'real', verifiedIn: `${KAM}/Shipments.csv`,
    note: 'Sevk tarihi kolonu dolu; gosterilen seri yer tutucu.',
  },
  {
    cardId: 'volume-trend', title: 'Volume Trend', itemType: 'card',
    scope: 'both', pages: ['logistics'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_BL', columns: ['DATEBL', 'NUMBL'],
    measure: 'Irsaliye hacminin zaman egilimi',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_BL  (delivery note).csv`,
    note: '44.591 irsaliye satiri; gosterilen seri yer tutucu.',
  },
  {
    cardId: 'active-shipments', title: 'Active Shipments', itemType: 'card',
    scope: 'kam', pages: ['logistics'], company: 'kam', erp: 'IFS',
    sourceTable: 'Shipments', columns: ['Shipment Status', 'Shipment ID', 'Actual Ship Date'],
    measure: 'Acik/aktif sevkiyat listesi',
    sourceStatus: 'real', verifiedIn: `${KAM}/Shipments.csv`,
    note: 'Shipment_Status %100. JPB"de karsiligi RESTE %27,5 -> alinmadi.',
  },

  // ==========================================================================
  // KARTLAR — Product DT
  // ==========================================================================
  {
    cardId: 'quality-trend', title: 'Quality Trend by Batch', itemType: 'card',
    scope: 'both', pages: ['product'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_LOTIE / TBL_CtrlCommande', columns: ['BLOCAGE', 'DATEREC', 'QTECheck'],
    measure: 'Parti (lot) bazinda kalite egilimi',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_LOTIE (batch table).csv`,
    note: 'JPB parti tutar (LOT); KAM parti tutmaz -> egilim JPB"de anlamli.',
  },
  {
    cardId: 'quality-trend', title: 'Quality Trend by Batch', itemType: 'card',
    scope: 'both', pages: ['product'], company: 'kam', erp: 'IFS',
    sourceTable: 'Receipts', columns: ['Inspected Qty', 'Approved Date', 'Inspection Code'],
    measure: 'Kabul bazinda kalite egilimi (KAM parti tutmaz)',
    sourceStatus: 'uncertain', verifiedIn: `${KAM}/Receipts.csv`,
    note: 'KAM"da lot/batch izi yok; kabul bazinda yaklasik, "batch" ekseni JPB kadar guvenilir degil.',
  },
  {
    cardId: 'defect-distribution', title: 'Defect Distribution', itemType: 'card',
    scope: 'jpb', pages: ['product'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_CtrlCommande', columns: ['TypeDefaut', 'Defaut', 'Resolution'],
    measure: 'Hata TIPI dagilimi (Supply/Etiquette/Quantite/Visuel...)',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_CtrlCommande (order control table).csv`,
    note: 'alerts.ts jpb-quality-nonconformity ile ayni kaynak. KAM"da hata TIPI yok, yalniz adet.',
  },
  {
    cardId: 'product-variants', title: 'Product Variants Performance', itemType: 'card',
    scope: 'both', pages: ['product'], company: 'kam', erp: 'IFS',
    sourceTable: 'Ext Customer Order Lines / Inventory Parts', columns: ['Sales Part No', 'Configuration ID', 'Part No'],
    measure: 'Urun varyanti bazinda performans',
    sourceStatus: 'uncertain', verifiedIn: `${KAM}/Ext Customer Order Lines.csv`,
    note: 'Varyant/konfigurasyon kirilimi net degil; performans metrigi belirsiz.',
  },
  {
    cardId: 'product-variants', title: 'Product Variants Performance', itemType: 'card',
    scope: 'both', pages: ['product'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_AFFAIRE', columns: ['PIECE', 'MODELE'],
    measure: 'Urun modeli (MODELE) bazinda performans',
    sourceStatus: 'uncertain', verifiedIn: `${JPB}/TBL_AFFAIRE (business table).csv`,
    note: 'MODELE/PIECE kolonu var ama performans metrigine baglanan olcum belirsiz.',
  },
  {
    cardId: 'component-traceability', title: 'Component Traceability', itemType: 'card',
    scope: 'jpb', pages: ['product'], company: 'jpb', erp: 'Clipper',
    sourceTable: 'TBL_LOTIE', columns: ['LOT', 'CERTIF', 'DATEREC', 'BLOCAGE', 'QTE', 'COARTI'],
    measure: 'Parti izlenebilirligi (lot -> sertifika -> blokaj -> tarih)',
    sourceStatus: 'real', verifiedIn: `${JPB}/TBL_LOTIE (batch table).csv`,
    note: 'LOT %99,4 · CERTIF %28,1 · DATEREC/BLOCAGE/QTE %100. KAM parti tutmaz ve bu tabloda tedarikci kolonu yok -> KAM"da kurulamaz.',
  },
  {
    cardId: 'receipt-inspection', title: 'Receipt Inspection', itemType: 'card',
    scope: 'kam', pages: ['product'], company: 'kam', erp: 'IFS',
    sourceTable: 'Receipts', columns: ['Inspected Qty', 'Qty to Inspect', 'Arrived Qty', 'Inspection Code', 'QC Analyst'],
    measure: 'Kabul muayenesi (kabul basi muayene sonucu)',
    sourceStatus: 'real', verifiedIn: `${KAM}/Receipts.csv`,
    note: '999 kabul / 150 parca; bes kolon da %100 dolu. component-traceability"nin KAM karsiligi (ayri yapi).',
  },

  // ==========================================================================
  // WIDGET'lar — Dashboard (KPI birlestirici veya mock diyagram)
  // ==========================================================================
  {
    cardId: 'quick-stats', title: 'Quick Stats', itemType: 'widget',
    scope: 'both', pages: ['dashboard'], company: 'both', erp: 'IFS',
    sourceTable: null, columns: [],
    measure: 'Uc KPI"i birlestiren serit',
    sourceStatus: 'real', derivedFrom: ['production-throughput', 'defect-rate', 'lead-time'],
    note: 'Kendi kaynagi yok; kpiIds"deki KPI kayitlarindan beslenir. Durum, en zayif alt-KPI kadar guvenilir (throughput belirsiz).',
  },
  {
    cardId: 'kpi-primary', title: 'Primary KPIs', itemType: 'widget',
    scope: 'both', pages: ['dashboard'], company: 'both', erp: 'IFS',
    sourceTable: null, columns: [],
    measure: 'Bes birincil KPI serit',
    sourceStatus: 'real', derivedFrom: ['production-throughput', 'yield-rate', 'defect-rate', 'lead-time', 'delivery-accuracy'],
    note: 'Kendi kaynagi yok; kpiIds"deki KPI kayitlarindan beslenir.',
  },
  {
    cardId: 'kpi-secondary', title: 'Secondary KPIs', itemType: 'widget',
    scope: 'kam', pages: ['dashboard'], company: 'kam', erp: 'IFS',
    sourceTable: null, columns: [],
    measure: 'Iki ikincil KAM KPI serit',
    sourceStatus: 'real', derivedFrom: ['inventory-turnover', 'cost-efficiency'],
    note: 'KAM"a ozel; inventory-turnover (Inventory Value) + cost-efficiency (Unit Cost) kayitlarindan beslenir.',
  },
  {
    cardId: 'production-trend', title: 'Production Trend', itemType: 'widget',
    scope: 'both', pages: ['dashboard'], company: 'both', erp: 'none',
    sourceTable: null, columns: [],
    measure: 'Gunluk uretim vs hedef egilimi',
    sourceStatus: 'mock', verifiedIn: 'src/data/mockData.ts:productionTrendData',
    note: 'productionTrendData sabit (Mon..Sun); throughput"un gun temeli olmadigi icin gercek kaynaga baglanamiyor.',
  },
  {
    cardId: 'alerts', title: 'Recent Alerts', itemType: 'widget',
    scope: 'both', pages: ['dashboard'], company: 'both', erp: 'IFS',
    sourceTable: 'bkz. src/data/alerts.ts (ham veriden olculmus 4 alarm)',
    columns: ['Promised Delivery Date/Time', 'Last Actual Ship Date', 'Safety Stock', 'On Hand Qty', 'BLOCAGE', 'TypeDefaut', 'BLCOCCheck'],
    measure: 'Firma-olcumlu ornek alarmlar (KAM 2 + JPB 2)',
    sourceStatus: 'real', verifiedIn: 'src/data/alerts.ts',
    note: 'MEASURED_ALERTS dordu de ham veriden olculmustur; SMAP"te KAM ve JPB dataSource"larini dogrulayan tek yer.',
  },

  // ==========================================================================
  // SIMULASYON / KARAR-DESTEK KARTLARI
  // (value-chain-sim, manufacturing-sim, mo-dss, scheduling)
  // Hicbiri ham ERP kolonuna baglanmaz: bir simulasyon/optimizasyon MOTORU
  // ciktisidir ve SMAP"te o motor YOK. Degerler mockData"da yer tutucudur.
  // ==========================================================================
  {
    cardId: 'baseline-metrics', title: 'Baseline State Cards', itemType: 'card',
    scope: 'both', pages: ['value-chain-sim', 'manufacturing-sim'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Simulasyon baslangic (baseline) durum kartlari',
    sourceStatus: 'mock', verifiedIn: 'src/data/mockData.ts:simulationScenarios',
    note: 'Baseline aslinda GERCEK KPI"lardan beslenmeli (real kayitlar); su an simulationScenarios yer tutucu.',
  },
  {
    cardId: 'impact-summary', title: 'Impact Summary (Results)', itemType: 'card',
    scope: 'both', pages: ['value-chain-sim', 'manufacturing-sim'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Senaryo etki ozeti (sonuc)',
    sourceStatus: 'mock', note: 'Simulasyon motoru ciktisi; motor yok.',
  },
  {
    cardId: 'comparison-view', title: 'Comparison View (Results)', itemType: 'card',
    scope: 'both', pages: ['value-chain-sim', 'manufacturing-sim'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Senaryo karsilastirma gorunumu (sonuc)',
    sourceStatus: 'mock', note: 'Simulasyon motoru ciktisi; motor yok.',
  },
  {
    cardId: 'inventory-demand', title: 'Inventory & Demand Simulation', itemType: 'card',
    scope: 'both', pages: ['value-chain-sim'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Stok & talep simulasyonu',
    sourceStatus: 'mock',
    note: 'Girdi olarak KAM Planning Details (Safety Stock) + Inventory Part in Stock (On Hand Qty) BESLENEBILIR; su an mock.',
  },
  {
    cardId: 'machine-utilization', title: 'Machine Utilization', itemType: 'card',
    scope: 'both', pages: ['manufacturing-sim'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Makine kullanim orani (simulasyon)',
    sourceStatus: 'mock', note: 'Gercek makine verisi zaten yok (bkz. machine-status); simulasyon ciktisi.',
  },
  {
    cardId: 'bottleneck-analysis', title: 'Bottleneck Analysis', itemType: 'card',
    scope: 'both', pages: ['manufacturing-sim'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Darbogaz analizi (simulasyon)',
    sourceStatus: 'mock', note: 'Simulasyon motoru ciktisi; motor yok.',
  },
  {
    cardId: 'objective-weights', title: 'Objective Weights', itemType: 'card',
    scope: 'both', pages: ['mo-dss'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Cok amacli karar agirliklari (kullanici girdisi)',
    sourceStatus: 'mock', note: 'Kullanici girdisi; ERP kaynagi yok.',
  },
  {
    cardId: 'pareto-front', title: 'Pareto Front Visualization', itemType: 'card',
    scope: 'both', pages: ['mo-dss'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Pareto cephesi (optimizasyon ciktisi)',
    sourceStatus: 'mock', verifiedIn: 'src/data/mockData.ts:paretoFrontData',
    note: 'paretoFrontData yer tutucu; optimizasyon motoru yok.',
  },
  {
    cardId: 'solution-comparison', title: 'Solution Comparison', itemType: 'card',
    scope: 'both', pages: ['mo-dss'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Cozum karsilastirmasi',
    sourceStatus: 'mock', note: 'Optimizasyon motoru ciktisi; motor yok.',
  },
  {
    cardId: 'strategy-ranking', title: 'Strategy Ranking', itemType: 'card',
    scope: 'both', pages: ['mo-dss'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Strateji siralamasi',
    sourceStatus: 'mock', note: 'Optimizasyon motoru ciktisi; motor yok.',
  },
  {
    cardId: 'ai-recommendations', title: 'AI Recommendations', itemType: 'card',
    scope: 'both', pages: ['mo-dss'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'AI onerileri',
    sourceStatus: 'mock', note: 'Model/motor ciktisi; su an yok.',
  },
  {
    cardId: 'process-scope', title: 'Process / Scope Selector', itemType: 'card',
    scope: 'both', pages: ['scheduling'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Surec/kapsam secici (kullanici girdisi)',
    sourceStatus: 'mock', note: 'Kullanici girdisi; ERP kaynagi yok.',
  },
  {
    cardId: 'recommended-scenarios', title: 'Recommended Scenarios', itemType: 'card',
    scope: 'both', pages: ['scheduling'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Onerilen senaryolar',
    sourceStatus: 'mock', note: 'Planlama motoru ciktisi; motor yok.',
  },
  {
    cardId: 'gantt-timeline', title: 'Gantt Timeline', itemType: 'card',
    scope: 'both', pages: ['scheduling'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Gantt zaman cizelgesi',
    sourceStatus: 'mock',
    note: 'Girdi olarak KAM Shop Orders (Start/Finish Date) + JPB TBL_GAMME/TBL_POINT (DAT/DATEFIN) BESLENEBILIR; su an mock.',
  },
  {
    cardId: 'comparison-table', title: 'Current vs. Proposed Comparison', itemType: 'card',
    scope: 'both', pages: ['scheduling'], company: 'both', erp: 'none',
    sourceTable: null, columns: [], measure: 'Mevcut vs onerilen karsilastirma tablosu',
    sourceStatus: 'mock', note: 'Planlama motoru ciktisi; motor yok.',
  },
];

// ============================================================================
//  YARDIMCILAR — backend baglama ve (iii) kart-veri denetimi icin
// ============================================================================

/** Bir kart/KPI"in tum firma baglarini dondurur. */
export function getBindings(cardId: string): DataSourceBinding[] {
  return DATA_SOURCES.filter((b) => b.cardId === cardId);
}

/** Belirli bir firma (ve 'both') icin gecerli tum baglar. */
export function getBindingsForCompany(company: 'kam' | 'jpb'): DataSourceBinding[] {
  return DATA_SOURCES.filter((b) => b.company === company || b.company === 'both');
}

/** Kaynak durumuna gore filtre (gercek | mock | belirsiz). */
export function getBindingsByStatus(status: SourceStatus): DataSourceBinding[] {
  return DATA_SOURCES.filter((b) => b.sourceStatus === status);
}

/**
 * (iii) DENETIM GIRDISI: pageLayouts"taki her sayfa kaleminin (kpi/card/widget)
 * kayit defterinde en az bir bagi var mi? Kapsanmayan kimlikleri dondurur.
 * Bos dizi = tam kapsam.
 */
export function getUncoveredCardIds(): string[] {
  const covered = new Set(DATA_SOURCES.map((b) => b.cardId));
  const uncovered = new Set<string>();
  for (const page of Object.values(PAGE_LAYOUTS)) {
    for (const item of page.items) {
      if (!covered.has(item.id)) uncovered.add(item.id);
      // Bir widget kpiIds beyan ediyorsa o KPI"lar da kapsanmali
      for (const kpiId of item.kpiIds ?? []) {
        if (!covered.has(kpiId)) uncovered.add(kpiId);
      }
    }
  }
  return [...uncovered];
}

/** Ozet sayim — dokuman/denetim icin. */
export function getCoverageSummary() {
  const byStatus = { real: 0, mock: 0, uncertain: 0 } as Record<SourceStatus, number>;
  for (const b of DATA_SOURCES) byStatus[b.sourceStatus] += 1;
  const distinctCards = new Set(DATA_SOURCES.map((b) => b.cardId)).size;
  return {
    totalBindings: DATA_SOURCES.length,
    distinctCards,
    byStatus,
    uncovered: getUncoveredCardIds(),
  };
}

// ============================================================================
//  (iii) MAKINE-OKUNUR KART-VERI BAGLAMA DENETIMI
//  pageLayouts aktif envanterindeki HER kartin, FIRMA bazinda (kam/jpb) hangi
//  baglama durumuna dustugunu registry'den turetir. Statik degil: registry
//  degisince sonuc da degisir (tek dogruluk kaynagi = DATA_SOURCES + PAGE_LAYOUTS).
// ============================================================================

/**
 * Bir kartin TEK firma icin efektif baglama durumu.
 *   'real'      : o firma icin gecerli tum baglar gercek.
 *   'mixed'     : en az bir gercek + en az bir gercek-olmayan bag (widget/karma kart).
 *   'uncertain' : gercek yok, en az bir belirsiz bag.
 *   'mock'      : sadece mock bag(lar).
 *   'n/a'       : o firmada bu kartin bagi yok (scope disi — or. jpb-only kart KAM'da).
 */
export type CardCompanyStatus = 'real' | 'mixed' | 'uncertain' | 'mock' | 'n/a';

export interface CardBindingAuditRow {
  cardId: string;
  /** Kart registry'de en az bir bag ile var mi (her aktif kalem icin true olmali) */
  inRegistry: boolean;
  /** pageLayouts'taki scope(lar); yalniz widget-ici kpiId ise registry scope'u */
  pageScopes: CardScope[];
  /** Kartin gorundugu sayfa(lar) */
  pages: PageId[];
  /** KAM arayuzunde efektif durum */
  kam: CardCompanyStatus;
  /** JPB arayuzunde efektif durum */
  jpb: CardCompanyStatus;
}

export interface CardBindingAudit {
  /** pageLayouts items + widget kpiIds — ayrik aktif kimlik sayisi */
  activeDistinctIds: number;
  coverage: ReturnType<typeof getCoverageSummary>;
  /** registry'de olup aktif envanterde OLMAYAN kimlikler (katalog artigi) */
  registryOnlyCards: string[];
  kamTally: Record<CardCompanyStatus, number>;
  jpbTally: Record<CardCompanyStatus, number>;
  rows: CardBindingAuditRow[];
}

function statusForCompany(cardId: string, company: 'kam' | 'jpb'): CardCompanyStatus {
  const bs = getBindings(cardId).filter((b) => b.company === company || b.company === 'both');
  if (bs.length === 0) return 'n/a';
  const hasReal = bs.some((b) => b.sourceStatus === 'real');
  const allReal = bs.every((b) => b.sourceStatus === 'real');
  if (allReal) return 'real';
  if (hasReal) return 'mixed';
  if (bs.some((b) => b.sourceStatus === 'uncertain')) return 'uncertain';
  return 'mock';
}

function emptyTally(): Record<CardCompanyStatus, number> {
  return { real: 0, mixed: 0, uncertain: 0, mock: 0, 'n/a': 0 };
}

export function getCardBindingAudit(): CardBindingAudit {
  const activeIds = new Set<string>();
  const scopeByItem: Record<string, Set<CardScope>> = {};
  const pagesByItem: Record<string, Set<PageId>> = {};

  for (const [pageId, page] of Object.entries(PAGE_LAYOUTS) as [PageId, (typeof PAGE_LAYOUTS)[PageId]][]) {
    for (const item of page.items) {
      activeIds.add(item.id);
      (scopeByItem[item.id] ??= new Set()).add(item.scope ?? 'both');
      (pagesByItem[item.id] ??= new Set()).add(pageId);
      for (const kpiId of item.kpiIds ?? []) {
        activeIds.add(kpiId);
        (pagesByItem[kpiId] ??= new Set()).add(pageId);
      }
    }
  }

  const registryCardIds = new Set(DATA_SOURCES.map((b) => b.cardId));
  const registryOnlyCards = [...registryCardIds].filter((id) => !activeIds.has(id)).sort();

  const kamTally = emptyTally();
  const jpbTally = emptyTally();
  const rows: CardBindingAuditRow[] = [];

  for (const id of [...activeIds].sort()) {
    const scopes = scopeByItem[id]
      ? [...scopeByItem[id]]
      : [...new Set(getBindings(id).map((b) => b.scope))];
    const kam = statusForCompany(id, 'kam');
    const jpb = statusForCompany(id, 'jpb');
    kamTally[kam] += 1;
    jpbTally[jpb] += 1;
    rows.push({
      cardId: id,
      inRegistry: registryCardIds.has(id),
      pageScopes: scopes.length ? scopes : ['both'],
      pages: pagesByItem[id] ? [...pagesByItem[id]] : [],
      kam,
      jpb,
    });
  }

  return {
    activeDistinctIds: activeIds.size,
    coverage: getCoverageSummary(),
    registryOnlyCards,
    kamTally,
    jpbTally,
    rows,
  };
}
