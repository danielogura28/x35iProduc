import React, { useState, useMemo } from 'react';
import { 
  ProductionRecord, 
  FactoryMonthlyGoals, 
  MACHINE_LIST, 
  MachineId,
  LINE_STATUS_CONFIG 
} from '../types/production';
import { 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Sliders, 
  Clock, 
  Flame, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
  Award,
  Scale,
  Magnet,
  Filter,
  Tag,
  Thermometer,
  PackageCheck,
  RefreshCw,
  FileCheck,
  Check,
  X,
  Timer
} from 'lucide-react';
import { exportDailyReportToExcel } from '../utils/excelExport';
import {
  formatAnalysisDuration,
  analyzeRecordDeviations,
  DOCUMENT_IDENTIFIER,
  DOCUMENT_FULL_TITLE
} from '../utils/deviationUtils';

interface DailyReportProps {
  records: ProductionRecord[];
  factoryGoals: FactoryMonthlyGoals;
  onRequestPinAuth?: (action: () => void) => void;
}

export const DailyReport: React.FC<DailyReportProps> = ({
  records,
  factoryGoals,
  onRequestPinAuth
}) => {
  // Inicializar com a data do registro mais recente ou hoje
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (records.length > 0) {
      const sorted = [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return sorted[0].timestamp.slice(0, 10);
    }
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const dayRecords = useMemo(() => {
    return records.filter(r => r.timestamp.startsWith(selectedDate));
  }, [records, selectedDate]);

  // Navegação de dias
  const handleShiftDay = (delta: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + delta);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const handleSetYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setSelectedDate(yest.toISOString().slice(0, 10));
  };

  // Cálculos de métricas do dia
  const metrics = useMemo(() => {
    const prodRecords = dayRecords.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
    const activeRunning = prodRecords.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);

    const avgProductivity = activeRunning.length > 0
      ? Math.round(activeRunning.reduce((acc, r) => acc + (r.productivityKgh || 0), 0) / activeRunning.length)
      : 0;

    const estimatedTotalKg = activeRunning.reduce((acc, r) => acc + ((r.productivityKgh || 0) * 4), 0);
    const estimatedTotalTons = Math.round((estimatedTotalKg / 1000) * 10) / 10;

    const conformingSheets = prodRecords.filter(r => r.temperaturesConforming && r.parametersMatchPreviousSheet).length;
    const sheetComplianceRate = prodRecords.length > 0
      ? Math.round((conformingSheets / prodRecords.length) * 100)
      : 100;

    const totalStoppagesQty = dayRecords.reduce((acc, r) => acc + (r.stoppageQuantity || (r.hasStoppage ? 1 : 0)), 0);

    const conformingLabels = prodRecords.filter(r => r.labelCodesConforming && r.sealingQuality === 'conforme').length;
    const labelComplianceRate = prodRecords.length > 0
      ? Math.round((conformingLabels / prodRecords.length) * 100)
      : 100;

    const maintenanceCount = dayRecords.filter(r => r.lineStatus === 'manutencao' || r.hasMaintenanceOrder).length;
    const setupCount = dayRecords.filter(r => r.lineStatus === 'setup').length;
    const preventiveCount = dayRecords.filter(r => r.lineStatus === 'preventiva').length;
    const reportedToLeaderCount = dayRecords.filter(r => r.deviationReportedToLeader).length;

    // 1. Auditoria Ficha Atual vs Anterior
    const sameAsPrevSheet = prodRecords.filter(r => r.hasPreviousReferenceSheet && r.parametersMatchPreviousSheet).length;
    const diffFromPrevSheet = prodRecords.filter(r => r.hasPreviousReferenceSheet && !r.parametersMatchPreviousSheet).length;
    const noPrevSheet = prodRecords.filter(r => !r.hasPreviousReferenceSheet).length;
    const sheetRepeatabilityRate = (sameAsPrevSheet + diffFromPrevSheet) > 0
      ? Math.round((sameAsPrevSheet / (sameAsPrevSheet + diffFromPrevSheet)) * 100)
      : 100;

    // 2. Condição dos Ímãs
    const magnetClean = prodRecords.filter(r => (r.magnetStatus || 'limpo') === 'limpo').length;
    const magnetCleanedInShift = prodRecords.filter(r => r.magnetStatus === 'limpeza_realizada').length;
    const magnetAlert = prodRecords.filter(r => r.magnetStatus === 'limalha_detectada').length;
    const magnetNonConforming = prodRecords.filter(r => r.magnetStatus === 'nao_conforme').length;

    // 3. Condição do Pó na Peneira
    const sieveNormal = prodRecords.filter(r => (r.sievePowderCondition || 'normal') === 'normal').length;
    const sieveAlert = prodRecords.filter(r => r.sievePowderCondition === 'excesso_po' || r.sievePowderCondition === 'presenca_finos').length;
    const sieveBlocked = prodRecords.filter(r => r.sievePowderCondition === 'peneira_obstruida').length;

    // 4. Balança da Linha (Calibração e Tags)
    const scaleConforming = prodRecords.filter(r => r.scaleCalibrationConforming || r.scaleCalibrationStatus === 'conforme').length;
    const scaleNonConforming = prodRecords.filter(r => (r.scaleCalibrationConforming === false) || (r.scaleCalibrationStatus && r.scaleCalibrationStatus !== 'conforme')).length;
    const scaleTags = Array.from(new Set(prodRecords.map(r => r.scaleTagNumber || `BAL-${r.machineId}`).filter(Boolean)));

    // 5. Faixas Térmicas e Temperaturas
    const thermalConforming = prodRecords.filter(r => r.temperaturesConforming).length;
    const thermalDeviations = prodRecords.filter(r => !r.temperaturesConforming).length;
    const thermalDeviationZonesList = prodRecords
      .filter(r => !r.temperaturesConforming && r.temperatureDeviationZones)
      .map(r => `${r.machineId}: ${r.temperatureDeviationZones}`);

    // 6. Sistema de Circulação / Refrigeração
    const circulationActive = prodRecords.filter(r => (r.circulationSystemStatus || 'ativo') === 'ativo').length;
    const circulationAlert = 0;
    const circulationDown = prodRecords.filter(r => r.circulationSystemStatus === 'inativo').length;

    // 7. Embalagem, Selagem e Etiquetas do Palete
    const palletLabelsConforming = prodRecords.filter(r => r.labelCodesConforming).length;
    const palletLabelsNonConforming = prodRecords.filter(r => r.labelCodesConforming === false).length;

    const sealConforming = prodRecords.filter(r => (r.sealingQuality || 'conforme') === 'conforme').length;
    const sealWeak = prodRecords.filter(r => r.sealingQuality === 'aberta').length;
    const sealBurnt = prodRecords.filter(r => r.sealingQuality === 'queimada').length;
    const sealNonConforming = prodRecords.filter(r => r.sealingQuality === 'defeituosa').length;

    const sealerTemps = prodRecords.map(r => r.sealerTempMeasured).filter((t): t is number => typeof t === 'number' && !isNaN(t));
    const avgSealerTemp = sealerTemps.length > 0 ? Math.round(sealerTemps.reduce((a, b) => a + b, 0) / sealerTemps.length) : null;
    const minSealerTemp = sealerTemps.length > 0 ? Math.min(...sealerTemps) : null;
    const maxSealerTemp = sealerTemps.length > 0 ? Math.max(...sealerTemps) : null;

    return {
      prodRecordsCount: prodRecords.length,
      avgProductivity,
      estimatedTotalKg,
      estimatedTotalTons,
      sheetComplianceRate,
      totalStoppagesQty,
      labelComplianceRate,
      maintenanceCount,
      setupCount,
      preventiveCount,
      reportedToLeaderCount,
      // Indicadores detalhados solicitados
      sameAsPrevSheet,
      diffFromPrevSheet,
      noPrevSheet,
      sheetRepeatabilityRate,
      magnetClean,
      magnetCleanedInShift,
      magnetAlert,
      magnetNonConforming,
      sieveNormal,
      sieveAlert,
      sieveBlocked,
      scaleConforming,
      scaleNonConforming,
      scaleTags,
      thermalConforming,
      thermalDeviations,
      thermalDeviationZonesList,
      circulationActive,
      circulationAlert,
      circulationDown,
      palletLabelsConforming,
      palletLabelsNonConforming,
      sealConforming,
      sealWeak,
      sealBurnt,
      sealNonConforming,
      avgSealerTemp,
      minSealerTemp,
      maxSealerTemp
    };
  }, [dayRecords]);

  // Turnos
  const shiftSummaries = useMemo(() => {
    const shifts = [
      { id: 'T1', name: 'Turno 1 (06h - 14h)', hours: '06:00 às 14:00' },
      { id: 'T2', name: 'Turno 2 (14h - 22h)', hours: '14:00 às 22:00' },
      { id: 'T3', name: 'Turno 3 (22h - 06h)', hours: '22:00 às 06:00' }
    ];

    return shifts.map(s => {
      const recs = dayRecords.filter(r => r.shift === s.name);
      const prod = recs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
      const active = prod.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);
      const avgKgh = active.length > 0
        ? Math.round(active.reduce((a, b) => a + (b.productivityKgh || 0), 0) / active.length)
        : 0;
      const volumeKg = active.reduce((a, b) => a + ((b.productivityKgh || 0) * 4), 0);
      const stoppages = recs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);
      const conforming = prod.length > 0
        ? Math.round((prod.filter(r => r.temperaturesConforming && r.parametersMatchPreviousSheet).length / prod.length) * 100)
        : 100;

      return {
        ...s,
        recordsCount: recs.length,
        avgKgh,
        volumeKg,
        stoppages,
        conforming
      };
    });
  }, [dayRecords]);

  // Exportar Excel com autenticação
  const handleExportExcel = () => {
    const doExport = () => {
      exportDailyReportToExcel(records, selectedDate, factoryGoals);
    };

    if (onRequestPinAuth) {
      onRequestPinAuth(doExport);
    } else {
      doExport();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const [yearStr, monthNum, dayNum] = selectedDate.split('-');
  const dateFormatted = `${dayNum}/${monthNum}/${yearStr}`;

  return (
    <div className="space-y-6">
      {/* Top Bar: Selector & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-100 text-red-900">
              <Calendar className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Relatório Detalhado Diário da Produção
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Análise consolidada por turno, desempenho das extrusoras DR01 a DR06 e KPIs diários
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker and Stepper */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => handleShiftDay(-1)}
              title="Dia anterior"
              className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-hidden"
            />
            <button
              onClick={() => handleShiftDay(1)}
              title="Próximo dia"
              className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleSetYesterday}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Ontem
          </button>

          <button
            onClick={handleSetToday}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Hoje
          </button>

          {/* Export Buttons */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">
            Volume Estimado do Dia
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.estimatedTotalKg.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs font-semibold text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
            ≈ {metrics.estimatedTotalTons} toneladas
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">
            Produtividade Média Dia
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.avgProductivity}
            </span>
            <span className="text-xs font-semibold text-slate-500">kg/h</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] mt-0.5">
            <span className="text-slate-500">Meta: {factoryGoals.targetAverageProductivityKgh} kg/h</span>
            <span className={`font-semibold ${metrics.avgProductivity >= factoryGoals.targetAverageProductivityKgh ? 'text-emerald-700' : 'text-red-700'}`}>
              ({metrics.avgProductivity >= factoryGoals.targetAverageProductivityKgh ? '+' : ''}{metrics.avgProductivity - factoryGoals.targetAverageProductivityKgh})
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">
            Conformidade de Ficha & Térmica
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {metrics.sheetComplianceRate}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${metrics.sheetComplianceRate >= factoryGoals.targetProcessSheetComplianceRate ? 'bg-emerald-600' : 'bg-amber-500'}`}
              style={{ width: `${metrics.sheetComplianceRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">
            Paradas & Ocorrências
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-2xl font-black font-mono ${metrics.totalStoppagesQty === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {metrics.totalStoppagesQty}
            </span>
            <span className="text-xs font-semibold text-slate-500">parada(s)</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {metrics.maintenanceCount} OM(s) • {metrics.setupCount} Setup(s) • {metrics.reportedToLeaderCount} alinhados
          </span>
        </div>
      </div>

      {/* Painel de Auditoria de Processo, Qualidade & 5S Operacional */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-100 text-red-900">
              <FileCheck className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Auditoria de Processo, Ficha Técnica, Ímãs, Balança & Embalagem
              </h3>
              <p className="text-[11px] text-slate-500">
                Indicadores de repetibilidade, integridade de filtros, calibração e qualidade física do produto
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-auto font-mono">
            {metrics.prodRecordsCount} apontamentos analisados
          </span>
        </div>

        {/* Grid de Cartões de Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Ficha Atual vs Anterior */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                  Ficha Atual vs Anterior
                </span>
                <span className="text-xs font-black font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  {metrics.sheetRepeatabilityRate}% Repet.
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Parâmetros Iguais:</span>
                  <span className="font-bold text-emerald-700 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" /> {metrics.sameAsPrevSheet}x
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Parâmetros Diferentes:</span>
                  <span className={`font-bold font-mono flex items-center gap-1 ${metrics.diffFromPrevSheet > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {metrics.diffFromPrevSheet > 0 ? <AlertTriangle className="w-3 h-3 text-amber-600" /> : null}
                    {metrics.diffFromPrevSheet}x
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Sem Ficha Anterior:</span>
                  <span className="font-mono text-slate-600">{metrics.noPrevSheet}x</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
              {metrics.diffFromPrevSheet === 0 ? '100% de estabilidade vs ficha anterior' : `${metrics.diffFromPrevSheet} desvio(s) justificado(s)`}
            </div>
          </div>

          {/* 2. Condições dos Ímãs */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Magnet className="w-3.5 h-3.5 text-red-600" />
                  Condição dos Ímãs
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${metrics.magnetNonConforming > 0 ? 'bg-red-100 text-red-800' : (metrics.magnetAlert > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}`}>
                  {metrics.magnetNonConforming > 0 ? 'Crítico' : (metrics.magnetAlert > 0 ? 'Atenção' : 'Conforme')}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Conforme / Limpo:</span>
                  <span className="font-bold text-emerald-700 font-mono">{metrics.magnetClean}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Limpeza Realizada:</span>
                  <span className="font-bold text-blue-700 font-mono">{metrics.magnetCleanedInShift}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Alerta (Partículas):</span>
                  <span className={`font-bold font-mono ${metrics.magnetAlert > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{metrics.magnetAlert}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Não Conforme (Crítico):</span>
                  <span className={`font-bold font-mono ${metrics.magnetNonConforming > 0 ? 'text-red-700' : 'text-slate-500'}`}>{metrics.magnetNonConforming}x</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
              Barreira magnética ativa contra contaminações metálicas
            </div>
          </div>

          {/* 3. Peneira & Condição de Pó */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-600" />
                  Pó na Peneira
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${metrics.sieveBlocked > 0 ? 'bg-red-100 text-red-800' : (metrics.sieveAlert > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}`}>
                  {metrics.sieveBlocked > 0 ? 'Bloqueio' : (metrics.sieveAlert > 0 ? 'Excesso de Pó' : 'Normal')}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Normal / Conforme:</span>
                  <span className="font-bold text-emerald-700 font-mono">{metrics.sieveNormal}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Alerta (Excesso Pó):</span>
                  <span className={`font-bold font-mono ${metrics.sieveAlert > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{metrics.sieveAlert}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Bloqueio / Limpeza:</span>
                  <span className={`font-bold font-mono ${metrics.sieveBlocked > 0 ? 'text-red-700' : 'text-slate-500'}`}>{metrics.sieveBlocked}x</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
              Controle de finos, uniformidade do pellet e peneiramento
            </div>
          </div>

          {/* 4. Balança da Linha & Calibração */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-red-800" />
                  Balança da Linha
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${metrics.scaleNonConforming > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {metrics.scaleNonConforming > 0 ? 'Desvio Selo' : 'Calibradas'}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Calibração Conforme:</span>
                  <span className="font-bold text-emerald-700 font-mono">{metrics.scaleConforming}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Vencida / Sem Etiqueta:</span>
                  <span className={`font-bold font-mono ${metrics.scaleNonConforming > 0 ? 'text-red-700' : 'text-slate-500'}`}>{metrics.scaleNonConforming}x</span>
                </div>
                <div className="flex justify-between items-start pt-1">
                  <span className="text-slate-500 text-[11px]">Tags na Linha:</span>
                  <span className="font-mono text-[10px] font-bold text-slate-800 text-right max-w-[120px] truncate" title={metrics.scaleTags.join(', ')}>
                    {metrics.scaleTags.length > 0 ? metrics.scaleTags.slice(0, 3).join(', ') : 'Padrão BAL-DR'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
              Garantia metrológica de pesagem e etiquetagem ISO
            </div>
          </div>

        </div>

        {/* Linha 2 de Indicadores: Temperaturas, Circulação e Embalagem/Selagem */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* 5. Temperaturas e Zonas do Canhão */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-600" />
                Temperaturas & Zonas Térmicas
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${metrics.thermalDeviations > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {metrics.thermalDeviations > 0 ? `${metrics.thermalDeviations} Desvio(s)` : '100% Conforme'}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Temperaturas em Ficha:</span>
                <span className="font-bold text-emerald-700 font-mono">{metrics.thermalConforming}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Desvios de Faixa Térmica:</span>
                <span className={`font-bold font-mono ${metrics.thermalDeviations > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{metrics.thermalDeviations}x</span>
              </div>
              {metrics.thermalDeviationZonesList.length > 0 && (
                <div className="pt-2 text-[10px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                  <strong>Zonas com desvio:</strong> {metrics.thermalDeviationZonesList.slice(0, 2).join('; ')}
                </div>
              )}
            </div>
          </div>

          {/* 6. Sistema de Circulação e Refrigeração */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-600" />
                Sistema de Circulação / Refrigeração
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${metrics.circulationDown > 0 ? 'bg-red-100 text-red-800' : (metrics.circulationAlert > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}`}>
                {metrics.circulationDown > 0 ? 'Inoperante' : (metrics.circulationAlert > 0 ? 'Alerta' : 'Ativo')}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Circulação Ativa / Normal:</span>
                <span className="font-bold text-emerald-700 font-mono">{metrics.circulationActive}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Alerta de Pressão/Fluxo:</span>
                <span className={`font-bold font-mono ${metrics.circulationAlert > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{metrics.circulationAlert}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Circulação Inoperante:</span>
                <span className={`font-bold font-mono ${metrics.circulationDown > 0 ? 'text-red-700' : 'text-slate-500'}`}>{metrics.circulationDown}x</span>
              </div>
            </div>
          </div>

          {/* 7. Embalagem, Selagem e Etiquetas do Palete */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-700" />
                Embalagem, Selagem & Palete
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${metrics.palletLabelsNonConforming > 0 || metrics.sealNonConforming > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {metrics.palletLabelsNonConforming > 0 ? 'Divergência' : 'Conforme'}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Etiquetas Palete Conformes:</span>
                <span className="font-bold text-emerald-700 font-mono">{metrics.palletLabelsConforming}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Etiquetas Não Conformes:</span>
                <span className={`font-bold font-mono ${metrics.palletLabelsNonConforming > 0 ? 'text-red-700' : 'text-slate-500'}`}>{metrics.palletLabelsNonConforming}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Selagem Conforme:</span>
                <span className="font-bold text-emerald-700 font-mono">{metrics.sealConforming}x</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>Desvios Selagem:</span>
                <span>Fraca: <strong>{metrics.sealWeak}</strong> • Queimada: <strong>{metrics.sealBurnt}</strong></span>
              </div>
              {metrics.avgSealerTemp !== null && (
                <div className="pt-1 flex justify-between items-center text-[11px] text-slate-700 border-t border-slate-200 mt-1">
                  <span>Faixa Temp. Seladora:</span>
                  <span className="font-mono font-bold">{metrics.avgSealerTemp}°C <span className="text-slate-400 font-normal">({metrics.minSealerTemp}-{metrics.maxSealerTemp}°C)</span></span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Turnos Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-700" />
          <span>Desempenho por Turno de Trabalho ({dateFormatted})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shiftSummaries.map((s) => (
            <div 
              key={s.id}
              className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                    <span className="text-[10px] text-slate-500">{s.hours}</span>
                  </div>
                  <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">
                    {s.recordsCount} registros
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Produtividade Média:</span>
                    <span className="font-bold text-slate-900 font-mono">{s.avgKgh} kg/h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Volume Estimado:</span>
                    <span className="font-bold text-slate-900 font-mono">{s.volumeKg.toLocaleString('pt-BR')} kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Conformidade Ficha:</span>
                    <span className={`font-bold font-mono ${s.conforming >= 90 ? 'text-emerald-700' : 'text-amber-700'}`}>{s.conforming}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Paradas no Turno:</span>
                    <span className={`font-bold font-mono ${s.stoppages > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{s.stoppages}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar vs goal */}
              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Atingimento da Meta</span>
                  <span className="font-mono font-bold">
                    {s.avgKgh > 0 ? Math.round((s.avgKgh / factoryGoals.targetAverageProductivityKgh) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-red-700 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, s.avgKgh > 0 ? (s.avgKgh / factoryGoals.targetAverageProductivityKgh) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extruders Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-700" />
            <span>Matriz Comparativa das Linhas Extrusoras (DR01 a DR06)</span>
          </h3>
          <span className="text-xs text-slate-500">
            Total de {dayRecords.length} apontamentos registrados nesta data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Linha</th>
                <th className="py-3 px-3">Status no Dia</th>
                <th className="py-3 px-3 text-right">Produtividade Média</th>
                <th className="py-3 px-3 text-right">Meta (kg/h)</th>
                <th className="py-3 px-3 text-right">Atingimento %</th>
                <th className="py-3 px-3 text-center">Desvios de Processo</th>
                <th className="py-3 px-3 text-center">Tempo Análise</th>
                <th className="py-3 px-3 text-center">Paradas</th>
                <th className="py-3 px-4">Última OP / Composto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MACHINE_LIST.map((mId) => {
                const mRecs = dayRecords.filter(r => r.machineId === mId);
                const mProd = mRecs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
                const mActive = mProd.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);

                const avgKgh = mActive.length > 0
                  ? Math.round(mActive.reduce((a, b) => a + (b.productivityKgh || 0), 0) / mActive.length)
                  : 0;

                const targetKgh = mActive[0]?.targetProductivityKgh || factoryGoals.targetAverageProductivityKgh;
                const attainment = targetKgh > 0 ? Math.round((avgKgh / targetKgh) * 100) : 0;

                const stoppages = mRecs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);

                const latest = mRecs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                const status = latest?.lineStatus || (mRecs.length > 0 ? 'em_producao' : undefined);
                const deviations = latest ? analyzeRecordDeviations(latest) : [];

                return (
                  <tr key={mId} className={`transition-colors ${deviations.length > 0 ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50/80'}`}>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded bg-red-900 text-white font-extrabold inline-flex items-center justify-center text-xs">
                          {mId}
                        </span>
                        {deviations.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" title="Linha com desvios ativos" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {status ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${LINE_STATUS_CONFIG[status]?.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                          {LINE_STATUS_CONFIG[status]?.label || status}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sem registros</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {avgKgh > 0 ? `${avgKgh} kg/h` : '--'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {targetKgh} kg/h
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {avgKgh > 0 ? (
                        <span className={`font-bold ${attainment >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {attainment}%
                        </span>
                      ) : '--'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {deviations.length > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-900 font-bold font-mono text-[10px] border border-red-300">
                            {deviations.length} {deviations.length === 1 ? 'desvio' : 'desvios'}
                          </span>
                          <span className="text-[10px] text-red-700 font-medium truncate max-w-[130px]" title={deviations.map(d => d.description).join(' | ')}>
                            {deviations[0].label}
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px] flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Conforme
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-700">
                      {latest?.analysisDurationSeconds !== undefined && latest.analysisDurationSeconds > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                          <Timer className="w-3 h-3 text-slate-500" />
                          {formatAnalysisDuration(latest.analysisDurationSeconds)}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded ${stoppages > 0 ? 'bg-red-100 text-red-800' : 'text-slate-400'}`}>
                        {stoppages}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate">
                      {latest ? (
                        <span>
                          <strong>{latest.productionOrder || 'S/OP'}</strong> - {latest.productName || latest.setupMaterial || 'Material padrão'}
                        </span>
                      ) : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ocorrências e Paradas do Dia */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Ocorrências, Paradas e Alinhamentos com o Líder ({dateFormatted})</span>
          </h3>
          <span className="text-xs text-slate-500">
            Registro de OMs, Setups e desvios operacionais
          </span>
        </div>

        {dayRecords.filter(r => 
          r.hasStoppage || 
          r.lineStatus === 'manutencao' || 
          r.lineStatus === 'setup' || 
          !r.temperaturesConforming || 
          r.deviationReportedToLeader
        ).length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhuma ocorrência, desvio ou parada registrada nesta data. Operação contínua.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {dayRecords
              .filter(r => 
                r.hasStoppage || 
                r.lineStatus === 'manutencao' || 
                r.lineStatus === 'setup' || 
                !r.temperaturesConforming || 
                r.deviationReportedToLeader
              )
              .map((r) => {
                const timeStr = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={r.id} className="p-4 hover:bg-slate-50 flex flex-col md:flex-row md:items-start justify-between gap-4 text-xs">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold bg-red-950 text-white px-2 py-0.5 rounded text-[11px]">
                          {r.machineId}
                        </span>
                        <span className="text-slate-500 font-mono">{timeStr}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-800">{r.shift}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">Operador: <strong>{r.operatorName}</strong></span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">Líder: <strong>{r.shiftLeader}</strong></span>
                      </div>

                      {/* Event Details */}
                      <div className="pt-1 flex flex-wrap gap-2 items-center">
                        {r.hasStoppage && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold border border-red-200">
                            Parada ({r.stoppageQuantity || 1}x): {(r.stoppageReasonsList && r.stoppageReasonsList.length > 0) ? r.stoppageReasonsList.join(', ') : (r.stoppageReason || 'Geral')}
                          </span>
                        )}

                        {r.lineStatus === 'manutencao' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-900 rounded font-bold border border-red-300">
                            OM: {r.maintenanceOrderNumber || 'Registrada'}
                          </span>
                        )}

                        {r.lineStatus === 'setup' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold border border-amber-300">
                            Setup: {r.setupMaterial || 'Material em troca'}
                          </span>
                        )}

                        {!r.temperaturesConforming && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold border border-amber-300">
                            Desvio Térmico: {r.temperatureDeviationZones || 'Zonas fora de ficha'}
                          </span>
                        )}
                      </div>

                      {r.operationalDeviationsNotes && (
                        <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                          {r.operationalDeviationsNotes}
                        </p>
                      )}
                    </div>

                    {/* Alinhamento com Líder */}
                    {r.deviationReportedToLeader && (
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-emerald-950 min-w-[240px] shrink-0">
                        <span className="font-bold flex items-center gap-1 text-[11px] text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Informado ao Líder às {r.deviationReportTime || '--:--'}
                        </span>
                        <p className="text-[11px] text-emerald-900 mt-1">
                          {r.deviationReportLeaderNotes || `Parecer registrado por ${r.deviationReportLeaderName || r.shiftLeader}`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Rodapé Oficial PE_RG_034 */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 font-mono">
        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {DOCUMENT_FULL_TITLE}
        </span>
        <span className="text-slate-400">PetroPol Polímeros • Controle e Auditoria de Processo Diário</span>
        <span className="text-slate-400">Tempo de Análise Contabilizado Automaticamente</span>
      </div>
    </div>
  );
};
