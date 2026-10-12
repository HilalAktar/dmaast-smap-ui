import Header from '../../components/layout/Header';
import { MockDataBadge, MockDataNotice } from '../../components/shared/MockDataBadge';
import ValueChainTwinApp from '../../components/value-chain-sim/ValueChainTwinApp';
import { useLanguage } from '../../contexts/LanguageContext';
import { tx } from '../../i18n/tx';
import { VCSIM_MOCK_PROVENANCE } from '../../data/mock/valueChainSimMock';

/**
 * Value Chain Simulation — 1:1 copy of the Value Chain Digital Twin UI.
 *
 * Kullanıcı kararı (Asrınalp Şahin, 2026-10-12): Operations › Value Chain
 * Simulation sekmesi, `dmaast-value-chain-digital-twin` arayüzünün birebir
 * kopyasını TAMAMEN mock veriyle (backend/API çağrısı olmadan) gösterir ve bu
 * hâliyle partnerlerle paylaşılır. Önceki SMAP-temalı özet görünüm (pre-generated
 * SimulationResultV1 artifact) kaldırıldı.
 *
 * Twin arayüzü `components/value-chain-sim/` altında, kendi tasarım sistemi
 * `.vcdt` kapsamında yaşar; veri ve motor `data/mock/valueChainSimMock.ts`.
 */
export default function ValueChainSim() {
  const { t } = useLanguage();
  const title = tx(t, 'vcsim.title', 'Value Chain Simulation');
  const subtitle = tx(t, 'vcsim.subtitleTwin', 'Value Chain Digital Twin — scenario-based disruption analysis (mock)');

  return (
    <div className="h-screen flex flex-col">
      <Header title={title} subtitle={subtitle} />

      <div className="px-4 lg:px-6 py-2 bg-white border-b border-surface-200 flex flex-wrap items-center gap-3">
        <MockDataBadge />
        <div className="flex-1 min-w-[240px]">
          <MockDataNotice text={VCSIM_MOCK_PROVENANCE.note} />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ValueChainTwinApp />
      </div>
    </div>
  );
}
