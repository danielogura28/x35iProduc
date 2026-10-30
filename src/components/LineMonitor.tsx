import React, { useState } from 'react';
import { 
  ProductionRecord, 
  MachineId, 
  MACHINE_LIST,
  LINE_STATUS_CONFIG,
  GlobalLineStatuses 
} from '../types/production';
import { 
  PlusCircle, 
  Eye, 
  Clock, 
  Wrench, 
  Sliders, 
  CalendarClock, 
  PowerOff,
  Flame, 
  ShieldAlert, 
  Layers, 
  CheckCircle2,
  AlertTriangle,
  Zap,
  Timer,
  AlertOctagon,
  Activity,
  CheckCircle
} from 'lucide-react';
import { GlobalLineStatusModal } from './GlobalLineStatusModal';
import { 
  analyzeAllLinesDeviations, 
  formatAnalysisDuration, 
  DOCUMENT_FULL_TITLE 
} from '../utils/deviationUtils';

interface LineMonitorProps {
  records: ProductionRecord[];
  globalLineStatuses: GlobalLineStatuses;
  onUpdateGlobalLineStatuses: (statuses: GlobalLineStatuses) => void;
  onSelectMachineForEntry: (machineId: MachineId) => void;
  onFilterHistoryByMachine: (machineId: MachineId) => void;
}

export const LineMonitor: React.FC<LineMonitorProps> = ({
  records,
  globalLineStatuses,
  onUpdateGlobalLineStatuses,
  onSelectMachineForEntry,
  onFilterHistoryByMachine,
}) => {
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState<boolean>(false);
  const getLatestRecordForMachine = (machineId: MachineId): ProductionRecord | undefined => {
    const machineRecords = records.filter(r => r.machineId === machineId);
    if (machineRecords.length === 0) return undefined;
    return machineRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  };

  const machineLatestMap = MACHINE_LIST.map(id => ({
    id,
    record: getLatestRecordForMachine(id)
  }));

  const producingCount = machineLatestMap.filter(m => m.record && m.record.lineStatus === 'em_producao' && !m.record.hasStoppage).length;
  const maintenanceCount = machineLatestMap.filter(m => m.record && (m.record.lineStatus === 'manutencao' || m.record.hasMaintenanceOrder)).length;
  const setupCount = machineLatestMap.filter(m => m.record && m.record.lineStatus === 'setup').length;
  const inactiveOrPrevCount = machineLatestMap.filter(m => m.record && (m.record.lineStatus === 'preventiva' || m.record.lineStatus === 'inativa')).length;

  const totalCurrentOutput = machineLatestMap.reduce((acc, m) => {
    if (m.record && m.record.lineStatus === 'em_producao' && !m.record.hasStoppage) {
      return acc + (m.record.productivityKgh || 0);
    }
    return acc;
  }, 0);

  const lineDeviationReports = analyzeAllLinesDeviations(records);
  const linesWithDeviations = lineDeviationReports.filter(r => r.hasDeviation);
  const criticalDeviationsCount = lineDeviationReports.filter(r => r.severity === 'critica').length;
  const highDeviationsCount = lineDeviationReports.filter(r => r.severity === 'alta').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Status Operacional das 6 Extrusoras (DR01 - DR06)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visão em tempo real das linhas: Produção, Manutenção, Setup, Preventiva ou Inativa
            </p>
            <div className="mt-1 text-[11px] font-mono text-slate-400">
              Documento: <strong className="text-slate-600">{DOCUMENT_FULL_TITLE}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <span className="text-emerald-800 block text-[11px] font-medium">Em Produção</span>
              <span className="text-base font-bold text-emerald-900 font-mono tabular-nums">
                {producingCount} <span className="text-xs font-normal text-slate-500">linhas</span>
              </span>
            </div>

            <div className="px-3 py-2 bg-red-50/70 border border-red-200 rounded-lg">
              <span className="text-red-800 block text-[11px] font-medium">Manutenção</span>
              <span className="text-base font-bold text-red-900 font-mono tabular-nums">
                {maintenanceCount} <span className="text-xs font-normal text-slate-500">linhas</span>
              </span>
            </div>

            <div className="px-3 py-2 bg-amber-50/70 border border-amber-200 rounded-lg">
              <span className="text-amber-800 block text-[11px] font-medium">Em Setup</span>
              <span className="text-base font-bold text-amber-900 font-mono tabular-nums">
                {setupCount} <span className="text-xs font-normal text-slate-500">linhas</span>
              </span>
            </div>

            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-600 block text-[11px] font-medium">Vazão Total</span>
              <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                {totalCurrentOutput} <span className="text-xs font-normal text-slate-500">kg/h</span>
              </span>
            </div>
          </div>
        </div>

        {/* Global Line Status Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span className="p-1 rounded bg-amber-100 text-amber-800">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <span>
              <strong>Definição Global de Linhas:</strong> Configure os status das 6 extrusoras para preenchimento rápido no turno.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsGlobalModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-red-900 hover:bg-red-800 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01]"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Definir Status Global das Linhas</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE GESTÃO DE DESVIOS & FALHAS DE PROCESSO (Destaque para Ajuste Operacional) */}
      <div className={`rounded-xl border p-5 shadow-sm transition-all ${
        linesWithDeviations.length > 0 
          ? 'bg-gradient-to-br from-red-50/90 via-amber-50/50 to-white border-red-300 ring-1 ring-red-200' 
          : 'bg-emerald-50/60 border-emerald-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              linesWithDeviations.length > 0 ? 'bg-red-700 text-white animate-pulse' : 'bg-emerald-600 text-white'
            }`}>
              {linesWithDeviations.length > 0 ? <AlertOctagon className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Gestão Ativa de Falhas de Processo & Desvios Operacionais</span>
                {linesWithDeviations.length > 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-mono font-bold">
                    {linesWithDeviations.length} {linesWithDeviations.length === 1 ? 'Linha com Desvio' : 'Linhas com Desvios'}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                    100% Conforme
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-600">
                Identificação imediata de anomalias (temperaturas, dosagem, ímãs, peneira, balança, selagem, fichas) para ajuste da liderança de processo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {criticalDeviationsCount > 0 && (
              <span className="px-2.5 py-1 bg-red-100 border border-red-300 text-red-900 font-semibold rounded-md flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                {criticalDeviationsCount} Crítica(s)
              </span>
            )}
            {highDeviationsCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 font-semibold rounded-md flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                {highDeviationsCount} Alta(s)
              </span>
            )}
          </div>
        </div>

        {linesWithDeviations.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {linesWithDeviations.map((report) => (
              <div 
                key={report.machineId}
                className="bg-white rounded-lg border border-red-200 p-3.5 shadow-xs hover:border-red-400 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded bg-red-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {report.machineId}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Extrusora {report.machineId}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {report.latestRecord ? `OP: ${report.latestRecord.productionOrder || 'S/N'}` : 'Sem apontamento'}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${
                      report.severity === 'critica'
                        ? 'bg-red-600 text-white border-red-700'
                        : report.severity === 'alta'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                    }`}>
                      {report.severity}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      Desvios Identificados ({report.deviations.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {report.deviations.map((dev, idx) => (
                        <div 
                          key={idx}
                          title={dev.description}
                          className="text-[11px] px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-900 font-medium flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                          <span className="truncate max-w-[170px]">{dev.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {report.lastAnalysisDurationSeconds !== undefined && report.lastAnalysisDurationSeconds > 0 && (
                    <div className="text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded flex items-center justify-between text-slate-600 font-mono mb-2">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Timer className="w-3 h-3 text-slate-600" />
                        Tempo da Análise:
                      </span>
                      <strong className="text-slate-900 font-bold">
                        {formatAnalysisDuration(report.lastAnalysisDurationSeconds)}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onSelectMachineForEntry(report.machineId)}
                    className="flex-1 py-1.5 px-2 text-xs font-semibold text-white bg-red-800 hover:bg-red-900 rounded transition-colors text-center cursor-pointer"
                  >
                    Auditar / Ajustar
                  </button>
                  <button
                    onClick={() => onFilterHistoryByMachine(report.machineId)}
                    className="py-1.5 px-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                  >
                    Histórico
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 py-4 text-center text-xs text-emerald-800 font-medium bg-white/70 rounded-lg border border-emerald-100">
            Nenhum desvio ou falha de processo ativo no momento. Todas as linhas auditadas estão em conformidade com o procedimento {DOCUMENT_FULL_TITLE}.
          </div>
        )}
      </div>

      {/* Grid of the 6 Machines */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {MACHINE_LIST.map((machineId) => {
          const latest = getLatestRecordForMachine(machineId);
          const lineReport = lineDeviationReports.find(r => r.machineId === machineId);

          let statusTheme = {
            border: lineReport?.hasDeviation ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200',
            badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
            label: 'Sem apontamento',
            icon: <Clock className="w-3.5 h-3.5" />
          };

          if (latest) {
            const status = latest.lineStatus || 'em_producao';
            if (status === 'em_producao') {
              if (latest.hasStoppage) {
                statusTheme = {
                  border: 'border-amber-300 ring-1 ring-amber-100',
                  badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
                  label: `Produção (Parada: ${latest.stoppageReason || 'Ajuste'})`,
                  icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                };
              } else {
                statusTheme = {
                  border: 'border-emerald-200 ring-1 ring-emerald-50',
                  badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                  label: 'Em Produção',
                  icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                };
              }
            } else if (status === 'manutencao') {
              statusTheme = {
                border: 'border-red-300 ring-1 ring-red-100',
                badgeBg: 'bg-red-100 text-red-900 border-red-300',
                label: `Em Manutenção (OM ${latest.maintenanceOrderNumber || ''})`,
                icon: <Wrench className="w-3.5 h-3.5 text-red-700" />
              };
            } else if (status === 'setup') {
              statusTheme = {
                border: 'border-amber-300 ring-1 ring-amber-100',
                badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
                label: 'Em Setup',
                icon: <Sliders className="w-3.5 h-3.5 text-amber-700" />
              };
            } else if (status === 'preventiva') {
              statusTheme = {
                border: 'border-blue-200 ring-1 ring-blue-50',
                badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
                label: 'Em Preventiva',
                icon: <CalendarClock className="w-3.5 h-3.5 text-blue-700" />
              };
            } else if (status === 'inativa') {
              statusTheme = {
                border: 'border-slate-300',
                badgeBg: 'bg-slate-200 text-slate-800 border-slate-300',
                label: 'Inativa / Parada',
                icon: <PowerOff className="w-3.5 h-3.5 text-slate-600" />
              };
            }
          }

          const timeAgoString = latest 
            ? new Date(latest.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '--:--';

          const dateString = latest 
            ? new Date(latest.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            : '--/--';

          const efficiencyPercent = latest && (latest.targetProductivityKgh || 0) > 0
            ? Math.round(((latest.productivityKgh || 0) / latest.targetProductivityKgh!) * 100)
            : 0;

          return (
            <div 
              key={machineId}
              className={`bg-white rounded-xl border ${statusTheme.border} shadow-xs p-5 transition-all hover:shadow-md flex flex-col justify-between`}
            >
              <div>
                {/* Header of Machine Card */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-red-900 text-white font-extrabold flex items-center justify-center text-lg tracking-wider font-mono shadow-inner">
                      {machineId}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Extrusora {machineId}
                      </h3>
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">
                        {latest ? (
                          latest.lineStatus === 'setup' 
                            ? `Setup: ${latest.setupMaterial || 'Preparação'}` 
                            : latest.lineStatus === 'manutencao'
                            ? `OM: ${latest.maintenanceOrderNumber || 'Em reparo'}`
                            : latest.lineStatus === 'preventiva'
                            ? 'Rotina Preventiva'
                            : latest.lineStatus === 'inativa'
                            ? 'Sem Programação'
                            : (latest.productName || 'Composto Polimérico')
                        ) : 'Aguardando apontamento'}
                      </p>
                    </div>
                  </div>

                  <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5 ${statusTheme.badgeBg}`}>
                    {statusTheme.icon}
                    <span className="truncate max-w-[130px]">{statusTheme.label}</span>
                  </div>
                </div>

                {/* Global Status Preset Badge */}
                {globalLineStatuses?.[machineId] && (
                  <div className="mt-2.5 flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-600" />
                      Status Global:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {LINE_STATUS_CONFIG[globalLineStatuses[machineId].status]?.label || 'Em Produção'}
                    </span>
                  </div>
                )}

                {/* Card Deviation Alert Strip */}
                {lineReport && lineReport.hasDeviation && (
                  <div className="mt-2.5 p-2 rounded-lg bg-red-50/90 border border-red-300 shadow-xs">
                    <div className="flex items-center justify-between text-red-900 font-bold text-[11px] mb-1">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 animate-pulse" />
                        DESVIO DE PROCESSO ({lineReport.deviations.length})
                      </span>
                      <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-red-200 text-red-950 font-mono font-bold">
                        {lineReport.severity}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {lineReport.deviations.map((d, i) => (
                        <span 
                          key={i} 
                          title={d.description}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-red-200 text-red-800 font-medium truncate max-w-[140px]"
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}


                {/* Content according to Line Status */}
                {latest ? (
                  <div className="mt-4 space-y-3">
                    {/* When In Production: show telemetry, quality checks */}
                    {latest.lineStatus === 'em_producao' ? (
                      <>
                        <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">Vazão (kg/h)</span>
                            <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                              {latest.productivityKgh || 0}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Meta: {latest.targetProductivityKgh || 0}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">RPM Rosca</span>
                            <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                              {latest.rpm || 0}
                            </span>
                            <span className="text-[10px] text-slate-400 block">giros/min</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">Corrente (A)</span>
                            <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                              {latest.motorAmperes || 0}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Amperes</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div>
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span>Atingimento da Meta</span>
                            <span className="font-mono font-semibold tabular-nums">{efficiencyPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                efficiencyPercent >= 100 
                                  ? 'bg-emerald-600' 
                                  : efficiencyPercent >= 85 
                                  ? 'bg-red-600' 
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(efficiencyPercent, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Checklist */}
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                            <Flame className={`w-3.5 h-3.5 ${latest.temperaturesConforming ? 'text-emerald-600' : 'text-red-600'}`} />
                            <span className="truncate">
                              Temp: {latest.temperaturesConforming ? 'Conforme' : 'Desvio'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                            <ShieldAlert className={`w-3.5 h-3.5 ${latest.magnetStatus === 'limpo' ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <span className="truncate">
                              Ímã: {latest.magnetStatus === 'limpo' ? 'Limpo' : 'Atenção'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                            <Layers className={`w-3.5 h-3.5 ${latest.sievePowderCondition === 'normal' ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <span className="truncate">
                              Peneira: {latest.sievePowderCondition === 'normal' ? 'OK' : 'Pó'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${latest.sealerTempConforming ? 'text-emerald-600' : 'text-red-600'}`} />
                            <span className="truncate">
                              Selagem: {latest.sealingQuality === 'conforme' ? 'OK' : 'Falha'}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-slate-100">
                          <div>
                            <span className="font-medium text-slate-700">OP: {latest.productionOrder}</span>
                            <span className="text-slate-400 ml-1">({latest.batchNumber})</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                            {latest.analysisDurationSeconds !== undefined && latest.analysisDurationSeconds > 0 && (
                              <span className="text-slate-700 font-mono font-medium flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                <Timer className="w-3 h-3 text-slate-600" />
                                {formatAnalysisDuration(latest.analysisDurationSeconds)}
                              </span>
                            )}
                            <span>{dateString} às {timeAgoString}</span>
                          </div>
                        </div>
                      </>
                    ) : latest.lineStatus === 'manutencao' ? (
                      /* When in Maintenance */
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-red-900 font-bold uppercase flex items-center gap-1.5">
                            <Wrench className="w-4 h-4 text-red-600" />
                            Ordem de Manutenção
                          </span>
                          <span className="font-mono font-bold text-sm text-red-900 bg-white px-2 py-0.5 rounded border border-red-300">
                            {latest.maintenanceOrderNumber}
                          </span>
                        </div>
                        <p className="text-red-800 text-[11px]">
                          {latest.operationalDeviationsNotes || 'Intervenção técnica corretiva em andamento pela equipe de manutenção.'}
                        </p>
                        <div className="text-[11px] text-red-700 pt-1 border-t border-red-200 flex justify-between">
                          <span>Registrado por: <strong>{latest.operatorName}</strong></span>
                          <span>{timeAgoString}</span>
                        </div>
                      </div>
                    ) : latest.lineStatus === 'setup' ? (
                      /* When in Setup */
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-950 font-bold uppercase flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-amber-700" />
                            Troca / Preparação
                          </span>
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Setup Ativo
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded border border-amber-200 font-medium text-slate-800 text-[11px]">
                          <strong>Material:</strong> {latest.setupMaterial || 'Composto em transição'}
                        </div>
                        {latest.productionOrder && (
                          <span className="text-[10px] text-slate-500 block font-mono">
                            Próxima OP: {latest.productionOrder}
                          </span>
                        )}
                        <div className="text-[11px] text-amber-800 pt-1 border-t border-amber-200 flex justify-between">
                          <span>Operador: <strong>{latest.operatorName}</strong></span>
                          <span>{timeAgoString}</span>
                        </div>
                      </div>
                    ) : (
                      /* When Preventative or Inactive */
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center space-y-1.5 text-xs text-slate-600">
                        <span className="font-bold text-slate-800 block">
                          {latest.lineStatus === 'preventiva' ? 'Manutenção Preventiva Programada' : 'Linha Desligada / Inativa'}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {latest.operationalDeviationsNotes || 'Sem consumo de resina nem geração de refugo.'}
                        </p>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 flex justify-between">
                          <span>Responsável: {latest.operatorName}</span>
                          <span>{timeAgoString}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Nenhum apontamento registrado para a {machineId}.
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => onSelectMachineForEntry(machineId)}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Novo Apontamento</span>
                </button>

                <button
                  onClick={() => onFilterHistoryByMachine(machineId)}
                  title="Ver histórico desta linha"
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Histórico</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé Padronizado PE_RG_034 */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 font-mono">
        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {DOCUMENT_FULL_TITLE}
        </span>
        <span className="text-slate-400">PetroPol Polímeros • Controle e Auditoria de Processo</span>
        <span className="text-slate-400">Tempo de Análise Contabilizado Automaticamente</span>
      </div>

      {/* Global Line Status Modal */}
      <GlobalLineStatusModal
        isOpen={isGlobalModalOpen}
        onClose={() => setIsGlobalModalOpen(false)}
        currentStatuses={globalLineStatuses}
        onStatusesUpdated={onUpdateGlobalLineStatuses}
      />
    </div>
  );
};

