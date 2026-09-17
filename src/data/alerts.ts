import type { Alert } from '../types';
import type { Company } from '../contexts/CompanyContext';

/**
 * ORNEK ALARMLAR — GERCEK VERIDEN OLCULMUSTUR.
 *
 * Isıl karari 2026-08-31: "datayi kontrol et oradan ornek 1-2 alarm cek;
 * ornek alarm oldugunu da not olarak ekle arayuze."
 *
 * Onceki 10 alarm elle uydurulmustu ve altisi iki firmada da BULUNMAYAN
 * veriyi anlatiyordu (sensor sicakligi, enerji x2, makine bakimi/durusu,
 * OEE, reorder point, tedarikci puani). Hepsi cikarildi.
 *
 * Asagidaki dordu 2026-08-31'de ham veriden olculmustur; her birinin
 * dataSource alaninda tablo, kolon ve olculen buyukluk yazilidir.
 * Zaman damgalari gosterim icindir — veri KAM'da 2024 ihracina,
 * JPB'de Eylul/Ekim 2024'e kadar uzanir ("veri eskidir" dersi).
 */

export const MEASURED_ALERTS: Alert[] = [
  // ---------------------------------------------------------------- KAM
  {
    id: 'kam-late-delivery',
    scope: 'kam',
    title: 'Late deliveries against promised date',
    message:
      '84 of 626 order lines shipped after the promised delivery date (13.4%). Average delay 3.7 days, worst case 36 days.',
    severity: 'warning',
    timestamp: new Date(Date.now() - 35 * 60000),
    source: 'Value Chain DT',
    acknowledged: false,
    dataSource:
      'KAM · Ext Customer Order Lines — Promised Delivery Date/Time vs Last Actual Ship Date · 626/631 lines populated · measured 2026-08-31',
  },
  {
    id: 'kam-below-safety-stock',
    scope: 'kam',
    title: '3 parts below safety stock',
    message:
      'Pressfit pin 18.20mm (992,568 / 1,030,995) · RESISTOR 1K20 0402 (303,596 / 344,855) · MLCC 150n 10V 0402 (361,181 / 366,065).',
    severity: 'warning',
    timestamp: new Date(Date.now() - 140 * 60000),
    source: 'Value Chain DT',
    acknowledged: false,
    dataSource:
      'KAM · Planning Details for Inv Part (Safety Stock) x Inventory Part in Stock (On Hand Qty) · 169 matched parts · measured 2026-08-31',
  },

  // ---------------------------------------------------------------- JPB
  {
    id: 'jpb-quarantine',
    scope: 'jpb',
    title: '155 lots in quarantine',
    message:
      'QUARANTAINE hold on 155 lots. Total blocked lots 1,598 of 34,861 (4.58%); largest group is DEROGATION ACCEPTEE with 1,095.',
    severity: 'critical',
    timestamp: new Date(Date.now() - 55 * 60000),
    source: 'Product DT',
    acknowledged: false,
    dataSource:
      'JPB · TBL_LOTIE.BLOCAGE = 101 joined to TBL_Qual_Blocage · 34,861 lots · 100% populated, 12 distinct values · measured 2026-08-31',
  },
  {
    id: 'jpb-quality-nonconformity',
    scope: 'jpb',
    title: '1,659 quality non-conformity records',
    message:
      'Most frequent defect types: Supply (650), Etiquette (86), Quantité (71), Visuel (57). 78 delivery notes failed the conformity check.',
    severity: 'warning',
    timestamp: new Date(Date.now() - 210 * 60000),
    source: 'Product DT',
    acknowledged: false,
    dataSource:
      'JPB · TBL_CtrlCommande — TypeDefaut / Defaut / BLCOCCheck · 107,754 control records · measured 2026-08-31',
  },
];

/**
 * Kullanicinin kendi use case'ine ait alarmlar.
 * pageLayouts.getCompanyItems ile ayni filtre kurali.
 */
export function getCompanyAlerts(company: Company): Alert[] {
  return MEASURED_ALERTS.filter(
    (a) => !a.scope || a.scope === 'both' || a.scope === company,
  ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
