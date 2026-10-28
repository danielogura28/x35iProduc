import React, { useState, useMemo } from 'react';
import { 
  ProductionRecord, 
  FactoryMonthlyGoals, 
  MACHINE_LIST, 
  LINE_STATUS_CONFIG,
  MachineId 
} from '../types/production';
import { 
  BarChart3, 
  TrendingUp, 
  Gauge, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Sliders, 
  Calendar, 
  FileSpreadsheet, 
  Award, 
  Flame, 
  Layers, 
  Clock, 
  Zap, 
  Lock,
  Printer,
  Users,
  ShieldAlert,
  ChevronDown,
  Download
} from 'lucide-react';
import { 
  exportMonthlyReportToExcel, 
  exportDailyReportToExcel,
  exportPowerBIVisualExcel 
} from '../utils/excelExport';

interface PowerBIDashboardProps {
  records: ProductionRecord[];
  factoryGoals: FactoryMonthlyGoals;
  onRequestPinAuth?: (action: () => void) => void;
}

export const PowerBIDashboard: React.FC<PowerBIDashboardProps> = ({
  records,
  factoryGoals,
  onRequestPinAuth
}) => {
  const [periodType, setPeriodType] = useState<'day' | 'month'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    if (records.length > 0) {
      const sorted = [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return sorted[0].timestamp.slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('ALL');

  // Filtragem dos registros
  const filteredRecords = useMemo(() => {
    let result = records;
    if (periodType === 'day') {
      result = result.filter(r => r.timestamp.startsWith(selectedDay));
    } else {
      result = result.filter(r => r.timestamp.startsWith(selectedMonth));
    }
    if (selectedMachineFilter !== 'ALL') {
      result = result.filter(r => r.machineId === selectedMachineFilter);
    }
    return result;
  }, [records, periodType, selectedDay, selectedMonth, selectedMachineFilter]);

  // 1. TOP 4 CARDS ESCUROS COM GLOW (Screenshot 4)
  const kpis = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const prodRecords = filteredRecords.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
    const running = prodRecords.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);

    const avgProductivity = running.length > 0
      ? Math.round(running.reduce((a, b) => a + (b.productivityKgh || 0), 0) / running.length)
      : 0;

    const totalKg = running.reduce((a, b) => a + ((b.productivityKgh || 0) * 4), 0);
    const totalTons = Math.round((totalKg / 1000) * 10) / 10;

    const conformingSheets = prodRecords.filter(r => r.temperaturesConforming && r.parametersMatchPreviousSheet).length;
    const sheetCompliance = prodRecords.length > 0 ? Math.round((conformingSheets / prodRecords.length) * 100) : 100;

    const conformingPackaging = prodRecords.filter(r => r.labelCodesConforming && r.sealingQuality === 'conforme').length;
    const packagingCompliance = prodRecords.length > 0 ? Math.round((conformingPackaging / prodRecords.length) * 100) : 100;

    const totalStoppages = filteredRecords.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);
    const totalOMs = filteredRecords.filter(r => r.lineStatus === 'manutencao' || r.hasMaintenanceOrder).length;
    const totalSetups = filteredRecords.filter(r => r.lineStatus === 'setup').length;

    const productivityDelta = avgProductivity - factoryGoals.targetAverageProductivityKgh;
    const productivityAttainment = factoryGoals.targetAverageProductivityKgh > 0
      ? Math.round((avgProductivity / factoryGoals.targetAverageProductivityKgh) * 100)
      : 100;

    return {
      totalRecords,
      avgProductivity,
      productivityDelta,
      productivityAttainment,
      totalKg,
      totalTons,
      sheetCompliance,
      packagingCompliance,
      totalStoppages,
      totalOMs,
      totalSetups
    };
  }, [filteredRecords, factoryGoals]);

  // 2. PRODUTIVIDADE MÉDIA POR EXTRUSORA (Screenshot 1 - Card Esquerdo)
  const extruderProductivityList = useMemo(() => {
    return MACHINE_LIST.map(mId => {
      const recs = filteredRecords.filter(r => r.machineId === mId);
      const prod = recs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
      const running = prod.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);
      const avgKgh = running.length > 0 ? Math.round(running.reduce((a, b) => a + (b.productivityKgh || 0), 0) / running.length) : 0;
      const targetKgh = running[0]?.targetProductivityKgh || factoryGoals.targetAverageProductivityKgh;
      const attainment = targetKgh > 0 ? Math.round((avgKgh / targetKgh) * 100) : 0;
      
      const maxScale = 520;
      const realWidthPct = Math.min(100, Math.round((avgKgh / maxScale) * 100));
      const targetTickPct = Math.min(100, Math.round((targetKgh / maxScale) * 100));

      return {
        mId,
        apontamentosCount: recs.length,
        avgKgh,
        targetKgh,
        attainment,
        realWidthPct,
        targetTickPct
      };
    });
  }, [filteredRecords, factoryGoals]);

  // 3. DESEMPENHO E EFICIÊNCIA POR OPERADOR (Screenshot 1 - Card Direito)
  const operatorRanking = useMemo(() => {
    const opMap = new Map<string, {
      totalKgh: number;
      prodCount: number;
      totalRecords: number;
      conformingCount: number;
      stoppageMinutes: number;
      stoppagesCount: number;
    }>();

    for (const r of filteredRecords) {
      const name = r.operatorName || 'Operador Não Identificado';
      const existing = opMap.get(name) || {
        totalKgh: 0,
        prodCount: 0,
        totalRecords: 0,
        conformingCount: 0,
        stoppageMinutes: 0,
        stoppagesCount: 0
      };

      existing.totalRecords += 1;
      if (r.lineStatus === 'em_producao') {
        existing.prodCount += 1;
        if (!r.hasStoppage && (r.productivityKgh || 0) > 0) {
          existing.totalKgh += r.productivityKgh || 0;
        }
        if (r.temperaturesConforming && r.parametersMatchPreviousSheet) {
          existing.conformingCount += 1;
        }
      }

      if (r.hasStoppage) {
        existing.stoppagesCount += r.stoppageQuantity || 1;
        existing.stoppageMinutes += r.stoppageMinutes || 60;
      }

      opMap.set(name, existing);
    }

    const list = Array.from(opMap.entries()).map(([name, data]) => {
      const avgKgh = data.prodCount > 0 ? Math.round(data.totalKgh / data.prodCount) : 0;
      const confRate = data.prodCount > 0 ? Math.round((data.conformingCount / data.prodCount) * 100) : 100;
      const maxScale = 520;
      const widthPct = Math.min(100, Math.round((avgKgh / maxScale) * 100));

      return {
        name,
        avgKgh,
        confRate,
        recordsCount: data.totalRecords,
        stoppagesCount: data.stoppagesCount,
        stoppageMinutes: data.stoppageMinutes,
        widthPct
      };
    });

    return list.sort((a, b) => b.avgKgh - a.avgKgh);
  }, [filteredRecords]);

  // 4. PARETO DE PARADAS E INTERVENÇÕES (MINUTOS PERDIDOS) (Screenshot 2 - Card Esquerdo)
  const stoppageInterventions = useMemo(() => {
    let manutencaoMins = 0;
    let manutencaoEvents = 0;
    let preventivaMins = 0;
    let preventivaEvents = 0;
    let setupMins = 0;
    let setupEvents = 0;
    let outroMins = 0;
    let outroEvents = 0;

    for (const r of filteredRecords) {
      if (r.lineStatus === 'manutencao' || r.hasMaintenanceOrder) {
        manutencaoEvents += 1;
        manutencaoMins += r.stoppageMinutes || 240;
      } else if (r.lineStatus === 'preventiva') {
        preventivaEvents += 1;
        preventivaMins += r.stoppageMinutes || 180;
      } else if (r.lineStatus === 'setup') {
        setupEvents += 1;
        setupMins += r.stoppageMinutes || 90;
      } else if (r.hasStoppage) {
        outroEvents += r.stoppageQuantity || 1;
        outroMins += r.stoppageMinutes || 45;
      }
    }

    const maxMins = Math.max(1, manutencaoMins, preventivaMins, setupMins, outroMins);

    return [
      {
        label: 'Manutenção Corretiva (OM)',
        events: manutencaoEvents,
        mins: manutencaoMins,
        hours: Math.round((manutencaoMins / 60) * 10) / 10,
        barPct: Math.round((manutencaoMins / maxMins) * 100),
        color: 'bg-red-800'
      },
      {
        label: 'Preventiva Programada',
        events: preventivaEvents,
        mins: preventivaMins,
        hours: Math.round((preventivaMins / 60) * 10) / 10,
        barPct: Math.round((preventivaMins / maxMins) * 100),
        color: 'bg-red-800'
      },
      {
        label: 'Setup / Troca de Material',
        events: setupEvents,
        mins: setupMins,
        hours: Math.round((setupMins / 60) * 10) / 10,
        barPct: Math.round((setupMins / maxMins) * 100),
        color: 'bg-red-800'
      },
      {
        label: 'Outro',
        events: outroEvents,
        mins: outroMins,
        hours: Math.round((outroMins / 60) * 10) / 10,
        barPct: outroMins > 0 ? Math.round((outroMins / maxMins) * 100) : 0,
        color: 'bg-slate-300'
      }
    ];
  }, [filteredRecords]);

  // 5. OCORRÊNCIAS DE PROCESSO & INSPEÇÃO OPERACIONAL (Screenshot 2 - Card Direito)
  const processOccurrences = useMemo(() => {
    let thermalDeviations = 0;
    let paramChanges = 0;
    let sieveIssues = 0;
    let magnetIssues = 0;
    let sealingIssues = 0;
    let labelIssues = 0;

    for (const r of filteredRecords) {
      if (r.temperaturesConforming === false) thermalDeviations += 1;
      if (r.parametersMatchPreviousSheet === false) paramChanges += 1;
      if (r.sievePowderCondition && r.sievePowderCondition !== 'normal') sieveIssues += 1;
      if (r.magnetStatus && r.magnetStatus !== 'limpo') magnetIssues += 1;
      if (r.sealerTempConforming === false || (r.sealingQuality && r.sealingQuality !== 'conforme')) sealingIssues += 1;
      if (r.labelCodesConforming === false) labelIssues += 1;
    }

    const maxCount = Math.max(1, thermalDeviations, paramChanges, sieveIssues, magnetIssues, sealingIssues, labelIssues);

    return [
      { label: 'Desvio Térmico (Zonas)', count: thermalDeviations, color: 'bg-red-800', barPct: Math.round((thermalDeviations / maxCount) * 100) },
      { label: 'Mudança Parâmetros vs Ficha', count: paramChanges, color: 'bg-amber-600', barPct: Math.round((paramChanges / maxCount) * 100) },
      { label: 'Peneira / Excesso de Pó', count: sieveIssues, color: 'bg-slate-800', barPct: Math.round((sieveIssues / maxCount) * 100) },
      { label: 'Ímã (Contaminação / Limpeza)', count: magnetIssues, color: 'bg-slate-800', barPct: Math.round((magnetIssues / maxCount) * 100) },
      { label: 'Falha Selagem / Temp Seladora', count: sealingIssues, color: 'bg-red-700', barPct: Math.round((sealingIssues / maxCount) * 100) },
      { label: 'Divergência Código Etiqueta', count: labelIssues, color: 'bg-red-900', barPct: Math.round((labelIssues / maxCount) * 100) },
    ];
  }, [filteredRecords]);

  // 6. MATRIZ OPERACIONAL DAS 6 EXTRUSORAS (Screenshot 3 & 5)
  const fleetData = useMemo(() => {
    return MACHINE_LIST.map(mId => {
      const recs = filteredRecords.filter(r => r.machineId === mId);
      const prod = recs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
      const running = prod.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);
      const avgKgh = running.length > 0 ? Math.round(running.reduce((a, b) => a + (b.productivityKgh || 0), 0) / running.length) : 0;
      const targetKgh = running[0]?.targetProductivityKgh || factoryGoals.targetAverageProductivityKgh;
      const attainment = targetKgh > 0 ? Math.round((avgKgh / targetKgh) * 100) : 0;
      const latest = recs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      const status = latest?.lineStatus || (recs.length > 0 ? 'em_producao' : 'inativa');
      const stops = recs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);

      const maxScale = 520;
      const realWidthPct = Math.min(100, Math.round((avgKgh / maxScale) * 100));
      const targetTickPct = Math.min(100, Math.round((targetKgh / maxScale) * 100));

      return {
        mId,
        recsCount: recs.length,
        avgKgh,
        targetKgh,
        attainment,
        status,
        stops,
        latest,
        realWidthPct,
        targetTickPct
      };
    });
  }, [filteredRecords, factoryGoals]);

  // 7. VOLUME & VAZÃO POR TURNO (Screenshot 5 - Card Direito)
  const shiftPerformance = useMemo(() => {
    const shifts = [
      { id: 'T1', name: 'Turno 1 (06h - 14h)', shortName: 'Turno 1 (Manhã)', color: 'bg-amber-500' },
      { id: 'T2', name: 'Turno 2 (14h - 22h)', shortName: 'Turno 2 (Tarde)', color: 'bg-blue-600' },
      { id: 'T3', name: 'Turno 3 (22h - 06h)', shortName: 'Turno 3 (Noite)', color: 'bg-slate-400' }
    ];

    const totalKgGlobal = kpis.totalKg || 1;

    return shifts.map(s => {
      const recs = filteredRecords.filter(r => r.shift === s.name);
      const prod = recs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
      const running = prod.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);
      const avgKgh = running.length > 0
        ? Math.round(running.reduce((a, b) => a + (b.productivityKgh || 0), 0) / running.length)
        : 0;
      const kg = running.reduce((a, b) => a + ((b.productivityKgh || 0) * 4), 0);
      const sharePct = Math.round((kg / totalKgGlobal) * 100);
      const stops = recs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);

      return {
        ...s,
        recordsCount: recs.length,
        avgKgh,
        kg,
        sharePct,
        stops
      };
    });
  }, [filteredRecords, kpis.totalKg]);

  // 8. PARETO: PRINCIPAIS OFENSORES (Screenshot 5 - Card Inferior)
  const paretoReasons = useMemo(() => {
    const countMap: Record<string, number> = {};
    for (const r of filteredRecords) {
      if (r.hasStoppage) {
        if (r.stoppageReasonsList && r.stoppageReasonsList.length > 0) {
          for (const reason of r.stoppageReasonsList) {
            countMap[reason] = (countMap[reason] || 0) + 1;
          }
        } else if (r.stoppageReason) {
          countMap[r.stoppageReason] = (countMap[r.stoppageReason] || 0) + 1;
        } else {
          countMap['Ajuste de Processo'] = (countMap['Ajuste de Processo'] || 0) + 1;
        }
      }
    }

    const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
    const totalEvents = sorted.reduce((a, b) => a + b[1], 0) || 1;

    let cumulative = 0;
    return sorted.map(([reason, count]) => {
      cumulative += count;
      const pct = Math.round((count / totalEvents) * 100);
      const cumPct = Math.round((cumulative / totalEvents) * 100);
      return {
        reason,
        count,
        pct,
        cumPct
      };
    });
  }, [filteredRecords]);

  // Handlers de Exportação
  const handleExportVisualExcel = () => {
    const doExport = () => {
      const periodLabel = periodType === 'day' ? selectedDay : selectedMonth;
      exportPowerBIVisualExcel(records, periodLabel, factoryGoals, periodType === 'day');
    };

    if (onRequestPinAuth) {
      onRequestPinAuth(doExport);
    } else {
      doExport();
    }
  };

  const handleExportStructuredXLSX = () => {
    const doExport = () => {
      if (periodType === 'day') {
        exportDailyReportToExcel(records, selectedDay, factoryGoals);
      } else {
        exportMonthlyReportToExcel(records, selectedMonth, factoryGoals);
      }
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

  return (
    <div className="space-y-6 pb-12">
      {/* Power BI Executive Ribbon & Slicers Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black uppercase tracking-widest font-mono flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                POWER BI EXECUTIVE
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs text-slate-300 font-medium">PetroPol Polímeros Industrial</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white mt-1.5">
              ExtruControl BI · Dashboard Executivo de Performance
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Visão consolidada idêntica aos painéis de gestão: vazão real vs meta, operadores, paradas e ocorrências.
            </p>
          </div>

          {/* Action Buttons & Slicers */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-900/90 p-2 rounded-xl border border-slate-700/80 backdrop-blur-xs">
            {/* Slicer: Diário vs Mensal */}
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPeriodType('day')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  periodType === 'day' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Diário
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('month')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  periodType === 'month' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensal
              </button>
            </div>

            {/* Date / Month Picker */}
            {periodType === 'day' ? (
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono font-semibold focus:outline-hidden focus:border-red-500"
              />
            ) : (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono font-semibold focus:outline-hidden focus:border-red-500"
              />
            )}

            {/* Machine Filter */}
            <select
              value={selectedMachineFilter}
              onChange={(e) => setSelectedMachineFilter(e.target.value)}
              className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono font-semibold focus:outline-hidden"
            >
              <option value="ALL">Todas as Linhas (DR01-06)</option>
              {MACHINE_LIST.map(m => (
                <option key={m} value={m}>Extrusora {m}</option>
              ))}
            </select>

            {/* Main Export Button: Excel Visual Power BI */}
            <button
              onClick={handleExportVisualExcel}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer font-sans"
              title="Baixar planilha Excel com o layout e cards VISUAIS IDÊNTICOS ao Power BI (.xls)"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-900" />
              <span>Exportar Excel Visual Power BI</span>
              <Lock className="w-3 h-3 text-slate-800" />
            </button>

            {/* Structured XLSX Button */}
            <button
              onClick={handleExportStructuredXLSX}
              className="px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Baixar pasta de trabalho com múltiplas abas (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>XLSX Base</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Imprimir / Salvar PDF do Painel"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Slicers Tag Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
          <span className="text-amber-400 font-semibold flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Slicers Ativos:
          </span>
          <span className="bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
            Período: <strong>{periodType === 'day' ? selectedDay : selectedMonth}</strong>
          </span>
          <span className="bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
            Filtro de Linha: <strong>{selectedMachineFilter === 'ALL' ? 'DR01 a DR06 (Frota Completa)' : selectedMachineFilter}</strong>
          </span>
          <span className="bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
            Apontamentos no Período: <strong>{filteredRecords.length}</strong>
          </span>
        </div>
      </div>

      {/* 1. SEÇÃO DOS 4 CARDS ESCUROS DE TOPO (EXATAMENTE COMO NA SCREENSHOT 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: VAZÃO MÉDIA GLOBAL */}
        <div className="bg-[#0b1320] text-white rounded-2xl p-5 border border-slate-800/90 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-slate-200">
                <Gauge className="w-4 h-4 text-red-500" />
                VAZÃO MÉDIA GLOBAL
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                {kpis.productivityAttainment}% da Meta
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white font-mono tabular-nums tracking-tight">
                {kpis.avgProductivity}
              </span>
              <span className="text-xs font-semibold text-slate-400">kg/h</span>
            </div>

            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Meta Planejada: <strong className="text-white font-mono">{factoryGoals.targetAverageProductivityKgh} kg/h</strong></span>
              <span className={`font-mono font-bold ${kpis.productivityDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {kpis.productivityDelta >= 0 ? `▲ +${kpis.productivityDelta}` : `▼ ${kpis.productivityDelta}`} kg/h
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, kpis.productivityAttainment)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: BALANÇO DE MASSA (VOLUME) */}
        <div className="bg-[#0b1320] text-white rounded-2xl p-5 border border-slate-800/90 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-slate-200">
                <Layers className="w-4 h-4 text-amber-500" />
                BALANÇO DE MASSA (VOLUME)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950/80 text-amber-400 border border-amber-800/80">
                Extrusão Líquida
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white font-mono tabular-nums tracking-tight">
                {kpis.totalKg.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-semibold text-slate-400">kg</span>
            </div>

            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Equivalente em Toneladas:</span>
              <span className="font-mono font-bold text-amber-400 text-xs">
                {kpis.totalTons} t
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Ritmo Médio / Turno:</span>
            <span className="font-mono text-white font-semibold">
              {Math.round(kpis.totalKg / 3).toLocaleString('pt-BR')} kg
            </span>
          </div>
        </div>

        {/* Card 3: CONFORMIDADE DE FICHA */}
        <div className="bg-[#0b1320] text-white rounded-2xl p-5 border border-slate-800/90 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-slate-200">
                <Flame className="w-4 h-4 text-emerald-400" />
                CONFORMIDADE DE FICHA
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {kpis.sheetCompliance >= factoryGoals.targetProcessSheetComplianceRate ? 'Conforme' : 'Atenção'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white font-mono tabular-nums tracking-tight">
                {kpis.sheetCompliance}%
              </span>
              <span className="text-xs font-semibold text-slate-400">estabilidade</span>
            </div>

            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Meta de Qualidade: <strong className="text-white font-mono">{factoryGoals.targetProcessSheetComplianceRate}%</strong></span>
              <span className="font-mono text-slate-300">Embalagem: {kpis.packagingCompliance}%</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, kpis.sheetCompliance)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: PARADAS & OCORRÊNCIAS */}
        <div className="bg-[#0b1320] text-white rounded-2xl p-5 border border-slate-800/90 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-28 h-28 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-slate-200">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                PARADAS & OCORRÊNCIAS
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-950/80 text-purple-300 border border-purple-800/80">
                Linha Parada
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black font-mono tabular-nums tracking-tight text-red-500">
                {kpis.totalStoppages}
              </span>
              <span className="text-xs font-semibold text-slate-400">evento(s)</span>
            </div>

            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Ordens Manutenção (OM): <strong className="text-white font-mono">{kpis.totalOMs}</strong></span>
              <span>Setups: <strong className="text-white font-mono">{kpis.totalSetups}</strong></span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Disponibilidade Mecânica:</span>
            <span className="font-mono text-slate-300 font-semibold">Monitorada</span>
          </div>
        </div>
      </div>

      {/* 2. GRID INTERMEDIÁRIO 1 (SCREENSHOT 1) */}
      {/* Esquerda: Produtividade Média por Extrusora | Direita: Desempenho e Eficiência por Operador */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Produtividade Média por Extrusora (kg/h) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Produtividade Média por Extrusora (kg/h)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparativo Real vs Meta da Ficha Técnica
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#8b0000]" />
                Real (kg/h)
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="w-0.5 h-3 bg-slate-400 inline-block" />
                Meta
              </span>
            </div>
          </div>

          {/* Machine rows with thick red bar and target tick */}
          <div className="mt-5 space-y-4">
            {extruderProductivityList.map((m) => (
              <div key={m.mId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono font-bold text-[11px] border border-slate-200">
                      {m.mId}
                    </span>
                    <span className="text-slate-500 text-[11px]">{m.apontamentosCount} apontamentos</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{m.avgKgh} kg/h</span>
                    <span className="text-slate-400 text-[11px] font-mono">(Meta: {m.targetKgh})</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono border ${
                      m.attainment >= 100
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}>
                      {m.attainment}%
                    </span>
                  </div>
                </div>

                {/* Bar with gray tick mark */}
                <div className="w-full bg-slate-100 h-5 rounded-md overflow-hidden relative border border-slate-200/60">
                  {/* Meta Tick Line */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-700 z-10"
                    style={{ left: `${m.targetTickPct}%` }}
                    title={`Meta: ${m.targetKgh} kg/h`}
                  />
                  {/* Solid Red Bar */}
                  <div
                    className="h-full bg-[#8b0000] rounded-l-md transition-all"
                    style={{ width: `${m.realWidthPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Desempenho e Eficiência por Operador */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Desempenho e Eficiência por Operador
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Média de vazão (kg/h) e taxa de conformidade de processo
              </p>
            </div>
            <Users className="w-5 h-5 text-slate-400" />
          </div>

          <div className="mt-5 space-y-4">
            {operatorRanking.map((op, idx) => (
              <div key={op.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#8b0000] text-white flex items-center justify-center font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800">{op.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{op.avgKgh} kg/h</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono border ${
                      op.confRate >= 90
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}>
                      {op.confRate}% Ficha OK
                    </span>
                  </div>
                </div>

                {/* Red bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className="h-full bg-[#8b0000] rounded-full transition-all"
                    style={{ width: `${op.widthPct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{op.recordsCount} apontamentos</span>
                  <span>{op.stoppagesCount === 0 ? 'Zero paradas' : `${op.stoppageMinutes} min paradas`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. GRID INTERMEDIÁRIO 2 (SCREENSHOT 2) */}
      {/* Esquerda: Pareto de Paradas (Minutos Perdidos) | Direita: Ocorrências de Processo & Inspeção */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Pareto de Paradas e Intervenções (Minutos Perdidos) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Pareto de Paradas e Intervenções (Minutos Perdidos)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribuição por motivo, manutenção, setup e tempo acumulado
              </p>
            </div>
            <Clock className="w-5 h-5 text-red-700" />
          </div>

          <div className="mt-5 space-y-4">
            {stoppageInterventions.map((s) => (
              <div key={s.label} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-800">
                    {s.label} <span className="text-slate-400">({s.events} eventos)</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {s.mins} min ({s.hours}h)
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className={`h-full ${s.color} rounded-full transition-all`}
                    style={{ width: `${s.barPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Ocorrências de Processo & Inspeção Operacional */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Ocorrências de Processo & Inspeção Operacional
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contagem de desvios detectados em produção
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>

            <div className="mt-5 space-y-3">
              {processOccurrences.map((o) => (
                <div key={o.label} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-medium">{o.label}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {o.count} {o.count === 1 ? 'registro' : 'registros'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${o.color} rounded-full transition-all`}
                      style={{ width: `${o.barPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Green Operational Recommendation Box (Como na Screenshot 2) */}
          <div className="mt-5 p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Recomendação Operacional:</strong> Priorizar inspeção periódica na gaveta magnética e alinhamento de temperatura nas zonas de descompressão da DR02 e DR03 para mitigar desvios repetitivos.
            </p>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO INFERIOR: MATRIZ OPERACIONAL (DR01-06) + VOLUME TURNO + PARETO (SCREENSHOT 3 & 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Matriz Operacional das 6 Extrusoras */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-red-100 text-red-900">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  MATRIZ OPERACIONAL DAS 6 EXTRUSORAS (DR01 A DR06)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Desempenho de vazão real vs meta, status e paradas
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded border border-slate-200 text-slate-700 shadow-2xs">
              Frota 100% Monitorada
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {fleetData.map((f) => {
              const statusCfg = LINE_STATUS_CONFIG[f.status] || LINE_STATUS_CONFIG.em_producao;
              const isZero = f.avgKgh === 0;

              return (
                <div key={f.mId} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Badge & Name */}
                  <div className="flex items-center gap-3 min-w-[150px]">
                    <div className="w-10 h-10 rounded-lg bg-[#3b0a0a] text-white font-black flex items-center justify-center font-mono text-sm shadow-inner">
                      {f.mId}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Extrusora {f.mId}</h4>
                      <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-semibold border ${statusCfg.badgeColor}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Vazão Real, Meta, Bar with Target Tick, % */}
                  <div className="flex-1 max-w-md space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">Vazão Real: <strong>{f.avgKgh} kg/h</strong></span>
                      <span className="text-slate-400 font-mono text-[11px]">Meta: {f.targetKgh} kg/h</span>
                      <span className={`font-mono font-bold ${
                        f.attainment >= 100 ? 'text-emerald-700' : isZero ? 'text-amber-600' : 'text-amber-700'
                      }`}>
                        {f.attainment}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative border border-slate-200/50">
                      {/* Meta Tick */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                        style={{ left: `${f.targetTickPct}%` }}
                      />
                      {/* Colored bar: green if >= 100%, red if < 100% and > 0, gray if 0 */}
                      <div
                        className={`h-full rounded-full transition-all ${
                          f.attainment >= 100 ? 'bg-emerald-600' : !isZero ? 'bg-red-800' : 'bg-slate-200'
                        }`}
                        style={{ width: `${f.realWidthPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Right: Paradas (red) & Última OP */}
                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <div className="text-right min-w-[60px]">
                      <span className="text-[10px] text-slate-400 block uppercase">PARADAS</span>
                      <span className={`font-mono font-bold ${f.stops > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                        {f.stops}
                      </span>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <span className="text-[10px] text-slate-400 block uppercase">ÚLTIMA OP</span>
                      <span className="font-mono font-semibold text-slate-800 text-[11px]">
                        {f.latest?.productionOrder || 'Sem OP'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 3: Volume por Turno & Pareto Principais Ofensores */}
        <div className="space-y-6">
          {/* Card: VOLUME & VAZÃO POR TURNO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-800" />
              <span>VOLUME & VAZÃO POR TURNO</span>
            </h3>

            <div className="space-y-4">
              {shiftPerformance.map((s) => (
                <div key={s.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{s.shortName}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {s.kg.toLocaleString('pt-BR')} kg ({s.sharePct}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${s.color} rounded-full`}
                      style={{ width: `${s.sharePct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Vazão: <strong>{s.avgKgh} kg/h</strong></span>
                    <span>{s.stops} parada(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: PARETO: PRINCIPAIS OFENSORES */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>PARETO: PRINCIPAIS OFENSORES</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Curva de impacto cumulativo de paradas operacionais
            </p>

            {paretoReasons.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs">
                Nenhuma parada registrada no período.
              </div>
            ) : (
              <div className="space-y-3">
                {paretoReasons.slice(0, 3).map((p, idx) => (
                  <div key={p.reason} className="text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-800">
                        <strong>{idx + 1}º</strong> {p.reason}
                      </span>
                      <span className="font-mono text-slate-600 text-[11px]">
                        {p.count}x ({p.pct}%) • Acum: {p.cumPct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-red-800 h-full rounded-full"
                        style={{ width: `${p.cumPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
