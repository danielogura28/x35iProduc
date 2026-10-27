/**
 * Utilitários de Armazenamento e Indicadores para o ExtruControl
 */
import { 
  ProductionRecord, 
  FactoryMonthlyGoals, 
  Operator, 
  ShiftLeader 
} from '../types/production';

const STORAGE_KEY = 'extrucontrol_records_v3';
const GOALS_KEY = 'extrucontrol_goals_v3';
const OPERATORS_KEY = 'extrucontrol_operators_v1';
const LEADERS_KEY = 'extrucontrol_leaders_v1';

export const DEFAULT_GOALS: FactoryMonthlyGoals = {
  targetAverageProductivityKgh: 430,
  targetProcessSheetComplianceRate: 94,
  maxStoppageHoursPerMachine: 12,
  targetLabelComplianceRate: 98,
};

export const DEFAULT_OPERATORS: Operator[] = [
  { id: 'op-1', name: 'Carlos Silveira' },
  { id: 'op-2', name: 'Marcos Vinicius' },
  { id: 'op-3', name: 'Roberto Almeida' },
  { id: 'op-4', name: 'Lucas Fernandes' },
  { id: 'op-5', name: 'Gilmar Santos' },
  { id: 'op-6', name: 'Diego Ramos' },
  { id: 'op-7', name: 'Rodrigo Mello' },
  { id: 'op-8', name: 'Anderson Silva' }
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
  {
    id: 'rec-101',
    timestamp: '2026-10-27T07:30:00.000Z',
    machineId: 'DR01',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Carlos Silveira',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'em_producao',
    productionOrder: 'OP-48201',
    batchNumber: 'LT-2710-01',
    productName: 'PP Carga Mineral 30% Preto',
    productivityKgh: 462,
    targetProductivityKgh: 450,
    rpm: 385,
    motorAmperes: 72.4,
    hasPreviousReferenceSheet: true,
    prevProductivityKgh: 458,
    prevRpm: 380,
    prevMotorAmperes: 71.5,
    temperaturesConforming: true,
    parametersMatchPreviousSheet: true,
    dopObservationsIdentified: false,
    deviationApprovedByLeader: false,
    dosers: {
      dos01: { checked: true, value: '70% Resina PP', conforming: true },
      dos02: { checked: true, value: '25% Talco Mineral', conforming: true },
      dos03: { checked: true, value: '3% Negro de Fumo', conforming: true },
      dos04: { checked: true, value: '2% Antioxidante', conforming: true }
    },
    dos02Homogenization: 'conforme',
    hasSideFeeder: true,
    sideFeederCurrentRpm: 280,
    sideFeederPreviousRpm: 280,
    sideFeederConforming: true,
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
  {
    id: 'rec-102',
    timestamp: '2026-10-27T07:15:00.000Z',
    machineId: 'DR02',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Marcos Vinicius',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'em_producao',
    productionOrder: 'OP-48205',
    batchNumber: 'LT-2710-02',
    productName: 'PEAD Composto Rígido Cinza',
    productivityKgh: 395,
    targetProductivityKgh: 420,
    rpm: 340,
    motorAmperes: 66.8,
    hasPreviousReferenceSheet: true,
    prevProductivityKgh: 410,
    prevRpm: 360,
    prevMotorAmperes: 69.0,
    temperaturesConforming: false,
    temperatureDeviationZones: 'Zona 4 (+14°C acima do setpoint) e Zona 5',
    parametersMatchPreviousSheet: false,
    parameterDeviationReason: 'Redução de RPM para conter cisalhamento na troca de lote',
    dopObservationsIdentified: true,
    dopObservationsDetails: 'Anotado no DOP pg 42: ajuste térmico pós-troca de resina',
    deviationApprovedByLeader: true,
    approvingLeaderName: 'Fernando Rocha',
    dosers: {
      dos01: { checked: true, value: '80% PEAD', conforming: true },
      dos02: { checked: true, value: '18% Carga', conforming: false, notes: 'Alimentação levemente irregular' },
      dos03: { checked: true, value: '2% Master Cinza', conforming: true },
      dos04: { checked: false, value: '', conforming: true }
    },
    dos02Homogenization: 'irregular',
    dos02HomogenizationNotes: 'Pequena aglomeração na rosca de dosagem, realizada limpeza rápida.',
    hasSideFeeder: false,
    circulationSystemStatus: 'ativo',
    magnetStatus: 'limpeza_realizada',
    sievePowderCondition: 'normal',
    sealerTempConforming: true,
    sealerTempMeasured: 142,
    labelCodesConforming: true,
    sealingQuality: 'conforme',
    deviationReportedToLeader: true,
    deviationReportTime: '06:50',
    deviationReportLeaderName: 'Fernando Rocha',
    deviationReportLeaderNotes: 'Líder autorizou prosseguir com monitoramento a cada 30 min.',
    hasStoppage: false,
    stoppageQuantity: 0,
    hasMaintenanceOrder: false,
    photos: []
  },
  {
    id: 'rec-103',
    timestamp: '2026-10-27T07:00:00.000Z',
    machineId: 'DR03',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Roberto Almeida',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'setup',
    setupMaterial: 'PA6.6 com Fibra de Vidro 30% Natural (Troca de Matriz e Tela 100 mesh)',
    operationalDeviationsNotes: 'Limpeza de canhão e pré-aquecimento da matriz para nova resina de engenharia.',
    photos: []
  },
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
    operatorName: 'Gilmar Santos',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'preventiva',
    operationalDeviationsNotes: 'Preventiva mensal: lubrificação de mancais e reaperto elétrico programado.',
    photos: []
  },
  {
    id: 'rec-106',
    timestamp: '2026-10-27T06:15:00.000Z',
    machineId: 'DR06',
    shift: 'Turno 1 (06h - 14h)',
    operatorName: 'Diego Ramos',
    shiftLeader: 'Fernando Rocha',
    lineStatus: 'manutencao',
    maintenanceOrderNumber: 'OM-2026-8812',
    operationalDeviationsNotes: 'Falha de acionamento do motor principal. Equipe de elétrica atendendo com a OM-2026-8812.',
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

export function saveProductionRecord(record: ProductionRecord): void {
  const current = getProductionRecords();
  const updated = [record, ...current.filter(r => r.id !== record.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteProductionRecord(id: string): void {
  const current = getProductionRecords();
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
    'Desvio Comunicado ao Líder',
    'Horário Comunicação Líder',
    'Houve Parada',
    'Qtd de Paradas',
    'Motivos das Paradas',
    'Relato Desvios',
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
    r.deviationReportedToLeader ? 'Sim' : 'Não',
    `"${r.deviationReportTime || ''}"`,
    r.hasStoppage ? 'Sim' : 'Não',
    r.stoppageQuantity || (r.hasStoppage ? 1 : 0),
    `"${(r.stoppageReasonsList && r.stoppageReasonsList.length > 0) ? r.stoppageReasonsList.join(', ') : (r.stoppageReason || '')}"`,
    `"${r.operationalDeviationsNotes?.replace(/"/g, '""') || ''}"`,
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
