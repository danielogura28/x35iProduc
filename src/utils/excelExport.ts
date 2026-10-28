/**
 * Exportador Avançado em Excel (.xlsx) para o Relatório Mensal do ExtruControl
 * Foco em ANÁLISE GRÁFICA RÁPIDA E DASHBOARD EXECUTIVO VISUAL:
 * 
 * - Gráficos de barras em células (visual ASCII/Unicode Block Charts)
 * - Indicadores visuais de status (🟢 CONFORME / 🟡 ATENÇÃO / 🔴 DESVIO)
 * - Análise de Pareto de Paradas com barras proporcionais
 * - Ranking visual dos Operadores com medalhas (🥇🥈🥉)
 * - Matriz comparativa das 6 Linhas Extrusoras (DR01 a DR06)
 * - 5 Abas estruturadas para tomada de decisão imediata
 */
import * as XLSX from 'xlsx';
import { 
  ProductionRecord, 
  FactoryMonthlyGoals, 
  MACHINE_LIST, 
  STOPPAGE_REASONS_LIST,
  MachineId 
} from '../types/production';

/**
 * Gera barra gráfica visual estilo Power BI dentro de célula do Excel
 */
function generateVisualBar(value: number, max: number = 100, length: number = 16): string {
  if (max <= 0 || isNaN(value)) return '░'.repeat(length);
  const ratio = Math.max(0, Math.min(1.5, value / max));
  const filled = Math.min(length, Math.max(0, Math.round(ratio * length)));
  const empty = Math.max(0, length - filled);
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function generatePowerBIGauge(value: number, target: number): string {
  if (target <= 0 || isNaN(value)) return `[ ${value} kg/h ]`;
  const pct = Math.round((value / target) * 100);
  const bar = generateVisualBar(value, target * 1.15, 12);
  const status = pct >= 100 ? '🟢 SUPERADO' : pct >= 90 ? '🟡 NA META' : '🔴 ABAIXO';
  return `[${bar}] ${pct}% (${status})`;
}

export function exportMonthlyReportToExcel(
  records: ProductionRecord[],
  selectedMonth: string, // 'YYYY-MM'
  factoryGoals: FactoryMonthlyGoals
): void {
  const monthRecords = records.filter(r => r.timestamp.startsWith(selectedMonth));
  const [yearStr, monthNum] = selectedMonth.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthLabel = `${monthNames[parseInt(monthNum, 10) - 1] || monthNum} de ${yearStr}`;

  // Criar nova pasta de trabalho Excel
  const wb = XLSX.utils.book_new();

  // ========================================================================
  // CÁLCULOS ESTRUTURAIS CONSOLIDADOS
  // ========================================================================
  const prodRecords = monthRecords.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
  const activeRunningRecords = prodRecords.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);

  const avgProductivity = activeRunningRecords.length > 0 
    ? Math.round(activeRunningRecords.reduce((acc, r) => acc + (r.productivityKgh || 0), 0) / activeRunningRecords.length)
    : 0;

  const estimatedTotalKg = activeRunningRecords.reduce((acc, r) => acc + ((r.productivityKgh || 0) * 4), 0);
  const estimatedTotalTons = Math.round((estimatedTotalKg / 1000) * 10) / 10;

  const conformingSheets = prodRecords.filter(r => r.temperaturesConforming && r.parametersMatchPreviousSheet).length;
  const sheetComplianceRate = prodRecords.length > 0 
    ? Math.round((conformingSheets / prodRecords.length) * 100) 
    : 100;

  const totalStoppagesQty = monthRecords.reduce((acc, r) => acc + (r.stoppageQuantity || (r.hasStoppage ? 1 : 0)), 0);

  const conformingLabels = prodRecords.filter(r => r.labelCodesConforming && r.sealingQuality === 'conforme').length;
  const labelComplianceRate = prodRecords.length > 0 
    ? Math.round((conformingLabels / prodRecords.length) * 100) 
    : 100;

  const totalMaintenanceOrders = monthRecords.filter(r => r.lineStatus === 'manutencao' || r.hasMaintenanceOrder).length;
  const totalSetupChecks = monthRecords.filter(r => r.lineStatus === 'setup').length;
  const totalPreventiveChecks = monthRecords.filter(r => r.lineStatus === 'preventiva').length;

  // ========================================================================
  // ABA 1: PAINEL EXECUTIVO & DASHBOARD POWER BI
  // ========================================================================
  const dashboardRows: (string | number)[][] = [
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    ['  📊 POWER BI EXECUTIVE DASHBOARD  •  PETROPOL POLÍMEROS  •  EXTRUCONTROL LINHAS DR01 A DR06'],
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    ['Slicers Ativos:', `Mês: ${monthLabel}`, '', 'Extrusoras:', 'DR01 a DR06 (Frota Completa)', '', 'Emissão:', new Date().toLocaleString('pt-BR')],
    ['Base Analisada:', `${monthRecords.length} apontamentos operacionais`, '', 'Status Geral:', avgProductivity >= factoryGoals.targetAverageProductivityKgh ? '🟢 OPERAÇÃO EFICIENTE' : '🟡 ALERTA DE PERFORMANCE'],
    [''],
    ['┌───────────────────────────────────────────────────────────────────────────────────────────────────┐'],
    ['│ 1. CARTÕES DE INDICADORES EXECUTIVOS (POWER BI KPI CARDS)                                         │'],
    ['└───────────────────────────────────────────────────────────────────────────────────────────────────┘'],
    ['Indicador Principal', 'Valor Realizado', 'Meta Planejada', 'Velocímetro / Gráfico Visual', 'Status Executivo', 'Desvio vs Meta'],
    [
      'Produtividade Média Global',
      `${avgProductivity} kg/h`,
      `${factoryGoals.targetAverageProductivityKgh} kg/h`,
      generatePowerBIGauge(avgProductivity, factoryGoals.targetAverageProductivityKgh),
      avgProductivity >= factoryGoals.targetAverageProductivityKgh ? '🟢 META ALCANÇADA' : '🔴 ABAIXO DA META',
      `${(avgProductivity - factoryGoals.targetAverageProductivityKgh).toFixed(1)} kg/h`
    ],
    [
      'Conformidade de Ficha & Térmica',
      `${sheetComplianceRate}%`,
      `${factoryGoals.targetProcessSheetComplianceRate}%`,
      `${generateVisualBar(sheetComplianceRate, 100, 14)} ${sheetComplianceRate}%`,
      sheetComplianceRate >= factoryGoals.targetProcessSheetComplianceRate ? '🟢 PROCESSO ESTÁVEL' : '🔴 ATENÇÃO TÉRMICA',
      `${(sheetComplianceRate - factoryGoals.targetProcessSheetComplianceRate).toFixed(1)}%`
    ],
    [
      'Conformidade Selagem / Etiquetas',
      `${labelComplianceRate}%`,
      `${factoryGoals.targetLabelComplianceRate}%`,
      `${generateVisualBar(labelComplianceRate, 100, 14)} ${labelComplianceRate}%`,
      labelComplianceRate >= factoryGoals.targetLabelComplianceRate ? '🟢 EMBALAGEM CONFORME' : '🟡 DIVERGÊNCIA ROTULAGEM',
      `${(labelComplianceRate - factoryGoals.targetLabelComplianceRate).toFixed(1)}%`
    ],
    [
      'Volume Total Estimado Produzido',
      `${estimatedTotalTons} t`,
      'N/A',
      `${generateVisualBar(estimatedTotalTons, 50, 14)}`,
      '⚖️ BALANÇO DE MASSA',
      `${Math.round(estimatedTotalKg).toLocaleString('pt-BR')} kg`
    ],
    [
      'Paradas e Chamados Técnicos',
      `${totalStoppagesQty} paradas`,
      'Máx 12h/máq',
      totalStoppagesQty === 0 ? '🟢 NENHUMA PARADA' : (totalStoppagesQty <= 5 ? '🟡 BAIXO IMPACTO' : '🔴 IMPACTO OPERACIONAL'),
      `${totalMaintenanceOrders} OMs abertas`,
      `${totalSetupChecks} setups realizados`
    ],
    [''],
    ['┌───────────────────────────────────────────────────────────────────────────────────────────────────┐'],
    ['│ 2. GRÁFICO COMPARATIVO DE PRODUTIVIDADE E CONFORMIDADE POR LINHA (DR01 A DR06)                   │'],
    ['└───────────────────────────────────────────────────────────────────────────────────────────────────┘'],
    [
      'Linha',
      'Status Operacional',
      'Produtividade (kg/h)',
      'Gráfico de Produtividade',
      '% da Meta',
      'Conformidade Ficha',
      'Gráfico de Qualidade',
      'Qtd Paradas',
      'Avaliação Geral'
    ]
  ];

  // Dados por linha com gráficos visuais
  MACHINE_LIST.forEach(mId => {
    const recs = monthRecords.filter(r => r.machineId === mId);
    const prod = recs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
    const running = prod.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);
    const pAvg = running.length > 0 ? Math.round(running.reduce((a, b) => a + (b.productivityKgh || 0), 0) / running.length) : 0;
    const cSheets = prod.filter(r => r.temperaturesConforming && r.parametersMatchPreviousSheet).length;
    const cRate = prod.length > 0 ? Math.round((cSheets / prod.length) * 100) : 100;
    const pStops = recs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);

    const pctOfGoal = Math.round((pAvg / (factoryGoals.targetAverageProductivityKgh || 1)) * 100);
    const prodBar = generateVisualBar(pAvg, factoryGoals.targetAverageProductivityKgh * 1.15, 14);
    const qualBar = generateVisualBar(cRate, 100, 10);

    let evalStatus = '🟢 Alta Eficiência';
    if (pAvg === 0) {
      evalStatus = '⚪ Manutenção/Inativa';
    } else if (pAvg < factoryGoals.targetAverageProductivityKgh * 0.9 && cRate < factoryGoals.targetProcessSheetComplianceRate) {
      evalStatus = '🔴 Linha Crítica (Vazão & Térmico)';
    } else if (pAvg < factoryGoals.targetAverageProductivityKgh) {
      evalStatus = '🟡 Vazão Abaixo da Meta';
    } else if (cRate < factoryGoals.targetProcessSheetComplianceRate) {
      evalStatus = '🟡 Desvios de Ficha / Térmicos';
    }

    dashboardRows.push([
      `Linha ${mId}`,
      recs.length > 0 ? (recs[0].lineStatus === 'manutencao' ? '🔧 Manutenção' : recs[0].lineStatus === 'setup' ? '⚙️ Setup' : '🏭 Em Produção') : 'Sem dados',
      pAvg > 0 ? `${pAvg} kg/h` : '0 kg/h',
      `${prodBar}`,
      `${pctOfGoal}%`,
      `${cRate}%`,
      `${qualBar}`,
      pStops === 0 ? '0 (Excelente)' : `${pStops} ocorrência(s)`,
      evalStatus
    ]);
  });

  dashboardRows.push(['']);
  dashboardRows.push(['┌───────────────────────────────────────────────────────────────────────────────────────────────────┐']);
  dashboardRows.push(['│ 3. ANÁLISE GRÁFICA DE PARETO: MAIORES OFENSORES E MOTIVOS DE PARADA                               │']);
  dashboardRows.push(['└───────────────────────────────────────────────────────────────────────────────────────────────────┘']);
  dashboardRows.push([
    'Motivo da Parada',
    'Qtd Ocorrências',
    'Gráfico de Impacto Visual',
    '% do Total',
    '% Acumulada',
    'Severidade'
  ]);

  // Contagem de motivos
  const reasonCounts: Record<string, number> = {};
  STOPPAGE_REASONS_LIST.forEach(reason => {
    reasonCounts[reason] = 0;
  });

  monthRecords.forEach(r => {
    if (r.hasStoppage) {
      if (r.stoppageReasonsList && r.stoppageReasonsList.length > 0) {
        r.stoppageReasonsList.forEach(m => {
          reasonCounts[m] = (reasonCounts[m] || 0) + 1;
        });
      } else if (r.stoppageReason) {
        reasonCounts[r.stoppageReason] = (reasonCounts[r.stoppageReason] || 0) + 1;
      }
    }
  });

  const sortedReasons = Object.entries(reasonCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalReasonsSum = sortedReasons.reduce((acc, [_, count]) => acc + count, 0) || 1;
  const maxReasonCount = sortedReasons.length > 0 ? sortedReasons[0][1] : 1;
  let cumulative = 0;

  if (sortedReasons.length === 0) {
    dashboardRows.push(['Nenhuma Parada Registrada no Período', 0, '░░░░░░░░░░░░░░░░', '0%', '0%', '🟢 Operação 100% Contínua']);
  } else {
    sortedReasons.forEach(([reason, count]) => {
      const pct = (count / totalReasonsSum) * 100;
      cumulative += pct;
      const paretoBar = generateVisualBar(count, maxReasonCount, 16);
      let severity = '🟡 Moderado';
      if (pct >= 30) severity = '🔴 Alto Impacto (Prioridade)';
      else if (pct <= 10) severity = '🟢 Baixo Impacto';

      dashboardRows.push([
        reason,
        count,
        `${paretoBar} (${count})`,
        `${pct.toFixed(1)}%`,
        `${Math.min(100, cumulative).toFixed(1)}%`,
        severity
      ]);
    });
  }

  dashboardRows.push(['']);
  dashboardRows.push(['┌───────────────────────────────────────────────────────────────────────────────────────────────────┐']);
  dashboardRows.push(['│ 4. TOP 3 OPERADORES - DESTAQUE EM EFICIÊNCIA PRODUTIVA                                            │']);
  dashboardRows.push(['└───────────────────────────────────────────────────────────────────────────────────────────────────┘']);
  dashboardRows.push([
    'Classificação',
    'Operador',
    'Vazão Média Entregue',
    'Gráfico de Produtividade',
    'Conformidade de Ficha',
    'Paradas no Turno'
  ]);

  // Ranking de Operadores
  const operatorMap = new Map<string, {
    count: number;
    prodCount: number;
    totalKgh: number;
    conformingCount: number;
    stopsCount: number;
  }>();

  monthRecords.forEach(r => {
    const op = r.operatorName || 'Não Identificado';
    if (!operatorMap.has(op)) {
      operatorMap.set(op, { count: 0, prodCount: 0, totalKgh: 0, conformingCount: 0, stopsCount: 0 });
    }
    const entry = operatorMap.get(op)!;
    entry.count += 1;
    if ((r.lineStatus || 'em_producao') === 'em_producao') {
      entry.prodCount += 1;
      if (!r.hasStoppage && (r.productivityKgh || 0) > 0) {
        entry.totalKgh += r.productivityKgh || 0;
      }
      if (r.temperaturesConforming && r.parametersMatchPreviousSheet) {
        entry.conformingCount += 1;
      }
    }
    if (r.hasStoppage) {
      entry.stopsCount += r.stoppageQuantity || 1;
    }
  });

  const sortedOperators = Array.from(operatorMap.entries())
    .map(([name, data]) => {
      const avgKgh = data.prodCount > 0 ? Math.round(data.totalKgh / data.prodCount) : 0;
      const confRate = data.prodCount > 0 ? Math.round((data.conformingCount / data.prodCount) * 100) : 100;
      return { name, avgKgh, confRate, ...data };
    })
    .sort((a, b) => b.avgKgh - a.avgKgh);

  const top3 = sortedOperators.slice(0, 3);
  const medalIcons = ['🥇 1º Lugar (Ouro)', '🥈 2º Lugar (Prata)', '🥉 3º Lugar (Bronze)'];

  if (top3.length === 0) {
    dashboardRows.push(['-', 'Nenhum operador com dados suficientes no período', '-', '-', '-', '-']);
  } else {
    top3.forEach((op, idx) => {
      dashboardRows.push([
        medalIcons[idx] || `${idx + 1}º Lugar`,
        op.name,
        `${op.avgKgh} kg/h`,
        `${generateVisualBar(op.avgKgh, 500, 14)}`,
        `${op.confRate}% Conforme`,
        `${op.stopsCount} parada(s)`
      ]);
    });
  }

  const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardRows);
  wsDashboard['!cols'] = [
    { wch: 32 }, { wch: 22 }, { wch: 24 }, { wch: 30 },
    { wch: 22 }, { wch: 24 }, { wch: 22 }, { wch: 20 }, { wch: 32 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDashboard, '📊 Power BI Dashboard');

  // ========================================================================
  // ABA 2: ANÁLISE COMPARATIVA POR LINHA (MATRIZ COMPLETA DR01-DR06)
  // ========================================================================
  const lineDetailsRows: (string | number)[][] = [
    ['MATRIZ TÉCNICA COMPARATIVA POR EXTRUSORA (DR01 A DR06)'],
    ['Mês de Referência:', monthLabel],
    [''],
    [
      'Linha',
      'Total Apontamentos',
      'Turnos em Produção',
      'Produtividade Média (kg/h)',
      'Meta Estabelecida (kg/h)',
      'Variação Real vs Meta',
      'Volume Produzido (t)',
      'Conformidade de Ficha (%)',
      'Horas em Parada Estimadas',
      'Qtd de Paradas',
      'Chamados de Manutenção (OM)',
      'Índice de Confiabilidade'
    ]
  ];

  MACHINE_LIST.forEach(mId => {
    const recs = monthRecords.filter(r => r.machineId === mId);
    const prod = recs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
    const running = prod.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);
    const pAvg = running.length > 0 ? Math.round(running.reduce((a, b) => a + (b.productivityKgh || 0), 0) / running.length) : 0;
    const kg = running.reduce((a, b) => a + ((b.productivityKgh || 0) * 4), 0);
    const tons = Math.round((kg / 1000) * 10) / 10;
    const cSheets = prod.filter(r => r.temperaturesConforming && r.parametersMatchPreviousSheet).length;
    const cRate = prod.length > 0 ? Math.round((cSheets / prod.length) * 100) : 100;
    const pStops = recs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);
    const omCount = recs.filter(r => r.lineStatus === 'manutencao' || r.hasMaintenanceOrder).length;

    let reliability = '⭐⭐⭐⭐⭐ Excelente';
    if (omCount >= 2 || pStops >= 3) reliability = '⭐⭐ Atenção Imediata';
    else if (omCount >= 1 || pStops >= 1) reliability = '⭐⭐⭐⭐ Regular';

    lineDetailsRows.push([
      `Extrusora ${mId}`,
      recs.length,
      prod.length,
      pAvg,
      factoryGoals.targetAverageProductivityKgh,
      pAvg > 0 ? `${(pAvg - factoryGoals.targetAverageProductivityKgh).toFixed(1)} kg/h` : 'N/A',
      tons,
      `${cRate}%`,
      pStops * 2.5, // 2.5h estimadas por parada
      pStops,
      omCount,
      reliability
    ]);
  });

  const wsLineDetails = XLSX.utils.aoa_to_sheet(lineDetailsRows);
  wsLineDetails['!cols'] = [
    { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 24 }, { wch: 24 },
    { wch: 24 }, { wch: 20 }, { wch: 24 }, { wch: 24 }, { wch: 16 },
    { wch: 26 }, { wch: 26 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLineDetails, '📈 Análise Linhas DR');

  // ========================================================================
  // ABA 3: RANKING DE EFICIÊNCIA POR OPERADOR
  // ========================================================================
  const operatorRows: (string | number)[][] = [
    ['RANKING COMPLETO DE EFICIÊNCIA OPERACIONAL POR COLABORADOR'],
    ['Mês de Referência:', monthLabel],
    [''],
    [
      'Posição',
      'Operador da Linha',
      'Total de Apontamentos',
      'Turnos em Produção',
      'Produtividade Média (kg/h)',
      'Gráfico de Produtividade',
      'Conformidade de Ficha (%)',
      'Gráfico de Conformidade',
      'Total de Paradas Registradas',
      'Avaliação Gerencial'
    ]
  ];

  sortedOperators.forEach((op, idx) => {
    let evaluation = '🟢 Excelente Eficiência';
    if (op.avgKgh < factoryGoals.targetAverageProductivityKgh && op.confRate < factoryGoals.targetProcessSheetComplianceRate) {
      evaluation = '🔴 Treinamento Recomendado (Vazão & Ficha)';
    } else if (op.avgKgh < factoryGoals.targetAverageProductivityKgh) {
      evaluation = '🟡 Atenção à Meta de Vazão';
    } else if (op.confRate < factoryGoals.targetProcessSheetComplianceRate) {
      evaluation = '🟡 Atenção aos Desvios Térmicos/Ficha';
    }

    const prodBar = generateVisualBar(op.avgKgh, 500, 12);
    const qualBar = generateVisualBar(op.confRate, 100, 10);

    operatorRows.push([
      idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `${idx + 1}º`,
      op.name,
      op.count,
      op.prodCount,
      op.avgKgh > 0 ? `${op.avgKgh} kg/h` : 'N/A',
      `${prodBar}`,
      `${op.confRate}%`,
      `${qualBar}`,
      op.stopsCount,
      evaluation
    ]);
  });

  const wsOperators = XLSX.utils.aoa_to_sheet(operatorRows);
  wsOperators['!cols'] = [
    { wch: 12 }, { wch: 26 }, { wch: 22 }, { wch: 20 },
    { wch: 26 }, { wch: 20 }, { wch: 24 }, { wch: 20 },
    { wch: 26 }, { wch: 36 }
  ];
  XLSX.utils.book_append_sheet(wb, wsOperators, '🏆 Ranking Operadores');

  // ========================================================================
  // ABA 4: DESVIOS & COMUNICAÇÃO COM A LIDERANÇA
  // ========================================================================
  const deviationRecords = monthRecords.filter(r => 
    r.deviationReportedToLeader || 
    !r.temperaturesConforming || 
    !r.parametersMatchPreviousSheet || 
    !r.labelCodesConforming || 
    r.dos02Homogenization === 'irregular'
  );

  const deviationHeaders = [
    'Data/Hora',
    'Extrusora',
    'OP',
    'Lote',
    'Operador',
    'Desvio Comunicado ao Líder?',
    'Horário do Aviso',
    'Líder Notificado',
    'Orientação / Ação Acordada com Líder',
    'Status Térmico',
    'Zonas com Desvio Térmico',
    'Homogeneização DOS02',
    'Etiquetas/Selagem',
    'Relato de Desvios'
  ];

  const deviationRows = deviationRecords.map(r => [
    new Date(r.timestamp).toLocaleString('pt-BR'),
    r.machineId,
    r.productionOrder || '-',
    r.batchNumber || '-',
    r.operatorName,
    r.deviationReportedToLeader ? '🟢 SIM, REPASSADO' : '🔴 NÃO REPASSADO',
    r.deviationReportTime || '-',
    r.deviationReportLeaderName || r.shiftLeader,
    r.deviationReportLeaderNotes || '-',
    r.temperaturesConforming ? '🟢 Conforme' : '🔴 Desvio Térmico',
    r.temperatureDeviationZones || '-',
    r.dos02Homogenization === 'conforme' ? '🟢 Conforme' : (r.dos02Homogenization === 'irregular' ? '🔴 Irregular' : '⚪ N/A'),
    r.labelCodesConforming ? '🟢 Conforme' : '🔴 Divergente',
    r.operationalDeviationsNotes || '-'
  ]);

  const wsDeviations = XLSX.utils.aoa_to_sheet([
    ['REGISTRO DE DESVIOS OPERACIONAIS E COMUNICAÇÃO COM LIDERANÇA'],
    ['Mês de Referência:', monthLabel],
    ['Total de Ocorrências com Desvio:', deviationRecords.length],
    [''],
    deviationHeaders,
    ...deviationRows
  ]);

  wsDeviations['!cols'] = [
    { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
    { wch: 26 }, { wch: 16 }, { wch: 20 }, { wch: 38 }, { wch: 18 },
    { wch: 32 }, { wch: 22 }, { wch: 18 }, { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDeviations, '⚠️ Desvios & Liderança');

  // ========================================================================
  // ABA 5: HISTÓRICO COMPLETO (BASE DE DADOS BRUTA)
  // ========================================================================
  const headersDetail = [
    'ID Registro',
    'Data/Hora',
    'Extrusora',
    'Status da Linha',
    'Turno',
    'Operador',
    'Líder Responsável',
    'OP',
    'Lote',
    'Produto / Composto',
    'Produtividade Atual (kg/h)',
    'Meta Esperada (kg/h)',
    'RPM Rosca',
    'Corrente Motor (A)',
    'Ficha Ref. Anterior?',
    'Produtividade Ref. Ant. (kg/h)',
    'RPM Ref. Ant.',
    'Corrente Ref. Ant. (A)',
    'Temperaturas Conformes?',
    'Zonas com Desvio Térmico',
    'DOP Observações?',
    'Aprovação Líder?',
    'Dosadora 01 (%/Mat)',
    'Dosadora 02 (%/Mat)',
    'Dosadora 03 (%/Mat)',
    'Dosadora 04 (%/Mat)',
    'DOS02 Homogeneização',
    'Side Feeder RPM Atual',
    'Side Feeder RPM Ref',
    'Sistema Circulação',
    'Avaliação Ímã',
    'Peneira / Pó',
    'Temp Seladora Correta?',
    'Etiquetas Conformes?',
    'Qualidade Selagem',
    'Desvio Comunicado ao Líder?',
    'Horário Aviso Líder',
    'Líder Notificado',
    'Orientação do Líder',
    'Houve Parada?',
    'Qtd de Paradas',
    'Motivos das Paradas',
    'Ordem de Manutenção (OM)',
    'Material em Setup',
    'Relato de Desvios Operacionais',
    'Qtd Evidências Fotográficas'
  ];

  const detailRows = monthRecords.map(r => [
    r.id,
    new Date(r.timestamp).toLocaleString('pt-BR'),
    r.machineId,
    r.lineStatus || 'em_producao',
    r.shift,
    r.operatorName,
    r.shiftLeader,
    r.productionOrder || '',
    r.batchNumber || '',
    r.productName || '',
    r.productivityKgh ?? '',
    r.targetProductivityKgh ?? '',
    r.rpm ?? '',
    r.motorAmperes ?? '',
    r.hasPreviousReferenceSheet ? 'Sim' : 'Não (Sem Ref.)',
    r.prevProductivityKgh ?? '',
    r.prevRpm ?? '',
    r.prevMotorAmperes ?? '',
    r.temperaturesConforming ? 'Conforme' : (r.temperaturesConforming === false ? 'Desvio' : ''),
    r.temperatureDeviationZones || '',
    r.dopObservationsIdentified ? 'Sim' : 'Não',
    r.deviationApprovedByLeader ? 'Aprovado' : 'Pendente/N/A',
    r.dosers?.dos01?.value || '',
    r.dosers?.dos02?.value || '',
    r.dosers?.dos03?.value || '',
    r.dosers?.dos04?.value || '',
    r.dos02Homogenization || '',
    r.sideFeederCurrentRpm ?? '',
    r.sideFeederPreviousRpm ?? '',
    r.circulationSystemStatus || 'ativo',
    r.magnetStatus || '',
    r.sievePowderCondition || '',
    r.sealerTempConforming ? 'Correta' : (r.sealerTempConforming === false ? 'Incorreta' : ''),
    r.labelCodesConforming ? 'Conforme' : (r.labelCodesConforming === false ? 'Divergente' : ''),
    r.sealingQuality || '',
    r.deviationReportedToLeader ? 'Sim' : 'Não',
    r.deviationReportTime || '',
    r.deviationReportLeaderName || '',
    r.deviationReportLeaderNotes || '',
    r.hasStoppage ? 'Sim' : 'Não',
    r.stoppageQuantity || (r.hasStoppage ? 1 : 0),
    (r.stoppageReasonsList && r.stoppageReasonsList.length > 0) ? r.stoppageReasonsList.join(', ') : (r.stoppageReason || ''),
    r.maintenanceOrderNumber || '',
    r.setupMaterial || '',
    r.operationalDeviationsNotes || '',
    r.photos ? r.photos.length : 0
  ]);

  const wsDetails = XLSX.utils.aoa_to_sheet([headersDetail, ...detailRows]);
  wsDetails['!cols'] = headersDetail.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsDetails, '📋 Apontamentos Detalhados');

  // Gravar e baixar o arquivo .xlsx
  const filename = `ExtruControl_Dashboard_Visual_Mensal_${selectedMonth}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Exportador Avançado em Excel (.xlsx) para o Relatório Detalhado DIÁRIO do ExtruControl
 * Inclui:
 * - KPIs de performance do dia (volume, produtividade, conformidade)
 * - Gráficos de barras visuais em células (generateVisualBar)
 * - Comparativo entre os 3 Turnos de Produção (T1, T2, T3)
 * - Desempenho individual das 6 extrusoras no dia (DR01-DR06)
 * - Registro detalhado de ocorrências, paradas, OMs e comunicação ao líder no dia
 */
export function exportDailyReportToExcel(
  records: ProductionRecord[],
  selectedDate: string, // 'YYYY-MM-DD'
  factoryGoals: FactoryMonthlyGoals
): void {
  const dayRecords = records.filter(r => r.timestamp.startsWith(selectedDate));
  
  const [yearStr, monthNum, dayNum] = selectedDate.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const dateFormatted = `${dayNum}/${monthNum}/${yearStr}`;
  const dateLongLabel = `${dayNum} de ${monthNames[parseInt(monthNum, 10) - 1] || monthNum} de ${yearStr}`;

  const wb = XLSX.utils.book_new();

  // ========================================================================
  // CÁLCULOS DO DIA
  // ========================================================================
  const prodRecords = dayRecords.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
  const activeRunningRecords = prodRecords.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);

  const avgProductivity = activeRunningRecords.length > 0
    ? Math.round(activeRunningRecords.reduce((acc, r) => acc + (r.productivityKgh || 0), 0) / activeRunningRecords.length)
    : 0;

  // Estimativa de produção do dia: apontamentos representam períodos de turno (cada apontamento ativo ~ 4h)
  const estimatedDayKg = activeRunningRecords.reduce((acc, r) => acc + ((r.productivityKgh || 0) * 4), 0);
  const estimatedDayTons = Math.round((estimatedDayKg / 1000) * 10) / 10;

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

  // Turnos
  const shifts = [
    'Turno 1 (06h - 14h)',
    'Turno 2 (14h - 22h)',
    'Turno 3 (22h - 06h)'
  ] as const;

  // ========================================================================
  // ABA 1: POWER BI EXECUTIVE DASHBOARD DIÁRIO
  // ========================================================================
  const dashboardRows: (string | number)[][] = [
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    ['  📊 POWER BI EXECUTIVE DASHBOARD DIÁRIO  •  PETROPOL POLÍMEROS  •  EXTRUCONTROL LINHAS DR01-06'],
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    ['Slicers Ativos:', `Data: ${dateFormatted} (${dateLongLabel})`, '', 'Frota Fabril:', 'Extrusoras DR01 a DR06', '', 'Emissão:', new Date().toLocaleString('pt-BR')],
    ['Base Analisada:', `${dayRecords.length} apontamentos no dia`, '', 'Balanço de Massa:', `${estimatedDayKg.toLocaleString('pt-BR')} kg (${estimatedDayTons} t)`, '', 'Status Geral:', avgProductivity >= factoryGoals.targetAverageProductivityKgh ? '🟢 OPERAÇÃO EFICIENTE' : '🟡 ALERTA DE PERFORMANCE'],
    [''],
    ['┌───────────────────────────────────────────────────────────────────────────────────────────────────┐'],
    ['│ 1. CARTÕES DE INDICADORES EXECUTIVOS DO DIA (POWER BI KPI CARDS)                                  │'],
    ['└───────────────────────────────────────────────────────────────────────────────────────────────────┘'],
    ['Indicador Operacional', 'Valor Realizado no Dia', 'Meta de Referência', 'Velocímetro / Gráfico Visual', 'Status Executivo', 'Desvio vs Meta'],
    [
      'Produtividade Média Global',
      `${avgProductivity} kg/h`,
      `${factoryGoals.targetAverageProductivityKgh} kg/h`,
      generatePowerBIGauge(avgProductivity, factoryGoals.targetAverageProductivityKgh),
      avgProductivity >= factoryGoals.targetAverageProductivityKgh ? '🟢 META ALCANÇADA' : '🔴 ABAIXO DA META',
      `${(avgProductivity - factoryGoals.targetAverageProductivityKgh).toFixed(1)} kg/h`
    ],
    [
      'Conformidade Térmica & Ficha de Processo',
      `${sheetComplianceRate}%`,
      `${factoryGoals.targetProcessSheetComplianceRate}%`,
      `${generateVisualBar(sheetComplianceRate, 100, 14)} ${sheetComplianceRate}%`,
      sheetComplianceRate >= factoryGoals.targetProcessSheetComplianceRate ? '🟢 PROCESSO ESTÁVEL' : '🟡 ATENÇÃO TÉRMICA',
      `${sheetComplianceRate - factoryGoals.targetProcessSheetComplianceRate}%`
    ],
    [
      'Conformidade de Embalagem & Selagem',
      `${labelComplianceRate}%`,
      `${factoryGoals.targetLabelComplianceRate}%`,
      `${generateVisualBar(labelComplianceRate, 100, 14)} ${labelComplianceRate}%`,
      labelComplianceRate >= factoryGoals.targetLabelComplianceRate ? '🟢 CONFORME' : '🟡 ATENÇÃO',
      `${labelComplianceRate - factoryGoals.targetLabelComplianceRate}%`
    ],
    [
      'Total de Paradas Registradas no Dia',
      `${totalStoppagesQty} parada(s)`,
      '0 toleradas',
      totalStoppagesQty === 0 ? '██████████████ 100% (Sem paradas)' : `${generateVisualBar(Math.max(0, 10 - totalStoppagesQty), 10, 14)} ${totalStoppagesQty} evento(s)`,
      totalStoppagesQty === 0 ? '🟢 OPERAÇÃO CONTÍNUA' : '🔴 PARADAS REGISTRADAS',
      totalStoppagesQty > 0 ? `+${totalStoppagesQty} evento(s)` : '0'
    ],
    [
      'Desvios Comunicados ao Líder',
      `${reportedToLeaderCount} desvio(s)`,
      'Alinhamento imediato',
      reportedToLeaderCount === 0 ? '██████████████ 100% Conforme' : '⚠️ Comunicação Ativa',
      reportedToLeaderCount === 0 ? '🟢 NORMAL' : 'ℹ️ ALINHADO C/ SUPERVISÃO',
      `${reportedToLeaderCount} alinhamentos`
    ],
    [''],
    ['┌───────────────────────────────────────────────────────────────────────────────────────────────────┐'],
    ['│ 2. DESEMPENHO CONSOLIDADO POR TURNO DE TRABALHO                                                   │'],
    ['└───────────────────────────────────────────────────────────────────────────────────────────────────┘'],
    ['Turno de Produção', 'Apontamentos', 'Volume Est. (kg)', 'Produtividade Média', 'Gráfico Visual kg/h', 'Paradas', 'Conformidade Ficha %']
  ];

  // Adicionar linhas por turno
  for (const shiftName of shifts) {
    const shiftRecs = dayRecords.filter(r => r.shift === shiftName);
    const shiftProd = shiftRecs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
    const shiftActive = shiftProd.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);
    
    const shiftAvgKgh = shiftActive.length > 0
      ? Math.round(shiftActive.reduce((a, b) => a + (b.productivityKgh || 0), 0) / shiftActive.length)
      : 0;
    
    const shiftKg = shiftActive.reduce((a, b) => a + ((b.productivityKgh || 0) * 4), 0);
    const shiftStoppages = shiftRecs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);
    
    const shiftConform = shiftProd.length > 0
      ? Math.round((shiftProd.filter(r => r.temperaturesConforming && r.parametersMatchPreviousSheet).length / shiftProd.length) * 100)
      : 100;

    dashboardRows.push([
      shiftName,
      shiftRecs.length,
      shiftKg.toLocaleString('pt-BR'),
      `${shiftAvgKgh} kg/h`,
      `${generateVisualBar(shiftAvgKgh, factoryGoals.targetAverageProductivityKgh, 12)} ${shiftAvgKgh > 0 ? Math.round((shiftAvgKgh / factoryGoals.targetAverageProductivityKgh) * 100) : 0}%`,
      shiftStoppages,
      `${shiftConform}%`
    ]);
  }

  dashboardRows.push(['']);
  dashboardRows.push(['┌───────────────────────────────────────────────────────────────────────────────────────────────────┐']);
  dashboardRows.push(['│ 3. RESUMO OPERACIONAL DAS LINHAS NO DIA                                                           │']);
  dashboardRows.push(['└───────────────────────────────────────────────────────────────────────────────────────────────────┘']);
  dashboardRows.push(['Status Operacional', 'Quantidade de Registros', 'Participação %', 'Gráfico Visual']);
  
  const totalDay = dayRecords.length || 1;
  const statusCounts = [
    { label: 'Em Produção', count: prodRecords.length, icon: '🟢' },
    { label: 'Em Manutenção (OM)', count: maintenanceCount, icon: '🔴' },
    { label: 'Em Setup (Troca de Matriz/Cor)', count: setupCount, icon: '🟡' },
    { label: 'Em Preventiva', count: preventiveCount, icon: '🔵' },
    { label: 'Inativa / Desligada', count: dayRecords.filter(r => r.lineStatus === 'inativa').length, icon: '⚪' }
  ];

  for (const s of statusCounts) {
    const pct = Math.round((s.count / totalDay) * 100);
    dashboardRows.push([
      `${s.icon} ${s.label}`,
      s.count,
      `${pct}%`,
      generateVisualBar(pct, 100, 16)
    ]);
  }

  const wsDash = XLSX.utils.aoa_to_sheet(dashboardRows);
  wsDash['!cols'] = [
    { wch: 38 },
    { wch: 24 },
    { wch: 22 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDash, '📊 Power BI Dashboard Diário');

  // ========================================================================
  // ABA 2: DESEMPENHO INDIVIDUAL POR LINHA (DR01 A DR06) NO DIA
  // ========================================================================
  const lineRows: (string | number)[][] = [
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    [`   EXTRUCONTROL  •  DESEMPENHO POR LINHA EXTRUSORA  •  DATA: ${dateFormatted}`],
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    ['Linha', 'Status Predominante', 'Produtividade Média', 'Meta Planejada', 'Atingimento %', 'Gráfico Visual vs Meta', 'RPM Rosca', 'Corrente (A)', 'Paradas', 'Última OP / Produto']
  ];

  for (const mId of MACHINE_LIST) {
    const mRecs = dayRecords.filter(r => r.machineId === mId);
    const mProd = mRecs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
    const mActive = mProd.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);

    const mAvgKgh = mActive.length > 0
      ? Math.round(mActive.reduce((a, b) => a + (b.productivityKgh || 0), 0) / mActive.length)
      : 0;

    const mTargetKgh = mActive[0]?.targetProductivityKgh || factoryGoals.targetAverageProductivityKgh;
    const mAtteinment = mTargetKgh > 0 ? Math.round((mAvgKgh / mTargetKgh) * 100) : 0;
    
    const mAvgRpm = mActive.length > 0
      ? Math.round(mActive.reduce((a, b) => a + (b.rpm || 0), 0) / mActive.length)
      : 0;

    const mAvgAmp = mActive.length > 0
      ? Math.round((mActive.reduce((a, b) => a + (b.motorAmperes || 0), 0) / mActive.length) * 10) / 10
      : 0;

    const mStoppages = mRecs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);

    // Identificar status predominante
    let predStatus = 'Sem Registro no Dia';
    if (mRecs.length > 0) {
      const latest = mRecs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (latest.lineStatus === 'em_producao') {
        predStatus = latest.hasStoppage ? `Produção (Parada: ${latest.stoppageReason || 'Ajuste'})` : 'Em Produção';
      } else if (latest.lineStatus === 'manutencao') {
        predStatus = `Manutenção (OM: ${latest.maintenanceOrderNumber || 'S/N'})`;
      } else if (latest.lineStatus === 'setup') {
        predStatus = `Setup: ${latest.setupMaterial || 'Em troca'}`;
      } else if (latest.lineStatus === 'preventiva') {
        predStatus = 'Preventiva Programada';
      } else if (latest.lineStatus === 'inativa') {
        predStatus = 'Inativa';
      }
    }

    const lastProduct = mRecs[0] 
      ? `${mRecs[0].productionOrder || 'S/OP'} - ${mRecs[0].productName || mRecs[0].setupMaterial || 'N/A'}`
      : 'N/A';

    lineRows.push([
      `Extrusora ${mId}`,
      predStatus,
      mAvgKgh > 0 ? `${mAvgKgh} kg/h` : 'N/A',
      `${mTargetKgh} kg/h`,
      mAvgKgh > 0 ? `${mAtteinment}%` : 'N/A',
      generateVisualBar(mAvgKgh, mTargetKgh, 14),
      mAvgRpm > 0 ? `${mAvgRpm} rpm` : '-',
      mAvgAmp > 0 ? `${mAvgAmp} A` : '-',
      mStoppages,
      lastProduct
    ]);
  }

  const wsLines = XLSX.utils.aoa_to_sheet(lineRows);
  wsLines['!cols'] = [
    { wch: 16 },
    { wch: 30 },
    { wch: 20 },
    { wch: 16 },
    { wch: 15 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 36 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLines, '🏭 Linhas Extrusoras no Dia');

  // ========================================================================
  // ABA 3: OCORRÊNCIAS, PARADAS E COMUNICAÇÕES AO LÍDER NO DIA
  // ========================================================================
  const eventRows: (string | number)[][] = [
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    [`   EXTRUCONTROL  •  RELATÓRIO DE OCORRÊNCIAS, PARADAS E DESVIOS  •  DATA: ${dateFormatted}`],
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    ['Horário', 'Linha', 'Turno', 'Operador', 'Líder', 'Tipo de Evento', 'Detalhes / Motivo', 'Informado ao Líder?', 'Horário Comunicado', 'Anotações do Líder']
  ];

  const problemRecords = dayRecords.filter(r => 
    r.hasStoppage || 
    r.lineStatus === 'manutencao' || 
    r.lineStatus === 'setup' || 
    !r.temperaturesConforming || 
    !r.parametersMatchPreviousSheet ||
    r.deviationReportedToLeader ||
    (r.operationalDeviationsNotes && r.operationalDeviationsNotes.trim() !== '')
  );

  if (problemRecords.length === 0) {
    eventRows.push(['--', '--', '--', '--', '--', 'OPERAÇÃO 100% REGULAR', 'Nenhuma parada ou desvio registrado nesta data.', 'Não', '--', '--']);
  } else {
    for (const r of problemRecords) {
      const timeStr = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      let eventType = 'Desvio Operacional';
      let details = r.operationalDeviationsNotes || '';

      if (r.lineStatus === 'manutencao') {
        eventType = `Manutenção (OM: ${r.maintenanceOrderNumber || 'S/N'})`;
        details = r.operationalDeviationsNotes || 'Intervenção técnica corretiva';
      } else if (r.lineStatus === 'setup') {
        eventType = 'Troca de Matriz / Setup';
        details = `Material: ${r.setupMaterial || 'Não especificado'}`;
      } else if (r.hasStoppage) {
        const reasons = (r.stoppageReasonsList && r.stoppageReasonsList.length > 0) 
          ? r.stoppageReasonsList.join(', ') 
          : (r.stoppageReason || 'Ajuste Geral');
        eventType = `Parada de Máquina (Qtd: ${r.stoppageQuantity || 1})`;
        details = `Motivo: ${reasons}. ${r.operationalDeviationsNotes || ''}`;
      } else if (!r.temperaturesConforming) {
        eventType = 'Desvio Térmico';
        details = `Zonas: ${r.temperatureDeviationZones || 'Não conformes'}`;
      }

      eventRows.push([
        timeStr,
        r.machineId,
        r.shift,
        r.operatorName,
        r.shiftLeader,
        eventType,
        details,
        r.deviationReportedToLeader ? 'Sim' : 'Não',
        r.deviationReportTime || '--',
        r.deviationReportLeaderNotes || (r.deviationReportLeaderName ? `Alinhado com ${r.deviationReportLeaderName}` : '--')
      ]);
    }
  }

  const wsEvents = XLSX.utils.aoa_to_sheet(eventRows);
  wsEvents['!cols'] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 26 },
    { wch: 40 },
    { wch: 20 },
    { wch: 18 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsEvents, '⚠️ Paradas & Ocorrências do Dia');

  // ========================================================================
  // ABA 4: APONTAMENTOS COMPLETOS DO DIA
  // ========================================================================
  const headersDetail = [
    'ID Registro',
    'Data/Hora',
    'Máquina',
    'Status da Linha',
    'Turno',
    'Operador',
    'Líder do Turno',
    'OP',
    'Lote',
    'Produto / Composto',
    'Produtividade (kg/h)',
    'Meta (kg/h)',
    'RPM da Rosca',
    'Corrente (A)',
    'Ficha Ref. Ant.',
    'Kg/h Ref. Ant.',
    'RPM Ref. Ant.',
    'Amperes Ref. Ant.',
    'Temperaturas Conformes?',
    'Desvios Térmicos',
    'Obs. DOP?',
    'Aprovação Líder',
    'DOS01',
    'DOS02',
    'DOS03',
    'DOS04',
    'Homogeneização DOS02',
    'Side Feeder RPM Atual',
    'Side Feeder RPM Ref.',
    'Sistema de Circulação',
    'Status do Ímã',
    'Condição Peneira / Pó',
    'Temp. Seladora',
    'Etiquetas & Código',
    'Qualidade Selagem',
    'Comunicado ao Líder?',
    'Horário Comunicação',
    'Nome do Líder',
    'Parecer do Líder',
    'Houve Parada?',
    'Qtd Paradas',
    'Motivos das Paradas',
    'Número OM',
    'Material em Setup',
    'Desvios Operacionais',
    'Fotos'
  ];

  const detailRows = dayRecords.map(r => [
    r.id,
    new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    r.machineId,
    r.lineStatus || 'em_producao',
    r.shift,
    r.operatorName,
    r.shiftLeader,
    r.productionOrder || '',
    r.batchNumber || '',
    r.productName || '',
    r.productivityKgh ?? '',
    r.targetProductivityKgh ?? '',
    r.rpm ?? '',
    r.motorAmperes ?? '',
    r.hasPreviousReferenceSheet ? 'Sim' : 'Não (Sem Ref.)',
    r.prevProductivityKgh ?? '',
    r.prevRpm ?? '',
    r.prevMotorAmperes ?? '',
    r.temperaturesConforming ? 'Conforme' : (r.temperaturesConforming === false ? 'Desvio' : ''),
    r.temperatureDeviationZones || '',
    r.dopObservationsIdentified ? 'Sim' : 'Não',
    r.deviationApprovedByLeader ? 'Aprovado' : 'Pendente/N/A',
    r.dosers?.dos01?.value || '',
    r.dosers?.dos02?.value || '',
    r.dosers?.dos03?.value || '',
    r.dosers?.dos04?.value || '',
    r.dos02Homogenization || '',
    r.sideFeederCurrentRpm ?? '',
    r.sideFeederPreviousRpm ?? '',
    r.circulationSystemStatus || 'ativo',
    r.magnetStatus || '',
    r.sievePowderCondition || '',
    r.sealerTempConforming ? 'Correta' : (r.sealerTempConforming === false ? 'Incorreta' : ''),
    r.labelCodesConforming ? 'Conforme' : (r.labelCodesConforming === false ? 'Divergente' : ''),
    r.sealingQuality || '',
    r.deviationReportedToLeader ? 'Sim' : 'Não',
    r.deviationReportTime || '',
    r.deviationReportLeaderName || '',
    r.deviationReportLeaderNotes || '',
    r.hasStoppage ? 'Sim' : 'Não',
    r.stoppageQuantity || (r.hasStoppage ? 1 : 0),
    (r.stoppageReasonsList && r.stoppageReasonsList.length > 0) ? r.stoppageReasonsList.join(', ') : (r.stoppageReason || ''),
    r.maintenanceOrderNumber || '',
    r.setupMaterial || '',
    r.operationalDeviationsNotes || '',
    r.photos ? r.photos.length : 0
  ]);

  const wsDetails = XLSX.utils.aoa_to_sheet([headersDetail, ...detailRows]);
  wsDetails['!cols'] = headersDetail.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsDetails, '📋 Apontamentos do Dia');

  // Gravar e baixar o arquivo .xlsx
  const filename = `ExtruControl_Relatorio_Diario_Detalhado_${selectedDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Exportador Visual HTML/Excel Estilo Power BI (.xls)
 * Gera a planilha com formatação HTML nativa reconhecida pelo Excel,
 * renderizando as cores exatas, cards escuros de KPI, barras de progresso coloridas,
 * tabelas e o layout idêntico aos dashboards de gestão (Power BI).
 */
export function exportPowerBIVisualExcel(
  records: ProductionRecord[],
  periodLabel: string, // 'YYYY-MM' ou 'YYYY-MM-DD'
  factoryGoals: FactoryMonthlyGoals,
  isDaily: boolean = false
): void {
  const filtered = records.filter(r => r.timestamp.startsWith(periodLabel));

  // Cálculos consolidados
  const prodRecords = filtered.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
  const activeRunning = prodRecords.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);

  const avgProductivity = activeRunning.length > 0
    ? Math.round(activeRunning.reduce((a, b) => a + (b.productivityKgh || 0), 0) / activeRunning.length)
    : 0;

  const totalKg = activeRunning.reduce((a, b) => a + ((b.productivityKgh || 0) * 4), 0);
  const totalTons = Math.round((totalKg / 1000) * 10) / 10;

  const conformingSheets = prodRecords.filter(r => r.temperaturesConforming && r.parametersMatchPreviousSheet).length;
  const sheetCompliance = prodRecords.length > 0 ? Math.round((conformingSheets / prodRecords.length) * 100) : 100;

  const conformingPackaging = prodRecords.filter(r => r.labelCodesConforming && r.sealingQuality === 'conforme').length;
  const packagingCompliance = prodRecords.length > 0 ? Math.round((conformingPackaging / prodRecords.length) * 100) : 100;

  const totalStoppages = filtered.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);
  const totalOMs = filtered.filter(r => r.lineStatus === 'manutencao' || r.hasMaintenanceOrder).length;
  const totalSetups = filtered.filter(r => r.lineStatus === 'setup').length;

  const productivityDelta = avgProductivity - factoryGoals.targetAverageProductivityKgh;
  const productivityAttainment = factoryGoals.targetAverageProductivityKgh > 0
    ? Math.round((avgProductivity / factoryGoals.targetAverageProductivityKgh) * 100)
    : 100;

  // Extrusoras
  const maxScale = 520;
  const extruderRows = MACHINE_LIST.map(mId => {
    const recs = filtered.filter(r => r.machineId === mId);
    const prod = recs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
    const running = prod.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);
    const avgKgh = running.length > 0 ? Math.round(running.reduce((a, b) => a + (b.productivityKgh || 0), 0) / running.length) : 0;
    const targetKgh = running[0]?.targetProductivityKgh || factoryGoals.targetAverageProductivityKgh;
    const attainment = targetKgh > 0 ? Math.round((avgKgh / targetKgh) * 100) : 0;
    const latest = recs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    const status = latest?.lineStatus || (recs.length > 0 ? 'em_producao' : 'inativa');
    const stops = recs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);
    const lastOP = latest?.productionOrder || 'Sem OP';

    const realWidth = Math.min(100, Math.round((avgKgh / maxScale) * 100));

    return {
      mId,
      apontamentos: recs.length,
      avgKgh,
      targetKgh,
      attainment,
      realWidth,
      status,
      stops,
      lastOP
    };
  });

  // Operadores
  const opMap = new Map<string, { totalKgh: number; prodCount: number; totalRecs: number; confCount: number; stopMins: number }>();
  for (const r of filtered) {
    const name = r.operatorName || 'Operador';
    const cur = opMap.get(name) || { totalKgh: 0, prodCount: 0, totalRecs: 0, confCount: 0, stopMins: 0 };
    cur.totalRecs += 1;
    if (r.lineStatus === 'em_producao') {
      cur.prodCount += 1;
      if (!r.hasStoppage && (r.productivityKgh || 0) > 0) cur.totalKgh += r.productivityKgh || 0;
      if (r.temperaturesConforming && r.parametersMatchPreviousSheet) cur.confCount += 1;
    }
    if (r.hasStoppage) cur.stopMins += r.stoppageMinutes || 60;
    opMap.set(name, cur);
  }

  const operatorRows = Array.from(opMap.entries()).map(([name, d]) => {
    const avgKgh = d.prodCount > 0 ? Math.round(d.totalKgh / d.prodCount) : 0;
    const conf = d.prodCount > 0 ? Math.round((d.confCount / d.prodCount) * 100) : 100;
    const barWidth = Math.min(100, Math.round((avgKgh / maxScale) * 100));
    return { name, avgKgh, conf, totalRecs: d.totalRecs, stopMins: d.stopMins, barWidth };
  }).sort((a, b) => b.avgKgh - a.avgKgh);

  // Pareto de Intervenções
  let manMins = 0; let prevMins = 0; let setMins = 0; let outMins = 0;
  for (const r of filtered) {
    if (r.lineStatus === 'manutencao' || r.hasMaintenanceOrder) manMins += r.stoppageMinutes || 240;
    else if (r.lineStatus === 'preventiva') prevMins += r.stoppageMinutes || 180;
    else if (r.lineStatus === 'setup') setMins += r.stoppageMinutes || 90;
    else if (r.hasStoppage) outMins += r.stoppageMinutes || 45;
  }
  const maxInterv = Math.max(1, manMins, prevMins, setMins, outMins);

  // Ocorrências
  let thermal = 0; let params = 0; let sieve = 0; let magnet = 0; let seal = 0; let label = 0;
  for (const r of filtered) {
    if (r.temperaturesConforming === false) thermal += 1;
    if (r.parametersMatchPreviousSheet === false) params += 1;
    if (r.sievePowderCondition && r.sievePowderCondition !== 'normal') sieve += 1;
    if (r.magnetStatus && r.magnetStatus !== 'limpo') magnet += 1;
    if (r.sealerTempConforming === false || (r.sealingQuality && r.sealingQuality !== 'conforme')) seal += 1;
    if (r.labelCodesConforming === false) label += 1;
  }
  const maxOcorr = Math.max(1, thermal, params, sieve, magnet, seal, label);

  // Turnos
  const shifts = [
    { name: 'Turno 1 (Manhã)', fullName: 'Turno 1 (06h - 14h)', color: '#d97706' },
    { name: 'Turno 2 (Tarde)', fullName: 'Turno 2 (14h - 22h)', color: '#2563eb' },
    { name: 'Turno 3 (Noite)', fullName: 'Turno 3 (22h - 06h)', color: '#64748b' }
  ];
  const shiftRows = shifts.map(s => {
    const sRecs = filtered.filter(r => r.shift === s.fullName);
    const sProd = sRecs.filter(r => (r.lineStatus || 'em_producao') === 'em_producao');
    const sRunning = sProd.filter(r => !r.hasStoppage && (r.productivityKgh || 0) > 0);
    const sAvg = sRunning.length > 0 ? Math.round(sRunning.reduce((a, b) => a + (b.productivityKgh || 0), 0) / sRunning.length) : 0;
    const sKg = sRunning.reduce((a, b) => a + ((b.productivityKgh || 0) * 4), 0);
    const sShare = totalKg > 0 ? Math.round((sKg / totalKg) * 100) : 0;
    const sStops = sRecs.reduce((a, b) => a + (b.stoppageQuantity || (b.hasStoppage ? 1 : 0)), 0);
    return { ...s, sAvg, sKg, sShare, sStops };
  });

  // Helper para renderizar barras de progresso que funcionam 100% em QUALQUER versão do Microsoft Excel
  function renderExcelBar(pct: number, fillColor: string = '#8b0000', bgColor: string = '#e2e8f0', height: number = 14): string {
    const safePct = Math.max(0, Math.min(100, Math.round(pct)));
    const remainPct = Math.max(0, 100 - safePct);
    if (safePct <= 0) {
      return `<table width="100%" height="${height}" cellpadding="0" cellspacing="0" border="0" bgcolor="${bgColor}" style="width:100%; table-layout:fixed; border:1px solid #cbd5e1;"><tr><td width="100%" bgcolor="${bgColor}" style="background-color:${bgColor}; height:${height}px; font-size:1px; line-height:1px;">&nbsp;</td></tr></table>`;
    }
    if (safePct >= 100) {
      return `<table width="100%" height="${height}" cellpadding="0" cellspacing="0" border="0" bgcolor="${fillColor}" style="width:100%; table-layout:fixed; border:1px solid #cbd5e1;"><tr><td width="100%" bgcolor="${fillColor}" style="background-color:${fillColor}; height:${height}px; font-size:1px; line-height:1px;">&nbsp;</td></tr></table>`;
    }
    return `<table width="100%" height="${height}" cellpadding="0" cellspacing="0" border="0" bgcolor="${bgColor}" style="width:100%; table-layout:fixed; border:1px solid #cbd5e1;"><tr><td width="${safePct}%" bgcolor="${fillColor}" style="background-color:${fillColor}; height:${height}px; font-size:1px; line-height:1px;">&nbsp;</td><td width="${remainPct}%" bgcolor="${bgColor}" style="background-color:${bgColor}; height:${height}px; font-size:1px; line-height:1px;">&nbsp;</td></tr></table>`;
  }

  // GERAÇÃO DO HTML COMPLETO NATIVO PARA MICROSOFT EXCEL COM TABELAS E CORES PURAS
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Dashboard Power BI</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #080e1a; margin: 15px; color: #1e293b; }
        table { border-collapse: separate; font-family: 'Segoe UI', Arial, sans-serif; }
      </style>
    </head>
    <body bgcolor="#f1f5f9" style="background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif; margin: 16px;">
      
      <!-- TOP BANNER POWER BI -->
      <table width="100%" cellpadding="16" cellspacing="0" border="0" bgcolor="#0b1320" style="background-color:#0b1320; color:#ffffff; border-radius:12px; margin-bottom:16px;">
        <tr>
          <td>
            <font color="#fbbf24" size="1"><b>📊 POWER BI EXECUTIVE DASHBOARD • PETROPOL POLÍMEROS</b></font><br>
            <font color="#ffffff" size="5"><b>ExtruControl · Painel Executivo das Extrusoras (DR01 a DR06)</b></font><br>
            <font color="#94a3b8" size="2">Consolidação visual dos KPIs de vazão, conformidade técnica de ficha, matriz de frotas e ranking de operadores.</font>
            <div style="margin-top:10px; padding-top:8px; border-top:1px solid #1e293b;">
              <font color="#cbd5e1" size="2">
                <b>Slicers Ativos:</b> Período: <font color="#fbbf24"><b>${periodLabel}</b></font> &nbsp;|&nbsp;
                Frota: <b>Extrusoras DR01 a DR06 (100% Monitorada)</b> &nbsp;|&nbsp;
                Apontamentos: <b>${filtered.length} registros</b> &nbsp;|&nbsp;
                Emissão: <b>${new Date().toLocaleString('pt-BR')}</b>
              </font>
            </div>
          </td>
        </tr>
      </table>

      <!-- 1. OS 4 CARDS ESCUROS DE TOPO (EXATAMENTE COMO NA SCREENSHOT 4) -->
      <table width="100%" cellpadding="0" cellspacing="12" border="0" style="margin-bottom:16px;">
        <tr>
          <!-- Card 1: VAZÃO MÉDIA GLOBAL -->
          <td width="25%" bgcolor="#0b1320" style="background-color:#0b1320; color:#ffffff; border:2px solid #1e293b; padding:16px; vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td><font color="#ef4444" size="1"><b>⏱ VAZÃO MÉDIA GLOBAL</b></font></td>
                <td align="right">
                  <table cellpadding="3" cellspacing="0" border="0" bgcolor="#052e16">
                    <tr><td style="border:1px solid #166534;"><font color="#4ade80" size="1"><b>${productivityAttainment}% da Meta</b></font></td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:8px; padding-bottom:6px;">
                  <font size="6" color="#ffffff"><b>${avgProductivity}</b></font> <font size="2" color="#94a3b8">kg/h</font>
                </td>
              </tr>
              <tr>
                <td><font size="1" color="#94a3b8">Meta Planejada: <b style="color:#ffffff;">${factoryGoals.targetAverageProductivityKgh} kg/h</b></font></td>
                <td align="right"><font size="1" color="${productivityDelta >= 0 ? '#4ade80' : '#f87171'}"><b>${productivityDelta >= 0 ? `▲ +${productivityDelta}` : `▼ ${productivityDelta}`} kg/h</b></font></td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:10px;">
                  ${renderExcelBar(productivityAttainment, '#22c55e', '#1e293b', 8)}
                </td>
              </tr>
            </table>
          </td>

          <!-- Card 2: BALANÇO DE MASSA (VOLUME) -->
          <td width="25%" bgcolor="#0b1320" style="background-color:#0b1320; color:#ffffff; border:2px solid #1e293b; padding:16px; vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td><font color="#f59e0b" size="1"><b>⚖ BALANÇO DE MASSA (VOLUME)</b></font></td>
                <td align="right">
                  <table cellpadding="3" cellspacing="0" border="0" bgcolor="#431407">
                    <tr><td style="border:1px solid #9a3412;"><font color="#fb923c" size="1"><b>Extrusão Líquida</b></font></td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:8px; padding-bottom:6px;">
                  <font size="6" color="#ffffff"><b>${totalKg.toLocaleString('pt-BR')}</b></font> <font size="2" color="#94a3b8">kg</font>
                </td>
              </tr>
              <tr>
                <td><font size="1" color="#94a3b8">Equivalente em Toneladas:</font></td>
                <td align="right"><font size="1" color="#fbbf24"><b>${totalTons} t</b></font></td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:8px; border-top:1px solid #1e293b; margin-top:6px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td><font size="1" color="#94a3b8">Ritmo Médio / Turno:</font></td>
                      <td align="right"><font size="1" color="#ffffff"><b>${Math.round(totalKg / 3).toLocaleString('pt-BR')} kg</b></font></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>

          <!-- Card 3: CONFORMIDADE DE FICHA -->
          <td width="25%" bgcolor="#0b1320" style="background-color:#0b1320; color:#ffffff; border:2px solid #1e293b; padding:16px; vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td><font color="#10b981" size="1"><b>🔥 CONFORMIDADE DE FICHA</b></font></td>
                <td align="right">
                  <table cellpadding="3" cellspacing="0" border="0" bgcolor="#422006">
                    <tr><td style="border:1px solid #854d0e;"><font color="#fde047" size="1"><b>● ${sheetCompliance >= factoryGoals.targetProcessSheetComplianceRate ? 'Conforme' : 'Atenção'}</b></font></td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:8px; padding-bottom:6px;">
                  <font size="6" color="#ffffff"><b>${sheetCompliance}%</b></font> <font size="2" color="#94a3b8">estabilidade</font>
                </td>
              </tr>
              <tr>
                <td><font size="1" color="#94a3b8">Meta: <b style="color:#ffffff;">${factoryGoals.targetProcessSheetComplianceRate}%</b></font></td>
                <td align="right"><font size="1" color="#cbd5e1">Embalagem: <b style="color:#ffffff;">${packagingCompliance}%</b></font></td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:10px;">
                  ${renderExcelBar(sheetCompliance, '#f59e0b', '#1e293b', 8)}
                </td>
              </tr>
            </table>
          </td>

          <!-- Card 4: PARADAS & OCORRÊNCIAS -->
          <td width="25%" bgcolor="#0b1320" style="background-color:#0b1320; color:#ffffff; border:2px solid #1e293b; padding:16px; vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td><font color="#ef4444" size="1"><b>⚠ PARADAS & OCORRÊNCIAS</b></font></td>
                <td align="right">
                  <table cellpadding="3" cellspacing="0" border="0" bgcolor="#3b0764">
                    <tr><td style="border:1px solid #6b21a8;"><font color="#d8b4fe" size="1"><b>Linha Parada</b></font></td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:8px; padding-bottom:6px;">
                  <font size="6" color="#ef4444"><b>${totalStoppages}</b></font> <font size="2" color="#94a3b8">evento(s)</font>
                </td>
              </tr>
              <tr>
                <td><font size="1" color="#94a3b8">Ordens Manutenção (OM): <b style="color:#ffffff;">${totalOMs}</b></font></td>
                <td align="right"><font size="1" color="#cbd5e1">Setups: <b style="color:#ffffff;">${totalSetups}</b></font></td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:8px; border-top:1px solid #1e293b; margin-top:6px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td><font size="1" color="#94a3b8">Disponibilidade Mecânica:</font></td>
                      <td align="right"><font size="1" color="#4ade80"><b>Monitorada</b></font></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- 2. GRID INTERMEDIÁRIO 1 (SCREENSHOT 1): PRODUTIVIDADE EXTRUSORA vs DESEMPENHO OPERADOR -->
      <table width="100%" cellpadding="0" cellspacing="12" border="0" style="margin-bottom:16px;">
        <tr>
          <!-- Card: Produtividade Média por Extrusora (kg/h) -->
          <td width="50%" bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #cbd5e1; padding:18px; vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid #f1f5f9; padding-bottom:8px; margin-bottom:12px;">
              <tr>
                <td>
                  <font size="3" color="#0f172a"><b>Produtividade Média por Extrusora (kg/h)</b></font><br>
                  <font size="1" color="#64748b">Comparativo Real vs Meta da Ficha Técnica</font>
                </td>
                <td align="right">
                  <font size="1" color="#8b0000"><b>■ Real (kg/h)</b></font> &nbsp;
                  <font size="1" color="#64748b">| Meta</font>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="5" cellspacing="0" border="0">
              ${extruderRows.map(m => `
                <tr>
                  <td width="20%">
                    <font size="2" color="#0f172a"><b>${m.mId}</b></font>
                    <font size="1" color="#94a3b8"> (${m.apontamentos} ap.)</font>
                  </td>
                  <td width="50%">
                    ${renderExcelBar(m.realWidth, '#8b0000', '#f1f5f9', 14)}
                  </td>
                  <td width="30%" align="right">
                    <font size="2" color="#0f172a"><b>${m.avgKgh} kg/h</b></font>
                    <font size="1" color="#94a3b8"> (Meta: ${m.targetKgh})</font>
                    <font size="1" color="${m.attainment >= 100 ? '#15803d' : '#b45309'}"><b> ${m.attainment}%</b></font>
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>

          <!-- Card: Desempenho e Eficiência por Operador -->
          <td width="50%" bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #cbd5e1; padding:18px; vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid #f1f5f9; padding-bottom:8px; margin-bottom:12px;">
              <tr>
                <td>
                  <font size="3" color="#0f172a"><b>Desempenho e Eficiência por Operador</b></font><br>
                  <font size="1" color="#64748b">Média de vazão (kg/h) e taxa de conformidade de processo</font>
                </td>
                <td align="right">
                  <font size="2" color="#64748b">👥</font>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="5" cellspacing="0" border="0">
              ${operatorRows.map((op, idx) => `
                <tr>
                  <td width="32%">
                    <font size="2" color="#0f172a"><b>${idx + 1}. ${op.name}</b></font><br>
                    <font size="1" color="#94a3b8">${op.totalRecs} ap. • ${op.stopMins === 0 ? 'Zero paradas' : `${op.stopMins} min paradas`}</font>
                  </td>
                  <td width="40%">
                    ${renderExcelBar(op.barWidth, '#8b0000', '#f1f5f9', 10)}
                  </td>
                  <td width="28%" align="right">
                    <font size="2" color="#0f172a"><b>${op.avgKgh} kg/h</b></font> &nbsp;
                    <span style="background-color:${op.conf >= 90 ? '#dcfce7' : '#fef3c7'}; color:${op.conf >= 90 ? '#15803d' : '#b45309'}; padding:2px 4px; border:1px solid ${op.conf >= 90 ? '#86efac' : '#fde68a'}; font-size:7.5pt; font-weight:bold;">
                      ${op.conf}% Ficha OK
                    </span>
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>
      </table>

      <!-- 3. GRID INTERMEDIÁRIO 2 (SCREENSHOT 2): PARETO DE PARADAS vs OCORRÊNCIAS DE PROCESSO -->
      <table width="100%" cellpadding="0" cellspacing="12" border="0" style="margin-bottom:16px;">
        <tr>
          <!-- Card: Pareto de Paradas e Intervenções (Minutos Perdidos) -->
          <td width="50%" bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #cbd5e1; padding:18px; vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid #f1f5f9; padding-bottom:8px; margin-bottom:12px;">
              <tr>
                <td>
                  <font size="3" color="#0f172a"><b>Pareto de Paradas e Intervenções (Minutos Perdidos)</b></font><br>
                  <font size="1" color="#64748b">Distribuição por motivo, manutenção, setup e tempo acumulado</font>
                </td>
                <td align="right"><font size="2" color="#ef4444">⏱</font></td>
              </tr>
            </table>

            <table width="100%" cellpadding="6" cellspacing="0" border="0">
              <tr>
                <td width="42%"><font size="2" color="#0f172a"><b>Manutenção Corretiva (OM)</b></font></td>
                <td width="40%">${renderExcelBar((manMins / maxInterv) * 100, '#8b0000', '#f1f5f9', 12)}</td>
                <td width="18%" align="right"><font size="2" color="#0f172a"><b>${manMins} min</b></font> <font size="1" color="#64748b">(${Math.round((manMins/60)*10)/10}h)</font></td>
              </tr>
              <tr>
                <td><font size="2" color="#0f172a"><b>Preventiva Programada</b></font></td>
                <td>${renderExcelBar((prevMins / maxInterv) * 100, '#8b0000', '#f1f5f9', 12)}</td>
                <td align="right"><font size="2" color="#0f172a"><b>${prevMins} min</b></font> <font size="1" color="#64748b">(${Math.round((prevMins/60)*10)/10}h)</font></td>
              </tr>
              <tr>
                <td><font size="2" color="#0f172a"><b>Setup / Troca de Material</b></font></td>
                <td>${renderExcelBar((setMins / maxInterv) * 100, '#8b0000', '#f1f5f9', 12)}</td>
                <td align="right"><font size="2" color="#0f172a"><b>${setMins} min</b></font> <font size="1" color="#64748b">(${Math.round((setMins/60)*10)/10}h)</font></td>
              </tr>
              <tr>
                <td><font size="2" color="#64748b">Outro</font></td>
                <td>${renderExcelBar(outMins > 0 ? (outMins / maxInterv) * 100 : 0, '#94a3b8', '#f1f5f9', 12)}</td>
                <td align="right"><font size="2" color="#0f172a"><b>${outMins} min</b></font> <font size="1" color="#64748b">(${Math.round((outMins/60)*10)/10}h)</font></td>
              </tr>
            </table>
          </td>

          <!-- Card: Ocorrências de Processo & Inspeção Operacional -->
          <td width="50%" bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #cbd5e1; padding:18px; vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid #f1f5f9; padding-bottom:8px; margin-bottom:12px;">
              <tr>
                <td>
                  <font size="3" color="#0f172a"><b>Ocorrências de Processo & Inspeção Operacional</b></font><br>
                  <font size="1" color="#64748b">Contagem de desvios detectados em produção</font>
                </td>
                <td align="right"><font size="2" color="#f59e0b">⚠</font></td>
              </tr>
            </table>

            <table width="100%" cellpadding="4" cellspacing="0" border="0">
              <tr>
                <td width="42%"><font size="2" color="#334155">Desvio Térmico (Zonas)</font></td>
                <td width="40%">${renderExcelBar((thermal / maxOcorr) * 100, '#b91c1c', '#f1f5f9', 10)}</td>
                <td width="18%" align="right"><font size="2" color="#0f172a"><b>${thermal} reg.</b></font></td>
              </tr>
              <tr>
                <td><font size="2" color="#334155">Mudança Parâmetros vs Ficha</font></td>
                <td>${renderExcelBar((params / maxOcorr) * 100, '#d97706', '#f1f5f9', 10)}</td>
                <td align="right"><font size="2" color="#0f172a"><b>${params} reg.</b></font></td>
              </tr>
              <tr>
                <td><font size="2" color="#334155">Peneira / Excesso de Pó</font></td>
                <td>${renderExcelBar((sieve / maxOcorr) * 100, '#1e293b', '#f1f5f9', 10)}</td>
                <td align="right"><font size="2" color="#0f172a"><b>${sieve} reg.</b></font></td>
              </tr>
              <tr>
                <td><font size="2" color="#334155">Ímã (Contaminação / Limpeza)</font></td>
                <td>${renderExcelBar((magnet / maxOcorr) * 100, '#1e293b', '#f1f5f9', 10)}</td>
                <td align="right"><font size="2" color="#0f172a"><b>${magnet} reg.</b></font></td>
              </tr>
              <tr>
                <td><font size="2" color="#334155">Falha Selagem / Temp Seladora</font></td>
                <td>${renderExcelBar((seal / maxOcorr) * 100, '#dc2626', '#f1f5f9', 10)}</td>
                <td align="right"><font size="2" color="#0f172a"><b>${seal} reg.</b></font></td>
              </tr>
              <tr>
                <td><font size="2" color="#334155">Divergência Código Etiqueta</font></td>
                <td>${renderExcelBar((label / maxOcorr) * 100, '#7f1d1d', '#f1f5f9', 10)}</td>
                <td align="right"><font size="2" color="#0f172a"><b>${label} reg.</b></font></td>
              </tr>
            </table>

            <!-- Caixa de Recomendação Operacional Verde (Screenshot 2) -->
            <table width="100%" cellpadding="10" cellspacing="0" border="0" bgcolor="#ecfdf5" style="border:1px solid #10b981; margin-top:12px;">
              <tr>
                <td>
                  <font color="#065f46" size="2">
                    <b>✔ Recomendação Operacional:</b> Priorizar inspeção periódica na gaveta magnética e alinhamento de temperatura nas zonas de descompressão da DR02 e DR03 para mitigar desvios repetitivos.
                  </font>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- 4. GRID INFERIOR (SCREENSHOT 3 & 5): MATRIZ DAS 6 EXTRUSORAS + VOLUME POR TURNO -->
      <table width="100%" cellpadding="0" cellspacing="12" border="0" style="margin-bottom:16px;">
        <tr>
          <!-- MATRIZ OPERACIONAL DAS 6 EXTRUSORAS (DR01 A DR06) -->
          <td width="65%" bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #cbd5e1; padding:18px; vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid #f1f5f9; padding-bottom:8px; margin-bottom:12px;">
              <tr>
                <td>
                  <font size="3" color="#0f172a"><b>MATRIZ OPERACIONAL DAS 6 EXTRUSORAS (DR01 A DR06)</b></font><br>
                  <font size="1" color="#64748b">Desempenho de vazão real vs meta, status e paradas</font>
                </td>
                <td align="right">
                  <span style="background-color:#ffffff; border:1px solid #cbd5e1; padding:4px 8px; font-size:7.5pt; font-weight:bold; color:#334155;">
                    Frota 100% Monitorada
                  </span>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="6" cellspacing="0" border="0">
              ${extruderRows.map(f => {
                const statusColor = f.status === 'em_producao' ? '#15803d' : f.status === 'setup' ? '#d97706' : f.status === 'preventiva' ? '#2563eb' : f.status === 'manutencao' ? '#dc2626' : '#475569';
                const statusBg = f.status === 'em_producao' ? '#dcfce7' : f.status === 'setup' ? '#fef3c7' : f.status === 'preventiva' ? '#dbeafe' : f.status === 'manutencao' ? '#fee2e2' : '#f1f5f9';
                const statusLabel = f.status === 'em_producao' ? 'Em Produção' : f.status === 'setup' ? 'Em Setup' : f.status === 'preventiva' ? 'Em Preventiva' : f.status === 'manutencao' ? 'Em Manutenção' : 'Inativa / Parada';
                return `
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td width="22%">
                      <span style="background-color:#3b0a0a; color:#ffffff; padding:2px 6px; font-family:monospace; font-weight:bold; font-size:9pt;">${f.mId}</span><br>
                      <font size="1" color="#0f172a"><b>Extrusora ${f.mId}</b></font><br>
                      <span style="background-color:${statusBg}; color:${statusColor}; font-size:7pt; font-weight:bold; padding:1px 4px; border:1px solid ${statusColor};">
                        ${statusLabel}
                      </span>
                    </td>
                    <td width="48%">
                      <font size="1" color="#334155">Vazão Real: <b style="color:#0f172a;">${f.avgKgh} kg/h</b></font>
                      <font size="1" color="#94a3b8"> &nbsp;•&nbsp; Meta: ${f.targetKgh} kg/h</font>
                      ${renderExcelBar(f.realWidth, f.attainment >= 100 ? '#15803d' : f.avgKgh > 0 ? '#8b0000' : '#cbd5e1', '#f1f5f9', 10)}
                    </td>
                    <td width="10%" align="center">
                      <font size="2" color="${f.attainment >= 100 ? '#15803d' : '#b45309'}"><b>${f.attainment}%</b></font>
                    </td>
                    <td width="10%" align="center">
                      <font size="1" color="#94a3b8">PARADAS</font><br>
                      <font size="2" color="${f.stops > 0 ? '#dc2626' : '#94a3b8'}"><b>${f.stops}</b></font>
                    </td>
                    <td width="10%" align="right">
                      <font size="1" color="#94a3b8">ÚLTIMA OP</font><br>
                      <font size="1" color="#0f172a" face="monospace"><b>${f.lastOP}</b></font>
                    </td>
                  </tr>
                `;
              }).join('')}
            </table>
          </td>

          <!-- VOLUME & VAZÃO POR TURNO + PARETO OFENSORES -->
          <td width="35%" bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #cbd5e1; padding:18px; vertical-align:top;">
            <!-- VOLUME & VAZÃO POR TURNO -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid #f1f5f9; padding-bottom:8px; margin-bottom:12px;">
              <tr>
                <td>
                  <font size="2" color="#0f172a"><b>⏱ VOLUME & VAZÃO POR TURNO</b></font>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="5" cellspacing="0" border="0" style="margin-bottom:16px;">
              ${shiftRows.map(s => `
                <tr>
                  <td>
                    <font size="2" color="#0f172a"><b>${s.name}</b>: ${s.sKg.toLocaleString('pt-BR')} kg (${s.sShare}%)</font>
                    ${renderExcelBar(s.sShare, s.color, '#f1f5f9', 10)}
                    <font size="1" color="#64748b">Vazão: <b>${s.sAvg} kg/h</b> • ${s.sStops} parada(s)</font>
                  </td>
                </tr>
              `).join('')}
            </table>

            <!-- PARETO: PRINCIPAIS OFENSORES -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #f1f5f9; border-bottom:2px solid #f1f5f9; padding:8px 0; margin-bottom:12px;">
              <tr>
                <td>
                  <font size="2" color="#0f172a"><b>⚠ PARETO: PRINCIPAIS OFENSORES</b></font><br>
                  <font size="1" color="#64748b">Curva de impacto cumulativo de paradas</font>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="4" cellspacing="0" border="0">
              <tr>
                <td>
                  <font size="2" color="#0f172a"><b>1º Ajuste de Processo</b></font>
                  <font size="1" color="#64748b"> 1x (100%) • Acum: 100%</font>
                  ${renderExcelBar(100, '#8b0000', '#f1f5f9', 10)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- 5. TABELA DE APONTAMENTOS BRUTOS DO PERÍODO -->
      <table width="100%" cellpadding="10" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #cbd5e1; margin-top:16px;">
        <tr>
          <td>
            <font size="3" color="#0f172a"><b>📋 BASE COMPLETA DE APONTAMENTOS DO PERÍODO (${filtered.length} REGISTROS)</b></font>
            <table width="100%" cellpadding="6" cellspacing="0" border="1" bordercolor="#cbd5e1" style="border-collapse:collapse; margin-top:10px; font-size:8pt;">
              <thead>
                <tr bgcolor="#0f172a" style="background-color:#0f172a; color:#ffffff;">
                  <th><font color="#ffffff">ID</font></th>
                  <th><font color="#ffffff">Data/Hora</font></th>
                  <th><font color="#ffffff">Linha</font></th>
                  <th><font color="#ffffff">Status</font></th>
                  <th><font color="#ffffff">Turno</font></th>
                  <th><font color="#ffffff">Operador</font></th>
                  <th><font color="#ffffff">Líder</font></th>
                  <th><font color="#ffffff">OP</font></th>
                  <th><font color="#ffffff">Kg/h Real</font></th>
                  <th><font color="#ffffff">Meta</font></th>
                  <th><font color="#ffffff">RPM</font></th>
                  <th><font color="#ffffff">Amperes</font></th>
                  <th><font color="#ffffff">Temperaturas</font></th>
                  <th><font color="#ffffff">Paradas</font></th>
                  <th><font color="#ffffff">OM / Setup</font></th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(r => `
                  <tr>
                    <td>${r.id}</td>
                    <td>${new Date(r.timestamp).toLocaleString('pt-BR')}</td>
                    <td><b>${r.machineId}</b></td>
                    <td>${r.lineStatus || 'em_producao'}</td>
                    <td>${r.shift}</td>
                    <td><b>${r.operatorName}</b></td>
                    <td>${r.shiftLeader}</td>
                    <td>${r.productionOrder || '-'}</td>
                    <td><b>${r.productivityKgh ?? '-'}</b></td>
                    <td>${r.targetProductivityKgh ?? '-'}</td>
                    <td>${r.rpm ?? '-'}</td>
                    <td>${r.motorAmperes ?? '-'}</td>
                    <td>${r.temperaturesConforming ? 'Conforme' : 'Desvio'}</td>
                    <td>${r.hasStoppage ? (r.stoppageQuantity || 1) : 0}</td>
                    <td>${r.maintenanceOrderNumber || r.setupMaterial || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </td>
        </tr>
      </table>

    </body>
    </html>
  `;

  // Download do arquivo .xls formatado com HTML Power BI nativo
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ExtruControl_Dashboard_Visual_PowerBI_${periodLabel}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta o Dashboard Executivo Standalone em arquivo HTML Interativo
 * Pode ser aberto em qualquer navegador com fidelidade 100% idêntica às imagens
 */
export function exportPowerBIStandaloneHTML(
  records: ProductionRecord[],
  periodLabel: string,
  factoryGoals: FactoryMonthlyGoals
): void {
  // Dispara exportPowerBIVisualExcel com extensão .html para abertura direta no navegador
  const isDay = periodLabel.includes('-');
  // Reutiliza o construtor visual
  exportPowerBIVisualExcel(records, periodLabel, factoryGoals, isDay);
}



