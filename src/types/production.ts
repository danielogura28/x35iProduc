/**
 * Definições de Tipos para o Sistema ExtruControl
 * Controle de Linhas Extrusoras DR01 a DR06
 */

export type MachineId = 'DR01' | 'DR02' | 'DR03' | 'DR04' | 'DR05' | 'DR06';

export const MACHINE_LIST: MachineId[] = ['DR01', 'DR02', 'DR03', 'DR04', 'DR05', 'DR06'];

export type ShiftType = 'Turno 1 (06h - 14h)' | 'Turno 2 (14h - 22h)' | 'Turno 3 (22h - 06h)';

export type LineOperationalStatus = 
  | 'em_producao' 
  | 'manutencao' 
  | 'setup' 
  | 'preventiva' 
  | 'inativa';

export const LINE_STATUS_CONFIG: Record<LineOperationalStatus, { label: string; description: string; badgeColor: string }> = {
  em_producao: {
    label: 'Em Produção',
    description: 'Linha operando normalmente. Coleta completa de parâmetros, ficha e qualidade.',
    badgeColor: 'bg-emerald-700 text-white border-emerald-800'
  },
  manutencao: {
    label: 'Em Manutenção',
    description: 'Linha parada sob intervenção corretiva. Requer informar o número da OM.',
    badgeColor: 'bg-red-700 text-white border-red-800'
  },
  setup: {
    label: 'Em Setup',
    description: 'Linha em troca de matriz, cor, resina ou molde. Requer informar o material em setup.',
    badgeColor: 'bg-amber-600 text-white border-amber-700'
  },
  preventiva: {
    label: 'Em Preventiva',
    description: 'Manutenção preventiva programada. Nenhum parâmetro extra obrigatório.',
    badgeColor: 'bg-blue-700 text-white border-blue-800'
  },
  inativa: {
    label: 'Inativa / Parada',
    description: 'Linha desligada sem programação ou sem demanda. Nenhum parâmetro extra obrigatório.',
    badgeColor: 'bg-slate-600 text-white border-slate-700'
  }
};

export type TemperatureStatus = 'conforme' | 'nao_conforme';

export type MagnetStatus = 'limpo' | 'limalha_detectada' | 'limpeza_realizada' | 'nao_conforme';

export type SievePowderCondition = 'normal' | 'excesso_po' | 'peneira_obstruida' | 'presenca_finos';

export type SealingQuality = 'conforme' | 'defeituosa' | 'queimada' | 'aberta';

export type Dos02HomogenizationStatus = 'conforme' | 'irregular' | 'nao_aplicavel';

export type CirculationSystemStatus = 'ativo' | 'inativo';

export type ScaleCalibrationStatus = 'conforme' | 'vencida' | 'sem_etiqueta' | 'danificada';
export type ScaleIdentificationStatus = 'conforme' | 'divergente' | 'sem_identificacao';

export type StoppageReason = 
  | 'Mecânica' 
  | 'Elétrica' 
  | 'Troca de Tela' 
  | 'Setup / Limpeza' 
  | 'Falta de Material' 
  | 'Desvio de Processo'
  | 'Ajuste de Processo'
  | 'Qualidade / Teste'
  | 'Outro';

export const STOPPAGE_REASONS_LIST: StoppageReason[] = [
  'Mecânica',
  'Elétrica',
  'Troca de Tela',
  'Setup / Limpeza',
  'Falta de Material',
  'Desvio de Processo',
  'Ajuste de Processo',
  'Qualidade / Teste',
  'Outro'
];

export interface Operator {
  id: string;
  name: string;
}

export interface ShiftLeader {
  id: string;
  name: string;
}

export interface DoserItemCheck {
  checked: boolean;
  value?: string; // ex: "35%", "22 kg/h"
  conforming: boolean;
  notes?: string;
}

export interface DosersCheckData {
  dos01: DoserItemCheck;
  dos02: DoserItemCheck;
  dos03: DoserItemCheck;
  dos04: DoserItemCheck;
}

export interface PhotoAttachment {
  id: string;
  name: string;
  dataUrl: string;
  caption: string;
  timestamp: string;
}

export interface ProductionRecord {
  id: string;
  timestamp: string; // ISO string
  machineId: MachineId;
  shift: ShiftType;
  operatorName: string;
  shiftLeader: string;
  
  // Status inicial obrigatório da linha
  lineStatus: LineOperationalStatus;
  
  // Específico para Setup
  setupMaterial?: string;
  
  // Específico para Manutenção
  maintenanceOrderNumber?: string;
  
  // Campos de Produção
  productionOrder?: string; // OP
  batchNumber?: string; // Lote
  productName?: string; // Produto / Composto
  
  // Parâmetros operacionais atuais
  productivityKgh?: number;
  targetProductivityKgh?: number;
  rpm?: number;
  motorAmperes?: number;
  
  // Ficha anterior com referência comparativa (kg/h, RPM e Corrente)
  hasPreviousReferenceSheet?: boolean; // Se false: Não há ficha de referência
  prevProductivityKgh?: number;
  prevRpm?: number;
  prevMotorAmperes?: number;
  
  // Ficha de Processo & Temperaturas
  temperaturesConforming?: boolean;
  temperatureDeviationZones?: string;
  
  // Desvio em relação à ficha anterior e DOP
  parametersMatchPreviousSheet?: boolean;
  parameterDeviationReason?: string;
  dopObservationsIdentified?: boolean;
  dopObservationsDetails?: string;
  deviationApprovedByLeader?: boolean;
  approvingLeaderName?: string;
  
  // Conferência de Dosadoras (01, 02, 03, 04)
  dosers?: DosersCheckData;
  
  // Homogeneização da DOS02
  dos02Homogenization?: Dos02HomogenizationStatus;
  dos02HomogenizationNotes?: string;
  
  // RPM do Side Feeder (Atual vs OP Anterior de Referência)
  hasSideFeeder?: boolean;
  sideFeederCurrentRpm?: number;
  sideFeederPreviousRpm?: number;
  sideFeederConforming?: boolean;
  
  // Sistema de Circulação
  circulationSystemStatus?: CirculationSystemStatus;
  
  // Qualidade e inspeções físicas
  magnetStatus?: MagnetStatus;
  magnetNotes?: string;
  
  sievePowderCondition?: SievePowderCondition;
  sieveNotes?: string;
  
  // Seladoras e Embalagens
  sealerTempConforming?: boolean;
  sealerTempMeasured?: number;
  labelCodesConforming?: boolean;
  sealingQuality?: SealingQuality;
  packagingNotes?: string;
  
  // Balança da Linha (Conferência Obrigatória de Calibração e Identificação)
  scaleCalibrationConforming?: boolean; // Etiqueta de calibração correta/válida
  scaleCalibrationStatus?: ScaleCalibrationStatus; // 'conforme' | 'vencida' | 'sem_etiqueta' | 'danificada'
  scaleCalibrationValidityDate?: string; // Data de validade da calibração (opcional, ex: "12/2026")
  scaleIdentificationConforming?: boolean; // Etiqueta de identificação/patrimônio correta
  scaleTagNumber?: string; // Código/Tag da Balança (ex: "BAL-DR01")
  scaleCheckNotes?: string; // Observações da balança
  
  // Notificação de Desvios ao Líder com Horário
  deviationReportedToLeader?: boolean;
  deviationReportTime?: string; // Horário (ex: "09:40")
  deviationReportLeaderName?: string;
  deviationReportLeaderNotes?: string;
  
  // Ocorrências e Paradas (Apenas Quantidade e Motivos, SEM horários)
  hasStoppage?: boolean;
  stoppageQuantity?: number; // Quantidade de paradas
  stoppageReasonsList?: StoppageReason[]; // Motivos das paradas
  stoppageReason?: StoppageReason; // Principal motivo (retrocompatível)
  stoppageMinutes?: number; // retrocompatível
  hasMaintenanceOrder?: boolean;
  operationalDeviationsNotes?: string;
  
  // Evidências fotográficas
  photos: PhotoAttachment[];
}

export interface FactoryMonthlyGoals {
  targetAverageProductivityKgh: number;
  targetProcessSheetComplianceRate: number;
  maxStoppageHoursPerMachine: number;
  targetLabelComplianceRate: number;
}

export interface GlobalLineStatusConfig {
  status: LineOperationalStatus;
  setupMaterial?: string;
  maintenanceOrderNumber?: string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type GlobalLineStatuses = Record<MachineId, GlobalLineStatusConfig>;

