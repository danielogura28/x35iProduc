/**
 * Utilitários de Auditoria e Gestão de Desvios de Processo para o ExtruControl
 * Código de Referência Operacional: PE_RG_034 Análise de processo
 */
import { ProductionRecord, MachineId, MACHINE_LIST } from '../types/production';

export interface ProcessDeviationDetail {
  type: 
    | 'manutencao'
    | 'parada'
    | 'termico'
    | 'ficha_anterior'
    | 'ima'
    | 'peneira'
    | 'balanca'
    | 'etiqueta'
    | 'selagem'
    | 'homogeneizacao'
    | 'circulacao'
    | 'vazao_baixa';
  label: string;
  description: string;
  severity: 'critica' | 'alta' | 'media';
  badgeColor: string;
}

export interface LineDeviationReport {
  machineId: MachineId;
  hasDeviation: boolean;
  severity: 'critica' | 'alta' | 'media' | 'normal';
  deviations: ProcessDeviationDetail[];
  latestRecord?: ProductionRecord;
  lastAnalysisDurationSeconds?: number;
  totalRecordsWithDeviations: number;
}

/**
 * Analisa um registro e extrai detalhadamente todos os desvios de processo
 */
export function analyzeRecordDeviations(record: ProductionRecord): ProcessDeviationDetail[] {
  const list: ProcessDeviationDetail[] = [];

  // 1. Manutenção Corretiva (OM)
  if (record.lineStatus === 'manutencao' || record.hasMaintenanceOrder) {
    list.push({
      type: 'manutencao',
      label: 'Ordem de Manutenção (OM)',
      description: record.maintenanceOrderNumber 
        ? `OM: ${record.maintenanceOrderNumber}` 
        : 'Intervenção técnica corretiva aberta',
      severity: 'critica',
      badgeColor: 'bg-red-700 text-white border-red-800'
    });
  }

  // 2. Paradas da Linha
  if (record.hasStoppage) {
    const qty = record.stoppageQuantity || 1;
    const reasons = (record.stoppageReasonsList && record.stoppageReasonsList.length > 0)
      ? record.stoppageReasonsList.join(', ')
      : (record.stoppageReason || 'Parada Operacional');
    list.push({
      type: 'parada',
      label: `Linha Parada (${qty}x)`,
      description: `Motivo: ${reasons}`,
      severity: qty > 1 ? 'critica' : 'alta',
      badgeColor: 'bg-red-600 text-white border-red-700'
    });
  }

  // 3. Desvio Térmico no Canhão
  if (record.temperaturesConforming === false) {
    list.push({
      type: 'termico',
      label: 'Desvio Térmico (Zonas)',
      description: record.temperatureDeviationZones 
        ? `Zonas fora da especificação: ${record.temperatureDeviationZones}`
        : 'Temperaturas divergentes da ficha técnica',
      severity: 'alta',
      badgeColor: 'bg-orange-600 text-white border-orange-700'
    });
  }

  // 4. Parâmetros Divergentes da Ficha Anterior
  if (record.hasPreviousReferenceSheet && record.parametersMatchPreviousSheet === false) {
    list.push({
      type: 'ficha_anterior',
      label: 'Divergência vs Ficha Anterior',
      description: record.parameterDeviationReason 
        ? `Motivo: ${record.parameterDeviationReason}`
        : 'Parâmetros de processo alterados em relação à referência',
      severity: 'media',
      badgeColor: 'bg-amber-600 text-white border-amber-700'
    });
  }

  // 5. Contaminação no Ímã
  if (record.magnetStatus === 'limalha_detectada' || record.magnetStatus === 'nao_conforme') {
    list.push({
      type: 'ima',
      label: 'Barreira Magnética (Limalha)',
      description: record.magnetNotes 
        ? `Limalha/Partícula: ${record.magnetNotes}`
        : 'Presença de partículas ferrosas retidas no ímã',
      severity: 'critica',
      badgeColor: 'bg-purple-700 text-white border-purple-800'
    });
  }

  // 6. Condição de Pó na Peneira
  if (record.sievePowderCondition === 'peneira_obstruida') {
    list.push({
      type: 'peneira',
      label: 'Peneira Obstruída',
      description: record.sieveNotes || 'Bloqueio de tela de classificação',
      severity: 'alta',
      badgeColor: 'bg-amber-700 text-white border-amber-800'
    });
  } else if (record.sievePowderCondition === 'excesso_po' || record.sievePowderCondition === 'presenca_finos') {
    list.push({
      type: 'peneira',
      label: 'Excesso de Pó / Finos',
      description: record.sieveNotes || 'Presença acentuada de pó no produto',
      severity: 'media',
      badgeColor: 'bg-amber-600 text-white border-amber-700'
    });
  }

  // 7. Balança da Linha (Calibração ou Identificação)
  if (record.scaleCalibrationConforming === false || (record.scaleCalibrationStatus && record.scaleCalibrationStatus !== 'conforme')) {
    const statusLabel = record.scaleCalibrationStatus === 'vencida' ? 'Etiqueta Vencida' 
      : record.scaleCalibrationStatus === 'sem_etiqueta' ? 'Sem Etiqueta de Calibração'
      : record.scaleCalibrationStatus === 'danificada' ? 'Etiqueta Danificada/Ilegível'
      : 'Não Conforme';
    list.push({
      type: 'balanca',
      label: `Balança: ${statusLabel}`,
      description: `Tag: ${record.scaleTagNumber || 'Sem Tag'} • ${record.scaleCheckNotes || 'Calibração fora da validade requer manutenção metrológica'}`,
      severity: 'alta',
      badgeColor: 'bg-red-800 text-white border-red-900'
    });
  }

  // 8. Etiquetas de Identificação do Palete
  if (record.labelCodesConforming === false) {
    list.push({
      type: 'etiqueta',
      label: 'Divergência Etiqueta Palete',
      description: record.packagingNotes || 'Código ou dados divergentes no rótulo',
      severity: 'alta',
      badgeColor: 'bg-red-600 text-white border-red-700'
    });
  }

  // 9. Qualidade da Selagem e Temperatura Seladora
  if (record.sealingQuality === 'aberta' || record.sealingQuality === 'queimada' || record.sealingQuality === 'defeituosa') {
    list.push({
      type: 'selagem',
      label: `Selagem ${record.sealingQuality.toUpperCase()}`,
      description: `Falha na vedação térmica das embalagens (${record.sealerTempMeasured ? record.sealerTempMeasured + '°C' : 'Temperatura não conforme'})`,
      severity: 'media',
      badgeColor: 'bg-amber-700 text-white border-amber-800'
    });
  } else if (record.sealerTempConforming === false) {
    list.push({
      type: 'selagem',
      label: 'Temp. Seladora Fora de Faixa',
      description: `Temperatura medida: ${record.sealerTempMeasured || 'Desvio'}°C`,
      severity: 'media',
      badgeColor: 'bg-amber-600 text-white border-amber-700'
    });
  }

  // 10. Homogeneização da DOS02
  if (record.dos02Homogenization === 'irregular') {
    list.push({
      type: 'homogeneizacao',
      label: 'DOS02 Homogeneização Irregular',
      description: record.dos02HomogenizationNotes || 'Alimentação irregular detectada na dosadora 02',
      severity: 'media',
      badgeColor: 'bg-amber-600 text-white border-amber-700'
    });
  }

  // 11. Sistema de Circulação
  if (record.circulationSystemStatus === 'inativo') {
    list.push({
      type: 'circulacao',
      label: 'Circulação Inoperante',
      description: 'Sistema de refrigeração e circulação da extrusora desligado/inoperante',
      severity: 'alta',
      badgeColor: 'bg-red-700 text-white border-red-800'
    });
  }

  // 12. Vazão muito abaixo da meta (>20% de queda)
  if (
    record.lineStatus === 'em_producao' && 
    !record.hasStoppage && 
    record.productivityKgh && 
    record.targetProductivityKgh && 
    record.productivityKgh < record.targetProductivityKgh * 0.8
  ) {
    list.push({
      type: 'vazao_baixa',
      label: 'Queda Crítica de Produtividade',
      description: `Produzindo a ${record.productivityKgh} kg/h (Meta: ${record.targetProductivityKgh} kg/h - déficit de ${Math.round(record.targetProductivityKgh - record.productivityKgh)} kg/h)`,
      severity: 'alta',
      badgeColor: 'bg-red-800 text-white border-red-900'
    });
  }

  return list;
}

/**
 * Analisa todas as 6 extrusoras para gerar o mapa de anomalias da gestão
 */
export function analyzeAllLinesDeviations(records: ProductionRecord[]): LineDeviationReport[] {
  return MACHINE_LIST.map((machineId) => {
    const machineRecs = records.filter(r => r.machineId === machineId);
    const sorted = [...machineRecs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latest = sorted[0];

    const deviations = latest ? analyzeRecordDeviations(latest) : [];
    const hasDeviation = deviations.length > 0;

    let severity: 'critica' | 'alta' | 'media' | 'normal' = 'normal';
    if (deviations.some(d => d.severity === 'critica')) severity = 'critica';
    else if (deviations.some(d => d.severity === 'alta')) severity = 'alta';
    else if (deviations.some(d => d.severity === 'media')) severity = 'media';

    // Contagem de registros com desvios na história recente
    const totalRecordsWithDeviations = machineRecs.filter(r => analyzeRecordDeviations(r).length > 0).length;

    return {
      machineId,
      hasDeviation,
      severity,
      deviations,
      latestRecord: latest,
      lastAnalysisDurationSeconds: latest?.analysisDurationSeconds,
      totalRecordsWithDeviations
    };
  });
}

/**
 * Formata segundos em texto amigável de tempo gasto (ex: 03m 42s)
 */
export function formatAnalysisDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '00m 00s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

/**
 * Documento Oficial de Procedimento PetroPol
 */
export const DOCUMENT_IDENTIFIER = 'PE_RG_034 Analise de processo';
export const DOCUMENT_FULL_TITLE = 'PE_RG_034 Análise de processo';
