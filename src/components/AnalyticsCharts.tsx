import React, { useState, useMemo } from 'react';
import { ProductionRecord, MACHINE_LIST } from '../types/production';
import { BarChart3, Users, AlertOctagon, CheckCircle2, Clock } from 'lucide-react';

interface AnalyticsChartsProps {
  records: ProductionRecord[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ records }) => {
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('ALL');

  const filteredRecords = useMemo(() => {
    if (selectedMachineFilter === 'ALL') return records;
    return records.filter(r => r.machineId === selectedMachineFilter);
  }, [records, selectedMachineFilter]);

  const machineProductivityData = useMemo(() => {
    return MACHINE_LIST.map((m) => {
      const recs = records.filter(r => r.machineId === m && (r.lineStatus || 'em_producao') === 'em_producao' && !r.hasStoppage);
      const avg = recs.length > 0 
        ? Math.round(recs.reduce((acc, r) => acc + (r.productivityKgh || 0), 0) / recs.length)
        : 0;
      const targetAvg = recs.length > 0 
        ? Math.round(recs.reduce((acc, r) => acc + (r.targetProductivityKgh || 440), 0) / recs.length)
        : 440;
      const totalChecks = records.filter(r => r.machineId === m).length;
      return {
        machineId: m,
        avgProductivity: avg,
        targetProductivity: targetAvg,
        totalChecks,
      };
    });
  }, [records]);

  const operatorPerformanceData = useMemo(() => {
    const map: Record<string, { totalProd: number; count: number; conformingCount: number; stoppagesCount: number; totalStopMinutes: number }> = {};
    
    records.forEach(r => {
      if (!map[r.operatorName]) {
        map[r.operatorName] = { totalProd: 0, count: 0, conformingCount: 0, stoppagesCount: 0, totalStopMinutes: 0 };
      }
      map[r.operatorName].count += 1;
      const status = r.lineStatus || 'em_producao';
      if (status === 'em_producao' && !r.hasStoppage) {
        map[r.operatorName].totalProd += (r.productivityKgh || 0);
      }
      if (status === 'em_producao' && r.temperaturesConforming && r.parametersMatchPreviousSheet) {
        map[r.operatorName].conformingCount += 1;
      }
      if (r.hasStoppage || status !== 'em_producao') {
        map[r.operatorName].stoppagesCount += 1;
        map[r.operatorName].totalStopMinutes += r.stoppageMinutes || (status !== 'em_producao' ? 60 : 0);
      }
    });

    return Object.entries(map).map(([name, data]) => {
      const activeCount = data.count - data.stoppagesCount;
      const avgProd = activeCount > 0 ? Math.round(data.totalProd / activeCount) : 0;
      const complianceRate = data.count > 0 ? Math.round((data.conformingCount / data.count) * 100) : 100;
      return {
        name,
        avgProd,
        complianceRate,
        checksCount: data.count,
        stopMinutes: data.totalStopMinutes
      };
    }).sort((a, b) => b.avgProd - a.avgProd);
  }, [records]);

  const stoppageReasonsData = useMemo(() => {
    const map: Record<string, { minutes: number; count: number }> = {};
    records.forEach(r => {
      const status = r.lineStatus || 'em_producao';
      if (status === 'manutencao') {
        const reason = 'Manutenção Corretiva (OM)';
        if (!map[reason]) map[reason] = { minutes: 0, count: 0 };
        map[reason].minutes += r.stoppageMinutes || 240;
        map[reason].count += 1;
      } else if (status === 'setup') {
        const reason = 'Setup / Troca de Material';
        if (!map[reason]) map[reason] = { minutes: 0, count: 0 };
        map[reason].minutes += r.stoppageMinutes || 90;
        map[reason].count += 1;
      } else if (status === 'preventiva') {
        const reason = 'Preventiva Programada';
        if (!map[reason]) map[reason] = { minutes: 0, count: 0 };
        map[reason].minutes += r.stoppageMinutes || 180;
        map[reason].count += 1;
      } else if (r.hasStoppage) {
        const reason = r.stoppageReason || 'Outro';
        if (!map[reason]) map[reason] = { minutes: 0, count: 0 };
        map[reason].minutes += r.stoppageMinutes || 0;
        map[reason].count += 1;
      }
    });

    return Object.entries(map).map(([reason, d]) => ({
      reason,
      minutes: d.minutes,
      count: d.count
    })).sort((a, b) => b.minutes - a.minutes);
  }, [records]);

  const qualityIssuesData = useMemo(() => {
    let tempDeviations = 0;
    let parameterChanges = 0;
    let magnetIssues = 0;
    let sieveIssues = 0;
    let sealerIssues = 0;
    let labelIssues = 0;

    filteredRecords.forEach(r => {
      if ((r.lineStatus || 'em_producao') === 'em_producao') {
        if (!r.temperaturesConforming) tempDeviations++;
        if (!r.parametersMatchPreviousSheet) parameterChanges++;
        if (r.magnetStatus && r.magnetStatus !== 'limpo') magnetIssues++;
        if (r.sievePowderCondition && r.sievePowderCondition !== 'normal') sieveIssues++;
        if (!r.sealerTempConforming || (r.sealingQuality && r.sealingQuality !== 'conforme')) sealerIssues++;
        if (!r.labelCodesConforming) labelIssues++;
      }
    });

    return [
      { label: 'Desvio Térmico (Zonas)', count: tempDeviations, color: 'bg-red-700' },
      { label: 'Mudança Parâmetros vs Ficha', count: parameterChanges, color: 'bg-amber-600' },
      { label: 'Peneira / Excesso de Pó', count: sieveIssues, color: 'bg-slate-700' },
      { label: 'Ímã (Contaminação / Limpeza)', count: magnetIssues, color: 'bg-red-900' },
      { label: 'Falha Selagem / Temp Seladora', count: sealerIssues, color: 'bg-red-500' },
      { label: 'Divergência Código Etiqueta', count: labelIssues, color: 'bg-rose-700' },
    ];
  }, [filteredRecords]);

  const maxProd = Math.max(...machineProductivityData.map(m => Math.max(m.avgProductivity, m.targetProductivity)), 500);
  const maxStopMinutes = Math.max(...stoppageReasonsData.map(s => s.minutes), 60);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-800" />
            <span>Gráficos e Análise de Produtividade, Operadores e Ocorrências</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas calculadas a partir de {records.length} apontamentos operacionais realizados
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filtrar Visão:</span>
          <select
            value={selectedMachineFilter}
            onChange={(e) => setSelectedMachineFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="ALL">Todas as Extrusoras (DR01 - DR06)</option>
            {MACHINE_LIST.map(m => (
              <option key={m} value={m}>Apenas Linha {m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: Produtividade por Máquina vs Meta */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Produtividade Média por Extrusora (kg/h)
                </h3>
                <span className="text-xs text-slate-500">Comparativo Real vs Meta da Ficha Técnica</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-3 h-3 rounded bg-red-800"></span>
                  <span>Real (kg/h)</span>
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-3 h-1 bg-slate-400"></span>
                  <span>Meta</span>
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {machineProductivityData.map((m) => {
                const prodPct = Math.min((m.avgProductivity / maxProd) * 100, 100);
                const targetPct = Math.min((m.targetProductivity / maxProd) * 100, 100);
                const isOverTarget = m.avgProductivity >= m.targetProductivity;

                return (
                  <div key={m.machineId} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 w-12 text-center py-0.5 bg-slate-100 rounded">
                          {m.machineId}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {m.totalChecks} apontamentos
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono">
                        <strong className="text-slate-900 tabular-nums">{m.avgProductivity} kg/h</strong>
                        <span className="text-[11px] text-slate-400">(Meta: {m.targetProductivity})</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isOverTarget ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {m.targetProductivity > 0 ? Math.round((m.avgProductivity / m.targetProductivity) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    <div className="relative w-full bg-slate-100 h-6 rounded-md overflow-hidden flex items-center">
                      <div 
                        className={`h-full transition-all duration-500 rounded-r ${
                          isOverTarget ? 'bg-red-800' : 'bg-red-600'
                        }`}
                        style={{ width: `${prodPct}%` }}
                      />
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-700 z-10 shadow-xs"
                        style={{ left: `${targetPct}%` }}
                        title={`Meta da Ficha: ${m.targetProductivity} kg/h`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-100 flex justify-between">
            <span>* Considera períodos em produção ativa</span>
            <span>Escala máx: {maxProd} kg/h</span>
          </div>
        </div>

        {/* GRÁFICO 2: Eficiência por Operador */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Desempenho e Eficiência por Operador
                </h3>
                <span className="text-xs text-slate-500">Média de vazão (kg/h) e taxa de conformidade de processo</span>
              </div>
              <Users className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3 pt-1">
              {operatorPerformanceData.map((op, idx) => {
                const maxOpProd = 500;
                const pct = Math.min((op.avgProd / maxOpProd) * 100, 100);

                return (
                  <div key={op.name} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-900 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900">{op.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span>
                          <strong className="text-slate-900 text-xs tabular-nums">{op.avgProd}</strong> kg/h
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                          op.complianceRate >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {op.complianceRate}% Ficha OK
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-800 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{op.checksCount} apontamentos</span>
                      <span>{op.stopMinutes > 0 ? `${op.stopMinutes} min paradas` : 'Zero paradas'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-100">
            A eficiência produtiva considera a média de kg/h alcançada e a conformidade sem desvios.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 3: Pareto de Paradas da Linha */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pareto de Paradas e Intervenções (Minutos Perdidos)
              </h3>
              <span className="text-xs text-slate-500">Distribuição por motivo, manutenção, setup e tempo acumulado</span>
            </div>
            <Clock className="w-4 h-4 text-red-700" />
          </div>

          {stoppageReasonsData.length > 0 ? (
            <div className="space-y-3 pt-2">
              {stoppageReasonsData.map((s) => {
                const pct = Math.min((s.minutes / maxStopMinutes) * 100, 100);

                return (
                  <div key={s.reason} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {s.reason} <span className="text-slate-400 font-normal">({s.count} eventos)</span>
                      </span>
                      <span className="font-mono font-bold text-red-800 tabular-nums">
                        {s.minutes} min ({Math.round((s.minutes / 60) * 10) / 10}h)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-4 rounded-md overflow-hidden flex items-center">
                      <div 
                        className="bg-red-700 h-full rounded-r transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhuma parada de máquina registrada nas checagens selecionadas.
            </div>
          )}
        </div>

        {/* GRÁFICO 4: Matriz de Desvios de Processo */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ocorrências de Processo & Inspeção Operacional
              </h3>
              <span className="text-xs text-slate-500">Contagem de desvios detectados em produção</span>
            </div>
            <AlertOctagon className="w-4 h-4 text-amber-600" />
          </div>

          <div className="space-y-3 pt-1">
            {qualityIssuesData.map((item) => {
              const maxCount = Math.max(...qualityIssuesData.map(q => q.count), 5);
              const pct = (item.count / maxCount) * 100;

              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {item.count} {item.count === 1 ? 'registro' : 'registros'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${item.color}`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Recomendação Operacional:</strong> Priorizar inspeção periódica na gaveta magnética e alinhamento de temperatura nas zonas de descompressão da DR02 e DR03 para mitigar desvios repetitivos.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
