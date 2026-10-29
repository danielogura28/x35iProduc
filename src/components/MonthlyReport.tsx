import React, { useState, useMemo } from 'react';
import { 
  ProductionRecord, 
  FactoryMonthlyGoals, 
  MACHINE_LIST, 
  MachineId 
} from '../types/production';
import { 
  Printer, 
  Download, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  Clock, 
  Wrench,
  Camera,
  Calendar,
  Sliders,
  CalendarClock,
  FileSpreadsheet,
  Lock,
  FileText,
  BarChart3
} from 'lucide-react';
import { exportToCSV } from '../utils/storage';
import { exportMonthlyReportToExcel } from '../utils/excelExport';
import { DailyReport } from './DailyReport';
import { PowerBIDashboard } from './PowerBIDashboard';
import { getMonthWeeks, isTimestampInRange } from '../utils/dateUtils';

interface MonthlyReportProps {
  records: ProductionRecord[];
  factoryGoals: FactoryMonthlyGoals;
  onUpdateGoals: (newGoals: FactoryMonthlyGoals) => void;
  onRequestPinAuth?: (action: () => void) => void;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({
  records,
  factoryGoals,
  onUpdateGoals,
  onRequestPinAuth
}) => {
  const [reportView, setReportView] = useState<'powerbi' | 'daily' | 'monthly'>('powerbi');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('all');
  const [showGoalEditor, setShowGoalEditor] = useState<boolean>(false);
  const [editingGoals, setEditingGoals] = useState<FactoryMonthlyGoals>(factoryGoals);

  const monthWeeks = useMemo(() => {
    return getMonthWeeks(selectedMonth);
  }, [selectedMonth]);

  const activeWeek = useMemo(() => {
    return monthWeeks.find(w => w.id === selectedWeekFilter) || monthWeeks[0];
  }, [monthWeeks, selectedWeekFilter]);

  const monthRecords = useMemo(() => {
    let list = records.filter(r => r.timestamp.startsWith(selectedMonth));
    if (selectedWeekFilter !== 'all' && activeWeek) {
      list = list.filter(r => isTimestampInRange(r.timestamp, activeWeek.start, activeWeek.end));
    }
    return list;
  }, [records, selectedMonth, selectedWeekFilter, activeWeek]);

  const consolidatedMetrics = useMemo(() => {
    const totalRecords = monthRecords.length;
    if (totalRecords === 0) {
      return {
        avgProductivity: 0,
        estimatedTotalTons: 0,
        processSheetComplianceRate: 0,
        totalStoppageMinutes: 0,
        totalStoppageHours: 0,
        operationalAvailability: 100,
        labelComplianceRate: 0,
        totalMaintenanceOrders: 0,
        totalSetupChecks: 0,
        totalPreventiveChecks: 0,
        totalPhotos: 0
      };
    }

    const prodRecords = monthRecords.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
    const activeRunningRecords = prodRecords.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);

    const avgProductivity = activeRunningRecords.length > 0 
      ? Math.round(activeRunningRecords.reduce((acc, r) => acc + (r.productivityKgh || 0), 0) / activeRunningRecords.length)
      : 0;

    const estimatedTotalKg = activeRunningRecords.reduce((acc, r) => acc + ((r.productivityKgh || 0) * 4), 0);
    const estimatedTotalTons = Math.round((estimatedTotalKg / 1000) * 10) / 10;

    const conformingSheets = prodRecords.filter(r => r.temperaturesConforming && r.parametersMatchPreviousSheet).length;
    const processSheetComplianceRate = prodRecords.length > 0 
      ? Math.round((conformingSheets / prodRecords.length) * 100) 
      : 100;

    const totalStoppageMinutes = monthRecords.reduce((acc, r) => {
      if (r.lineStatus === 'manutencao' || r.lineStatus === 'setup' || r.lineStatus === 'preventiva' || r.lineStatus === 'inativa') {
        return acc + (r.stoppageMinutes || 240); // 4h por turno parado se não especificado
      }
      return acc + (r.stoppageMinutes || 0);
    }, 0);
    const totalStoppageHours = Math.round((totalStoppageMinutes / 60) * 10) / 10;

    const totalTurnoMinutes = totalRecords * 240;
    const operationalAvailability = totalTurnoMinutes > 0
      ? Math.max(0, Math.round(((totalTurnoMinutes - totalStoppageMinutes) / totalTurnoMinutes) * 100))
      : 100;

    const conformingLabels = prodRecords.filter(r => r.labelCodesConforming && r.sealingQuality === 'conforme').length;
    const labelComplianceRate = prodRecords.length > 0 
      ? Math.round((conformingLabels / prodRecords.length) * 100)
      : 100;

    const totalMaintenanceOrders = monthRecords.filter(r => r.lineStatus === 'manutencao' || r.hasMaintenanceOrder).length;
    const totalSetupChecks = monthRecords.filter(r => r.lineStatus === 'setup').length;
    const totalPreventiveChecks = monthRecords.filter(r => r.lineStatus === 'preventiva').length;
    const totalPhotos = monthRecords.reduce((acc, r) => acc + r.photos.length, 0);

    return {
      avgProductivity,
      estimatedTotalTons,
      processSheetComplianceRate,
      totalStoppageMinutes,
      totalStoppageHours,
      operationalAvailability,
      labelComplianceRate,
      totalMaintenanceOrders,
      totalSetupChecks,
      totalPreventiveChecks,
      totalPhotos
    };
  }, [monthRecords]);

  // Ranking de Operadores
  const operatorRanking = useMemo(() => {
    const map: Record<string, { totalProd: number; activeCount: number; allCount: number; conformingCount: number; stoppageMins: number }> = {};

    monthRecords.forEach(r => {
      if (!map[r.operatorName]) {
        map[r.operatorName] = { totalProd: 0, activeCount: 0, allCount: 0, conformingCount: 0, stoppageMins: 0 };
      }
      map[r.operatorName].allCount += 1;
      const status = r.lineStatus || 'em_producao';
      if (status === 'em_producao' && !r.hasStoppage) {
        map[r.operatorName].activeCount += 1;
        map[r.operatorName].totalProd += (r.productivityKgh || 0);
      }
      if (status === 'em_producao' && r.temperaturesConforming && r.parametersMatchPreviousSheet) {
        map[r.operatorName].conformingCount += 1;
      }
      if (r.hasStoppage || status !== 'em_producao') {
        map[r.operatorName].stoppageMins += r.stoppageMinutes || (status !== 'em_producao' ? 60 : 0);
      }
    });

    return Object.entries(map).map(([name, data]) => {
      const avgProd = data.activeCount > 0 ? Math.round(data.totalProd / data.activeCount) : 0;
      const complianceRate = data.allCount > 0 ? Math.round((data.conformingCount / data.allCount) * 100) : 100;
      const efficiencyScore = Math.round(((avgProd / 450) * 70) + (complianceRate * 0.3));

      return {
        name,
        avgProd,
        complianceRate,
        stoppageMins: data.stoppageMins,
        allCount: data.allCount,
        efficiencyScore
      };
    }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  }, [monthRecords]);

  // Maiores Problemas e Ofensores
  const topIssues = useMemo(() => {
    const stoppageMap: Record<string, { count: number; minutes: number }> = {};
    const machineIssuesMap: Record<string, number> = {};

    monthRecords.forEach(r => {
      const status = r.lineStatus || 'em_producao';
      if (status === 'manutencao') {
        const reason = 'Manutenção Corretiva (OM)';
        if (!stoppageMap[reason]) stoppageMap[reason] = { count: 0, minutes: 0 };
        stoppageMap[reason].count += 1;
        stoppageMap[reason].minutes += r.stoppageMinutes || 240;
        machineIssuesMap[r.machineId] = (machineIssuesMap[r.machineId] || 0) + 1;
      } else if (status === 'setup') {
        const reason = 'Troca de Matriz / Setup';
        if (!stoppageMap[reason]) stoppageMap[reason] = { count: 0, minutes: 0 };
        stoppageMap[reason].count += 1;
        stoppageMap[reason].minutes += r.stoppageMinutes || 90;
      } else if (status === 'preventiva') {
        const reason = 'Preventiva Programada';
        if (!stoppageMap[reason]) stoppageMap[reason] = { count: 0, minutes: 0 };
        stoppageMap[reason].count += 1;
        stoppageMap[reason].minutes += r.stoppageMinutes || 180;
      } else if (r.hasStoppage) {
        const reason = r.stoppageReason || 'Outro';
        if (!stoppageMap[reason]) stoppageMap[reason] = { count: 0, minutes: 0 };
        stoppageMap[reason].count += 1;
        stoppageMap[reason].minutes += r.stoppageMinutes || 0;
      }

      if (status === 'em_producao' && (!r.temperaturesConforming || !r.parametersMatchPreviousSheet || r.hasStoppage)) {
        machineIssuesMap[r.machineId] = (machineIssuesMap[r.machineId] || 0) + 1;
      }
    });

    const sortedStoppages = Object.entries(stoppageMap)
      .map(([reason, d]) => ({ reason, ...d }))
      .sort((a, b) => b.minutes - a.minutes);

    const sortedMachines = Object.entries(machineIssuesMap)
      .map(([machineId, count]) => ({ machineId, count }))
      .sort((a, b) => b.count - a.count);

    return {
      topStoppages: sortedStoppages,
      topCriticalMachines: sortedMachines
    };
  }, [monthRecords]);

  // Ocorrências Críticas / OMs / Setups
  const criticalOccurrences = useMemo(() => {
    return monthRecords.filter(r => 
      r.lineStatus === 'manutencao' || 
      r.lineStatus === 'setup' || 
      r.hasMaintenanceOrder || 
      r.hasStoppage || 
      r.parametersMatchPreviousSheet === false
    );
  }, [monthRecords]);

  const monthEvidences = useMemo(() => {
    return monthRecords.flatMap(r => r.photos.map(p => ({ 
      ...p, 
      machineId: r.machineId, 
      status: r.lineStatus || 'em_producao',
      op: r.productionOrder || r.maintenanceOrderNumber || r.setupMaterial || '-' 
    })));
  }, [monthRecords]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const runExport = () => {
      exportMonthlyReportToExcel(records, selectedMonth, factoryGoals);
    };

    if (onRequestPinAuth) {
      onRequestPinAuth(runExport);
    } else {
      runExport();
    }
  };

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGoals(editingGoals);
    setShowGoalEditor(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Segmented View Switcher: Power BI vs Diário vs Mensal */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div className="inline-flex max-w-full overflow-x-auto scrollbar-none bg-slate-200/90 p-1 rounded-xl border border-slate-300">
          <button
            type="button"
            onClick={() => setReportView('powerbi')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              reportView === 'powerbi'
                ? 'bg-slate-900 text-amber-300 shadow-sm border border-slate-700'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Dashboard Power BI</span>
          </button>

          <button
            type="button"
            onClick={() => setReportView('daily')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              reportView === 'daily'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Relatório Diário</span>
          </button>

          <button
            type="button"
            onClick={() => setReportView('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              reportView === 'monthly'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Relatório Mensal</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Módulo Gerencial de Relatórios • PetroPol
        </span>
      </div>

      {reportView === 'powerbi' ? (
        <PowerBIDashboard
          records={records}
          factoryGoals={factoryGoals}
          onRequestPinAuth={onRequestPinAuth}
        />
      ) : reportView === 'daily' ? (
        <DailyReport
          records={records}
          factoryGoals={factoryGoals}
          onRequestPinAuth={onRequestPinAuth}
        />
      ) : (
        <>
          {/* Top Action Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-red-800" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Relatório Gerencial de Fechamento de Turno & Desempenho Mensal
            </h2>
            <p className="text-xs text-slate-500">
              Consolidação de indicadores, metas alcançadas, ranking de eficiência e maiores ofensores
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Mês:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedWeekFilter('all');
              }}
              className="bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs font-bold text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Semana:</span>
            <select
              value={selectedWeekFilter}
              onChange={(e) => setSelectedWeekFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs font-bold text-slate-800"
            >
              {monthWeeks.map(w => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowGoalEditor(true)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Target className="w-3.5 h-3.5 text-red-800" />
            <span>Configurar Metas</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-400 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Exportar Dashboard Visual em Excel com gráficos de barras em células, análise de Pareto, Scorecards e ranking (Requer autorização da gestão)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Exportar Dashboard Excel (.xlsx)</span>
            <Lock className="w-3 h-3 text-emerald-600" />
          </button>

          <button
            onClick={() => exportToCSV(monthRecords)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold text-white bg-red-800 hover:bg-red-900 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Goal Editor Modal */}
      {showGoalEditor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-red-800" />
              <span>Metas Mensais da Fábrica</span>
            </h3>
            <p className="text-xs text-slate-500">
              Defina os parâmetros padrão de desempenho para aferição do relatório de gestão.
            </p>

            <form onSubmit={handleSaveGoals} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Meta de Produtividade Média Global (kg/h):
                </label>
                <input
                  type="number"
                  value={editingGoals.targetAverageProductivityKgh}
                  onChange={(e) => setEditingGoals({ ...editingGoals, targetAverageProductivityKgh: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border rounded p-2 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Meta de Aderência à Ficha de Processo (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingGoals.targetProcessSheetComplianceRate}
                  onChange={(e) => setEditingGoals({ ...editingGoals, targetProcessSheetComplianceRate: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border rounded p-2 font-mono font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowGoalEditor(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-bold rounded"
                >
                  Salvar Metas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CORPO DO RELATÓRIO EXECUTIVO */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-8 print:p-0 print:border-none print:shadow-none print:space-y-6">
        
        {/* Cabeçalho Oficial */}
        <div className="border-b-2 border-red-900 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-950 text-white flex items-center justify-center font-extrabold text-xl font-mono">
                EC
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Relatório Mensal de Gestão Operacional
                </h1>
                <p className="text-xs font-semibold text-red-900">
                  ExtruControl · Divisão de Extrusão Termoplástica · Linhas DR01 a DR06
                </p>
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5">
              <div className="font-bold text-slate-800">
                Período: <span className="font-mono text-red-900">{selectedMonth}</span>
              </div>
              <div className="text-slate-500">
                Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-slate-500">
                Total de Apontamentos Analisados: <strong className="text-slate-800">{monthRecords.length}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 1. KPIs */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-800 rounded-full"></span>
            <span>1. Indicadores de Desempenho Consolidados (KPIs)</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Produtividade Média</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {consolidatedMetrics.avgProductivity} <span className="text-xs font-normal text-slate-500">kg/h</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                Meta: {factoryGoals.targetAverageProductivityKgh} kg/h
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Volume Estimado</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {consolidatedMetrics.estimatedTotalTons} <span className="text-xs font-normal text-slate-500">ton</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Produção líquida</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Conformidade Ficha</span>
              <span className={`text-lg font-bold font-mono tabular-nums ${
                consolidatedMetrics.processSheetComplianceRate >= factoryGoals.targetProcessSheetComplianceRate ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {consolidatedMetrics.processSheetComplianceRate}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                Meta: {factoryGoals.targetProcessSheetComplianceRate}%
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Tempo de Paradas</span>
              <span className="text-lg font-bold text-red-800 font-mono tabular-nums">
                {consolidatedMetrics.totalStoppageHours} <span className="text-xs font-normal text-slate-500">h</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                {consolidatedMetrics.totalStoppageMinutes} minutos
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Disponibilidade</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {consolidatedMetrics.operationalAvailability}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Parque operacional</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Intervenções de Manutenção</span>
              <span className="text-lg font-bold text-red-800 font-mono tabular-nums">
                {consolidatedMetrics.totalMaintenanceOrders} <span className="text-xs font-normal text-slate-500">OMs</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{consolidatedMetrics.totalSetupChecks} setups</span>
            </div>
          </div>
        </div>

        {/* 2. Metas Alcançadas */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-800 rounded-full"></span>
            <span>2. Status de Metas Alcançadas vs Metas da Fábrica</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Produtividade Média Global</h3>
                  <span className="text-[11px] text-slate-500">Meta: {factoryGoals.targetAverageProductivityKgh} kg/h</span>
                </div>
                {consolidatedMetrics.avgProductivity >= factoryGoals.targetAverageProductivityKgh ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">
                    META ALCANÇADA
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded">
                    ABAIXO DA META
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {consolidatedMetrics.avgProductivity}
                </span>
                <span className="text-xs text-slate-500">/ {factoryGoals.targetAverageProductivityKgh} kg/h</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${consolidatedMetrics.avgProductivity >= factoryGoals.targetAverageProductivityKgh ? 'bg-emerald-600' : 'bg-red-700'}`}
                  style={{ width: `${Math.min((consolidatedMetrics.avgProductivity / factoryGoals.targetAverageProductivityKgh) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Conformidade de Ficha de Processo</h3>
                  <span className="text-[11px] text-slate-500">Meta: {factoryGoals.targetProcessSheetComplianceRate}%</span>
                </div>
                {consolidatedMetrics.processSheetComplianceRate >= factoryGoals.targetProcessSheetComplianceRate ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">
                    META ALCANÇADA
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded">
                    ABAIXO DA META
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {consolidatedMetrics.processSheetComplianceRate}%
                </span>
                <span className="text-xs text-slate-500">/ {factoryGoals.targetProcessSheetComplianceRate}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${consolidatedMetrics.processSheetComplianceRate >= factoryGoals.targetProcessSheetComplianceRate ? 'bg-emerald-600' : 'bg-amber-600'}`}
                  style={{ width: `${Math.min((consolidatedMetrics.processSheetComplianceRate / factoryGoals.targetProcessSheetComplianceRate) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Conformidade Embalagem & Selagem</h3>
                  <span className="text-[11px] text-slate-500">Meta: {factoryGoals.targetLabelComplianceRate}%</span>
                </div>
                {consolidatedMetrics.labelComplianceRate >= factoryGoals.targetLabelComplianceRate ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded">
                    META ALCANÇADA
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded">
                    EM ACOMPANHAMENTO
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {consolidatedMetrics.labelComplianceRate}%
                </span>
                <span className="text-xs text-slate-500">/ {factoryGoals.targetLabelComplianceRate}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${consolidatedMetrics.labelComplianceRate >= factoryGoals.targetLabelComplianceRate ? 'bg-emerald-600' : 'bg-red-700'}`}
                  style={{ width: `${Math.min((consolidatedMetrics.labelComplianceRate / factoryGoals.targetLabelComplianceRate) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Ranking de Operadores */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-red-800" />
              <span>3. Operadores com Melhor Eficiência Produtiva no Mês</span>
            </h2>
            <span className="text-[11px] text-slate-500">Calculado sobre vazão efetiva e conformidade sem desvios</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 text-center">Posição</th>
                  <th className="py-2.5 px-3">Operador</th>
                  <th className="py-2.5 px-3 text-right">Produtividade Média</th>
                  <th className="py-2.5 px-3 text-center">Conformidade Ficha</th>
                  <th className="py-2.5 px-3 text-center">Apontamentos</th>
                  <th className="py-2.5 px-3 text-center">Classificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operatorRanking.map((op, idx) => (
                  <tr key={op.name} className={idx === 0 ? 'bg-amber-50/30 font-semibold' : ''}>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono font-bold text-xs ${
                        idx === 0 
                          ? 'bg-amber-500 text-white shadow-xs' 
                          : idx === 1 
                          ? 'bg-slate-400 text-white' 
                          : idx === 2 
                          ? 'bg-amber-800 text-white' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {idx + 1}º
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{op.name}</div>
                      {idx === 0 && <span className="text-[10px] text-amber-700 font-semibold uppercase">★ Destaque Operacional do Mês</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {op.avgProd} <span className="text-[10px] text-slate-500 font-normal">kg/h</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                        op.complianceRate >= 95 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {op.complianceRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {op.allCount}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        op.efficiencyScore >= 95 
                          ? 'bg-emerald-700 text-white' 
                          : op.efficiencyScore >= 80 
                          ? 'bg-red-800 text-white' 
                          : 'bg-slate-600 text-white'
                      }`}>
                        {op.efficiencyScore >= 95 ? 'Excelente' : op.efficiencyScore >= 80 ? 'Bom Desempenho' : 'Adequado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Maiores Problemas e Ofensores */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-800" />
            <span>4. Maiores Problemas e Ofensores Sinalizados no Mês</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                Gargalos e Motivos de Parada / Setup
              </h3>
              {topIssues.topStoppages.length > 0 ? (
                <div className="space-y-2">
                  {topIssues.topStoppages.map((item, idx) => (
                    <div key={item.reason} className="flex justify-between items-center text-xs bg-white p-2.5 rounded border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-900">{idx + 1}. {item.reason}</span>
                        <span className="text-slate-500 ml-2">({item.count} ocorrências)</span>
                      </div>
                      <span className="font-mono font-bold text-red-800">
                        {item.minutes} min ({Math.round((item.minutes / 60) * 10) / 10}h)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhum evento de parada computado.</p>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                Linhas Extrusoras com Maior Número de Apontamentos Críticos
              </h3>
              <div className="space-y-2">
                {topIssues.topCriticalMachines.slice(0, 3).map((m) => (
                  <div key={m.machineId} className="flex justify-between items-center text-xs bg-white p-2.5 rounded border border-slate-200">
                    <span className="font-bold text-slate-900">
                      Extrusora {m.machineId}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 font-mono font-bold text-[11px]">
                      {m.count} desvios/paradas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Tabela de Ocorrências Críticas, OMs e Setups */}
        {criticalOccurrences.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-red-800" />
              <span>5. Registro de Manutenções, Setups e Desvios Operacionais</span>
            </h2>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                  <tr>
                    <th className="py-2 px-3">Data / Linha</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">OM / Setup / OP</th>
                    <th className="py-2 px-3">Operador / Líder</th>
                    <th className="py-2 px-3">Desvio / Motivo</th>
                    <th className="py-2 px-3">Aprovação Liderança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {criticalOccurrences.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-bold text-red-900">{r.machineId}</span> · {new Date(r.timestamp).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 px-3">
                        <span className="capitalize font-semibold text-slate-800">{r.lineStatus || 'em_producao'}</span>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {r.maintenanceOrderNumber ? `OM: ${r.maintenanceOrderNumber}` : (r.setupMaterial || r.productionOrder || '-')}
                      </td>
                      <td className="py-2 px-3">
                        {r.operatorName} (Líder: {r.shiftLeader})
                      </td>
                      <td className="py-2 px-3 max-w-[280px]">
                        {r.parameterDeviationReason || r.operationalDeviationsNotes || r.stoppageReason || '-'}
                      </td>
                      <td className="py-2 px-3">
                        {r.deviationApprovedByLeader ? (
                          <span className="text-emerald-700 font-semibold">
                            Aprovado por {r.approvingLeaderName || r.shiftLeader}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Evidências Fotográficas */}
        {monthEvidences.length > 0 && (
          <div className="print:break-before-page">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-red-800" />
              <span>6. Evidências Fotográficas do Mês</span>
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {monthEvidences.map((photo) => (
                <div key={photo.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <img src={photo.dataUrl} alt={photo.caption} className="w-full h-32 object-cover" />
                  <div className="p-2 text-[10px]">
                    <span className="font-bold text-slate-800 block truncate">{photo.caption}</span>
                    <span className="text-slate-500 block font-mono">Linha {photo.machineId} · {photo.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bloco de Assinaturas Formais */}
        <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs text-slate-600 print:pt-12">
          <div className="space-y-2">
            <div className="border-b border-slate-400 w-3/4 mx-auto pb-6"></div>
            <p className="font-bold text-slate-800">Líder do Turno</p>
            <p className="text-[10px] text-slate-500">Supervisão Operacional</p>
          </div>

          <div className="space-y-2">
            <div className="border-b border-slate-400 w-3/4 mx-auto pb-6"></div>
            <p className="font-bold text-slate-800">Engenharia de Processos</p>
            <p className="text-[10px] text-slate-500">Validação Técnica e Ficha</p>
          </div>

          <div className="space-y-2">
            <div className="border-b border-slate-400 w-3/4 mx-auto pb-6"></div>
            <p className="font-bold text-slate-800">Gerência de Produção</p>
            <p className="text-[10px] text-slate-500">Aprovação Final da Gestão</p>
          </div>
        </div>

      </div>
    </>
  )}
</div>
  );
};

