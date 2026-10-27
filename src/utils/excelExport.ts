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
 * Gera barra gráfica visual dentro de célula do Excel
 */
function generateVisualBar(value: number, max: number = 100, length: number = 16): string {
  if (max <= 0 || isNaN(value)) return '░'.repeat(length);
  const ratio = Math.max(0, Math.min(1.5, value / max));
  const filled = Math.min(length, Math.max(0, Math.round(ratio * length)));
  const empty = Math.max(0, length - filled);
  return '█'.repeat(filled) + '░'.repeat(empty);
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
  // ABA 1: PAINEL EXECUTIVO & GRÁFICOS VISUAIS (DASHBOARD RÁPIDO)
  // ========================================================================
  const dashboardRows: (string | number)[][] = [
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    ['   EXTRUCONTROL  •  PAINEL EXECUTIVO DE ANÁLISE GRÁFICA MENSAL  •  PETROPOL POLÍMEROS'],
    ['═══════════════════════════════════════════════════════════════════════════════════════════════════════'],
    ['Mês de Referência:', monthLabel, '', 'Emissão do Relatório:', new Date().toLocaleString('pt-BR')],
    ['Linhas Extrusoras:', 'DR01, DR02, DR03, DR04, DR05, DR06', '', 'Total de Apontamentos:', monthRecords.length],
    [''],
    ['┌───────────────────────────────────────────────────────────────────────────────────────────────────┐'],
    ['│ 1. SCORECARDS DE DESEMPENHO INDUSTRIAL (METAS vs REALIZADO)                                      │'],
    ['└───────────────────────────────────────────────────────────────────────────────────────────────────┘'],
    ['Indicador Principal', 'Valor Realizado', 'Meta Planejada', 'Gráfico Visual vs Meta', 'Status Executivo', 'Desvio'],
    [
      'Produtividade Média Global',
      `${avgProductivity} kg/h`,
      `${factoryGoals.targetAverageProductivityKgh} kg/h`,
      `${generateVisualBar(avgProductivity, factoryGoals.targetAverageProductivityKgh, 14)} ${Math.round((avgProductivity / (factoryGoals.targetAverageProductivityKgh || 1)) * 100)}%`,
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
  XLSX.utils.book_append_sheet(wb, wsDashboard, '📊 PAINEL GRÁFICO VISUAL');

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
