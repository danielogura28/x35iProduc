/**
 * Utilitários de Armazenamento e Indicadores para o ExtruControl
 */
import { 
  ProductionRecord, 
  FactoryMonthlyGoals, 
  Operator, 
  ShiftLeader,
  MachineId,
  GlobalLineStatuses,
  LineOperationalStatus,
  MACHINE_LIST
} from '../types/production';

const STORAGE_KEY = 'extrucontrol_records_v3';
const GOALS_KEY = 'extrucontrol_goals_v3';
const OPERATORS_KEY = 'extrucontrol_operators_v1';
const LEADERS_KEY = 'extrucontrol_leaders_v1';
const GLOBAL_LINE_STATUSES_KEY = 'extrucontrol_global_line_statuses_v1';

export const DEFAULT_GLOBAL_LINE_STATUSES: GlobalLineStatuses = {
  DR01: { status: 'em_producao', notes: 'Linha operando normalmente' },
  DR02: { status: 'em_producao', notes: 'Linha operando normalmente' },
  DR03: { status: 'setup', setupMaterial: 'PA6.6 com Fibra de Vidro 30% Natural', notes: 'Troca de matriz e tela' },
  DR04: { status: 'em_producao', notes: 'Linha operando normalmente' },
  DR05: { status: 'preventiva', notes: 'Preventiva mensal: lubrificação programada' },
  DR06: { status: 'manutencao', maintenanceOrderNumber: 'OM-2026-8812', notes: 'Intervenção técnica no motor principal' }
};

export function getGlobalLineStatuses(): GlobalLineStatuses {
  try {
    const raw = localStorage.getItem(GLOBAL_LINE_STATUSES_KEY);
    if (!raw) {
      localStorage.setItem(GLOBAL_LINE_STATUSES_KEY, JSON.stringify(DEFAULT_GLOBAL_LINE_STATUSES));
      return DEFAULT_GLOBAL_LINE_STATUSES;
    }
    const parsed = JSON.parse(raw);
    // Ensure all machines are present
    const result: GlobalLineStatuses = { ...DEFAULT_GLOBAL_LINE_STATUSES };
    for (const m of MACHINE_LIST) {
      if (parsed[m]) {
        result[m] = parsed[m];
      }
    }
    return result;
  } catch {
    return DEFAULT_GLOBAL_LINE_STATUSES;
  }
}

export function saveGlobalLineStatuses(statuses: GlobalLineStatuses): void {
  localStorage.setItem(GLOBAL_LINE_STATUSES_KEY, JSON.stringify(statuses));
}

export function setAllLinesStatusGlobally(status: LineOperationalStatus, updatedBy?: string): GlobalLineStatuses {
  const current = getGlobalLineStatuses();
  const updated: GlobalLineStatuses = { ...current };
  const now = new Date().toISOString();
  
  for (const m of MACHINE_LIST) {
    updated[m] = {
      status,
      updatedAt: now,
      updatedBy: updatedBy || 'Operação',
      notes: status === 'em_producao' ? 'Definido em produção global' : undefined,
      maintenanceOrderNumber: status === 'manutencao' ? current[m].maintenanceOrderNumber : undefined,
      setupMaterial: status === 'setup' ? current[m].setupMaterial : undefined
    };
  }
  saveGlobalLineStatuses(updated);
  return updated;
}


export const DEFAULT_GOALS: FactoryMonthlyGoals = {
  targetAverageProductivityKgh: 400,
  targetProcessSheetComplianceRate: 94,
  maxStoppageHoursPerMachine: 12,
  targetLabelComplianceRate: 98,
};

export const DEFAULT_OPERATORS: Operator[] = [
  { id: 'op-1', name: 'Lucas Fernandes' },
  { id: 'op-2', name: 'Carlos Silveira' },
  { id: 'op-3', name: 'Marcos Vinicius' },
  { id: 'op-4', name: 'Daniel' },
  { id: 'op-5', name: 'Antônio' },
  { id: 'op-6', name: 'Roberto Almeida' },
  { id: 'op-7', name: 'Gilmar Santos' },
  { id: 'op-8', name: 'Diego Ramos' }
];

export const DEFAULT_LEADERS: ShiftLeader[] = [
  { id: 'ldr-1', name: 'Fernando Rocha' },
  { id: 'ldr-2', name: 'Amanda Dias' },
  { id: 'ldr-3', name: 'Rogério Matos' },
  { id: 'ldr-4', name: 'Paulo Cezar' }
];

export function getOperators(): Operator[] {
  try {
    const raw = localStorage.getItem(OPERATORS_KEY);
    if (!raw) {
      localStorage.setItem(OPERATORS_KEY, JSON.stringify(DEFAULT_OPERATORS));
      return DEFAULT_OPERATORS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OPERATORS;
  } catch {
    return DEFAULT_OPERATORS;
  }
}

export function saveOperators(operators: Operator[]): void {
  localStorage.setItem(OPERATORS_KEY, JSON.stringify(operators));
}

export function getShiftLeaders(): ShiftLeader[] {
  try {
    const raw = localStorage.getItem(LEADERS_KEY);
    if (!raw) {
      localStorage.setItem(LEADERS_KEY, JSON.stringify(DEFAULT_LEADERS));
      return DEFAULT_LEADERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_LEADERS;
  } catch {
    return DEFAULT_LEADERS;
  }
}

export function saveShiftLeaders(leaders: ShiftLeader[]): void {
  localStorage.setItem(LEADERS_KEY, JSON.stringify(leaders));
}

const SAMPLE_RECORDS: ProductionRecord[] = [
  // DR01 - Apontamento 1 (Inativa/Parada por Ajuste de Processo)
  {
    id: 'rec-101a',
    timestamp: '2026-10-27T13:30:00.000Z',
    machineId: 'DR01',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Carlos Silveira',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'inativa',
    productionOrder: '',
    batchNumber: '',
    productName: 'PP Carga Mineral 30% Preto',
    productivityKgh: 0,
    targetProductivityKgh: 450,
    rpm: 0,
    motorAmperes: 0,
    hasPreviousReferenceSheet: true,
    temperaturesConforming: true,
    parametersMatchPreviousSheet: true,
    hasStoppage: true,
    stoppageQuantity: 1,
    stoppageReason: 'Ajuste de Processo',
    stoppageReasonsList: ['Ajuste de Processo'],
    stoppageMinutes: 0,
    hasMaintenanceOrder: false,
    operationalDeviationsNotes: 'Parada programada para ajuste de processo',
    photos: []
  },
  // DR01 - Apontamento 2 (Em Produção - 462 kg/h)
  {
    id: 'rec-101b',
    timestamp: '2026-10-27T08:00:00.000Z',
    machineId: 'DR01',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Carlos Silveira',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'em_producao',
    productionOrder: '',
    batchNumber: 'LT-2710-01',
    productName: 'PP Carga Mineral 30% Preto',
    productivityKgh: 462,
    targetProductivityKgh: 450,
    rpm: 385,
    motorAmperes: 72.4,
    hasPreviousReferenceSheet: true,
    prevProductivityKgh: 450,
    prevRpm: 380,
    prevMotorAmperes: 71.0,
    temperaturesConforming: true,
    parametersMatchPreviousSheet: true,
    dosers: {
      dos01: { checked: true, value: '70% PP', conforming: true },
      dos02: { checked: true, value: '25% Carga', conforming: true },
      dos03: { checked: true, value: '3% Negro', conforming: true },
      dos04: { checked: true, value: '2% Aditivo', conforming: true }
    },
    dos02Homogenization: 'conforme',
    circulationSystemStatus: 'ativo',
    magnetStatus: 'limpo',
    sievePowderCondition: 'normal',
    sealerTempConforming: true,
    sealerTempMeasured: 145,
    labelCodesConforming: true,
    sealingQuality: 'conforme',
    hasStoppage: false,
    stoppageQuantity: 0,
    hasMaintenanceOrder: false,
    photos: []
  },
  // DR02 - Apontamento 1 (Marcos Vinicius - 395 kg/h - OP-14756)
  {
    id: 'rec-102a',
    timestamp: '2026-10-27T09:30:00.000Z',
    machineId: 'DR02',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Marcos Vinicius',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'em_producao',
    productionOrder: 'OP-14756',
    batchNumber: 'LT-2710-02',
    productName: 'PEAD Composto Rígido Cinza',
    productivityKgh: 395,
    targetProductivityKgh: 410,
    rpm: 340,
    motorAmperes: 66.8,
    hasPreviousReferenceSheet: true,
    prevProductivityKgh: 410,
    prevRpm: 360,
    prevMotorAmperes: 69.0,
    temperaturesConforming: false,
    temperatureDeviationZones: 'Zona 4 (+14°C) e Zona 5',
    parametersMatchPreviousSheet: false,
    parameterDeviationReason: 'Redução de RPM para conter cisalhamento na troca de lote',
    dopObservationsIdentified: true,
    dopObservationsDetails: 'Ajuste térmico pós-troca de resina',
    deviationApprovedByLeader: true,
    approvingLeaderName: 'Fernando Rocha',
    magnetStatus: 'limpeza_realizada',
    sievePowderCondition: 'normal',
    sealerTempConforming: true,
    sealerTempMeasured: 142,
    labelCodesConforming: true,
    sealingQuality: 'conforme',
    deviationReportedToLeader: true,
    deviationReportTime: '06:50',
    deviationReportLeaderName: 'Fernando Rocha',
    hasStoppage: false,
    stoppageQuantity: 0,
    hasMaintenanceOrder: false,
    photos: []
  },
  // DR02 - Apontamento 2 (Daniel - 360 kg/h - OP-14756 - Turno 2)
  {
    id: 'rec-102b',
    timestamp: '2026-10-27T16:00:00.000Z',
    machineId: 'DR02',
    shift: 'Turno 2 (14h - 22h)',
    operatorName: 'Daniel',
    shiftLeader: 'Amanda Dias',
    lineStatus: 'em_producao',
    productionOrder: 'OP-14756',
    batchNumber: 'LT-2710-02B',
    productName: 'PEAD Composto Rígido Cinza',
    productivityKgh: 360,
    targetProductivityKgh: 410,
    rpm: 330,
    motorAmperes: 65.0,
    hasPreviousReferenceSheet: true,
    temperaturesConforming: true,
    parametersMatchPreviousSheet: true,
    sealerTempConforming: true,
    labelCodesConforming: true,
    sealingQuality: 'conforme',
    hasStoppage: false,
    stoppageQuantity: 0,
    hasMaintenanceOrder: false,
    photos: []
  },
  // DR03 - Apontamento (Roberto Almeida - Em Setup - PA6.6)
  {
    id: 'rec-103',
    timestamp: '2026-10-27T07:00:00.000Z',
    machineId: 'DR03',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Roberto Almeida',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'setup',
    setupMaterial: 'PA6.6 com Fibra de Vidro 30% Natural',
    productionOrder: '',
    batchNumber: '',
    productName: '',
    productivityKgh: 0,
    targetProductivityKgh: 440,
    rpm: 0,
    motorAmperes: 0,
    hasPreviousReferenceSheet: false,
    temperaturesConforming: false,
    parametersMatchPreviousSheet: false,
    hasStoppage: false,
    stoppageQuantity: 0,
    stoppageMinutes: 90,
    hasMaintenanceOrder: false,
    operationalDeviationsNotes: 'Limpeza de canhão e pré-aquecimento da matriz para nova resina.',
    photos: []
  },
  // DR04 - Apontamento (Lucas Fernandes - 480 kg/h - OP-48212)
  {
    id: 'rec-104',
    timestamp: '2026-10-27T06:40:00.000Z',
    machineId: 'DR04',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Lucas Fernandes',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'em_producao',
    productionOrder: 'OP-48212',
    batchNumber: 'LT-2710-04',
    productName: 'PP Homopolímero Natural Especial',
    productivityKgh: 480,
    targetProductivityKgh: 460,
    rpm: 410,
    motorAmperes: 74.0,
    hasPreviousReferenceSheet: false, // Primeiro lote sem referência anterior
    temperaturesConforming: true,
    parametersMatchPreviousSheet: true,
    dosers: {
      dos01: { checked: true, value: '95% PP', conforming: true },
      dos02: { checked: true, value: '5% Aditivo UV', conforming: true },
      dos03: { checked: false, conforming: true },
      dos04: { checked: false, conforming: true }
    },
    dos02Homogenization: 'conforme',
    hasSideFeeder: true,
    sideFeederCurrentRpm: 310,
    sideFeederConforming: true,
    circulationSystemStatus: 'ativo',
    magnetStatus: 'limpo',
    sievePowderCondition: 'normal',
    sealerTempConforming: true,
    sealerTempMeasured: 148,
    labelCodesConforming: true,
    sealingQuality: 'conforme',
    hasStoppage: false,
    stoppageQuantity: 0,
    hasMaintenanceOrder: false,
    photos: []
  },
  {
    id: 'rec-105',
    timestamp: '2026-10-27T06:30:00.000Z',
    machineId: 'DR05',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Antônio',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'preventiva',
    productivityKgh: 0,
    targetProductivityKgh: 440,
    rpm: 0,
    motorAmperes: 0,
    hasPreviousReferenceSheet: false,
    temperaturesConforming: false,
    parametersMatchPreviousSheet: false,
    hasStoppage: true,
    stoppageMinutes: 60,
    stoppageQuantity: 0,
    operationalDeviationsNotes: 'Preventiva mensal: lubrificação programada e reaperto elétrico.',
    photos: []
  },
  {
    id: 'rec-106',
    timestamp: '2026-10-27T06:15:00.000Z',
    machineId: 'DR06',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Roberto Almeida',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'manutencao',
    maintenanceOrderNumber: 'OM-2026-8812',
    hasMaintenanceOrder: true,
    productivityKgh: 0,
    targetProductivityKgh: 440,
    rpm: 0,
    motorAmperes: 0,
    hasPreviousReferenceSheet: false,
    temperaturesConforming: false,
    parametersMatchPreviousSheet: false,
    hasStoppage: true,
    stoppageMinutes: 60,
    stoppageQuantity: 0,
    operationalDeviationsNotes: 'Falha de acionamento do motor principal. Atendimento com a OM-2026-8812.',
    photos: []
  }
];

export function getProductionRecords(): ProductionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_RECORDS));
      return SAMPLE_RECORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SAMPLE_RECORDS;
  } catch {
    return SAMPLE_RECORDS;
  }
}

export const MAX_STORAGE_RECORDS = 3000;

export interface StorageCapacityInfo {
  count: number;
  max: number;
  percentage: number;
  isFull: boolean;
  isNearFull: boolean;
  remaining: number;
}

export function getStorageCapacity(recordsCount?: number): StorageCapacityInfo {
  const count = recordsCount !== undefined ? recordsCount : getProductionRecords().length;
  const percentage = Math.min(100, Math.round((count / MAX_STORAGE_RECORDS) * 1000) / 10);
  return {
    count,
    max: MAX_STORAGE_RECORDS,
    percentage,
    isFull: count >= MAX_STORAGE_RECORDS,
    isNearFull: count >= MAX_STORAGE_RECORDS * 0.85,
    remaining: Math.max(0, MAX_STORAGE_RECORDS - count)
  };
}

export function saveProductionRecord(record: ProductionRecord): { success: boolean; error?: string } {
  const current = getProductionRecords();
  const isExisting = current.some(r => r.id === record.id);
  
  if (!isExisting && current.length >= MAX_STORAGE_RECORDS) {
    return {
      success: false,
      error: `Capacidade máxima de armazenamento atingida (${MAX_STORAGE_RECORDS} registros). Exclua registros antigos no Histórico para liberar espaço.`
    };
  }

  const updated = [record, ...current.filter(r => r.id !== record.id)];
  const capped = updated.slice(0, MAX_STORAGE_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  return { success: true };
}

export function deleteProductionRecord(id: string): void {
  const current = getProductionRecords();
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function bulkDeleteRecords(ids: string[]): void {
  const idSet = new Set(ids);
  const current = getProductionRecords();
  const updated = current.filter(r => !idSet.has(r.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteOldestRecords(countToDelete: number): number {
  const current = getProductionRecords();
  if (current.length === 0) return 0;
  const sorted = [...current].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const keepCount = Math.max(0, sorted.length - countToDelete);
  const updated = sorted.slice(0, keepCount);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return sorted.length - updated.length;
}

export function deleteRecordsBeforeDate(isoDateStr: string): number {
  const current = getProductionRecords();
  const targetTime = new Date(isoDateStr).getTime();
  const updated = current.filter(r => new Date(r.timestamp).getTime() >= targetTime);
  const deletedCount = current.length - updated.length;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return deletedCount;
}

export function clearAllProductionRecords(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}

export function exportAllRecordsJSON(): void {
  const records = getProductionRecords();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `ExtruControl_Backup_Completo_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function getFactoryGoals(): FactoryMonthlyGoals {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return DEFAULT_GOALS;
    return { ...DEFAULT_GOALS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GOALS;
  }
}

export function saveFactoryGoals(goals: FactoryMonthlyGoals): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function exportToCSV(records: ProductionRecord[]): void {
  const headers = [
    'ID',
    'Data/Hora',
    'Máquina',
    'Status da Linha',
    'Turno',
    'Operador',
    'Líder',
    'Material em Setup',
    'Número OM',
    'OP',
    'Lote',
    'Produto',
    'Produtividade (kg/h)',
    'Meta (kg/h)',
    'RPM',
    'Amperes (A)',
    'Possui Ficha Ref.',
    'Kg/h Ref. Ant.',
    'RPM Ref. Ant.',
    'Amperes Ref. Ant.',
    'Temperaturas Conformes',
    'Dosadora 01',
    'Dosadora 02',
    'Dosadora 03',
    'Dosadora 04',
    'Homogeneização DOS02',
    'Side Feeder RPM',
    'Side Feeder Ref.',
    'Sistema Circulação',
    'Status Ímã',
    'Peneira / Pó',
    'Temp. Seladora Conforme',
    'Etiquetas Conformes',
    'Qualidade Selagem',
    'Balança Calibração',
    'Balança Tag / Identificação',
    'Desvio Comunicado ao Líder',
    'Horário Comunicação Líder',
    'Houve Parada',
    'Qtd de Paradas',
    'Motivos das Paradas',
    'Relato Desvios',
    'Tempo Análise (s)',
    'Documento Referência',
    'Qtd Fotos'
  ];

  const rows = records.map(r => [
    r.id,
    new Date(r.timestamp).toLocaleString('pt-BR'),
    r.machineId,
    `"${r.lineStatus || 'em_producao'}"`,
    `"${r.shift}"`,
    `"${r.operatorName}"`,
    `"${r.shiftLeader}"`,
    `"${r.setupMaterial || ''}"`,
    `"${r.maintenanceOrderNumber || ''}"`,
    `"${r.productionOrder || ''}"`,
    `"${r.batchNumber || ''}"`,
    `"${r.productName || ''}"`,
    r.productivityKgh ?? '',
    r.targetProductivityKgh ?? '',
    r.rpm ?? '',
    r.motorAmperes ?? '',
    r.hasPreviousReferenceSheet ? 'Sim' : 'Não (Sem Ref.)',
    r.prevProductivityKgh ?? '',
    r.prevRpm ?? '',
    r.prevMotorAmperes ?? '',
    r.temperaturesConforming ? 'Sim' : (r.temperaturesConforming === false ? 'Não' : ''),
    `"${r.dosers?.dos01?.value || ''}"`,
    `"${r.dosers?.dos02?.value || ''}"`,
    `"${r.dosers?.dos03?.value || ''}"`,
    `"${r.dosers?.dos04?.value || ''}"`,
    `"${r.dos02Homogenization || ''}"`,
    r.sideFeederCurrentRpm ?? '',
    r.sideFeederPreviousRpm ?? '',
    `"${r.circulationSystemStatus || 'ativo'}"`,
    `"${r.magnetStatus || ''}"`,
    `"${r.sievePowderCondition || ''}"`,
    r.sealerTempConforming ? 'Sim' : (r.sealerTempConforming === false ? 'Não' : ''),
    r.labelCodesConforming ? 'Sim' : (r.labelCodesConforming === false ? 'Não' : ''),
    `"${r.sealingQuality || ''}"`,
    r.scaleCalibrationConforming ? 'Conforme / Válida' : (r.scaleCalibrationConforming === false ? 'Não Conforme / Vencida' : ''),
    `"${r.scaleTagNumber || ''}"`,
    r.deviationReportedToLeader ? 'Sim' : 'Não',
    `"${r.deviationReportTime || ''}"`,
    r.hasStoppage ? 'Sim' : 'Não',
    r.stoppageQuantity || (r.hasStoppage ? 1 : 0),
    `"${(r.stoppageReasonsList && r.stoppageReasonsList.length > 0) ? r.stoppageReasonsList.join(', ') : (r.stoppageReason || '')}"`,
    `"${r.operationalDeviationsNotes?.replace(/"/g, '""') || ''}"`,
    r.analysisDurationSeconds ?? 0,
    `"PE_RG_034 Analise de processo"`,
    r.photos.length
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ExtruControl_Relatorio_Producao_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
