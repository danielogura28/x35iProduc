/**
 * Utilitários de manipulação de datas, semanas e períodos para relatórios do ExtruControl
 */

/**
 * Retorna o número da semana ISO 8601 (1 a 53) de uma data
 */
export function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Retorna o ano da semana ISO (que pode diferir nos primeiros/últimos dias do ano)
 */
export function getISOWeekYear(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  return target.getFullYear();
}

/**
 * Converte Date para string no formato ISO Week: 'YYYY-Www' (ex: '2026-W44')
 */
export function getWeekString(date: Date): string {
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Converte 'YYYY-Www' para datas inicial (segunda-feira) e final (domingo)
 */
export function getWeekDateRange(weekStr: string): { 
  start: string; 
  end: string; 
  label: string; 
  weekNum: number; 
  year: number 
} {
  try {
    const parts = weekStr.split('-W');
    const year = parseInt(parts[0], 10);
    const weekNum = parseInt(parts[1], 10);

    // 4 de janeiro sempre cai na semana 1 no padrão ISO
    const simple = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = simple.getUTCDay() || 7; // 1 = seg, 7 = dom
    
    // Segunda-feira da semana 1
    const week1Monday = new Date(simple);
    week1Monday.setUTCDate(simple.getUTCDate() - dayOfWeek + 1);

    // Segunda-feira da semana desejada
    const weekStart = new Date(week1Monday);
    weekStart.setUTCDate(week1Monday.getUTCDate() + (weekNum - 1) * 7);

    // Domingo da semana desejada
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    const start = weekStart.toISOString().slice(0, 10);
    const end = weekEnd.toISOString().slice(0, 10);

    const [sy, sm, sd] = start.split('-');
    const [ey, em, ed] = end.split('-');
    const label = `Semana ${weekNum} (${sd}/${sm} a ${ed}/${em}/${ey})`;

    return { start, end, label, weekNum, year };
  } catch {
    const today = new Date().toISOString().slice(0, 10);
    return { start: today, end: today, label: 'Semana Atual', weekNum: 1, year: 2026 };
  }
}

/**
 * Gera lista das últimas N semanas para alimentar os seletores
 */
export function getRecentWeeks(count: number = 8, baseDate: Date = new Date()): Array<{
  value: string;
  label: string;
  start: string;
  end: string;
  isCurrent?: boolean;
}> {
  const list: Array<{ value: string; label: string; start: string; end: string; isCurrent?: boolean }> = [];
  const currentWeekStr = getWeekString(baseDate);

  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - (i * 7));
    const weekStr = getWeekString(d);
    
    // Evitar duplicados se ocorrer
    if (!list.some(w => w.value === weekStr)) {
      const range = getWeekDateRange(weekStr);
      list.push({
        value: weekStr,
        label: `${range.label}${weekStr === currentWeekStr ? ' (Atual)' : ''}`,
        start: range.start,
        end: range.end,
        isCurrent: weekStr === currentWeekStr
      });
    }
  }

  return list;
}

/**
 * Retorna as semanas de um determinado mês (ex: '2026-10')
 */
export function getMonthWeeks(yearMonth: string): Array<{
  id: string;
  weekNumber: number;
  label: string;
  start: string;
  end: string;
}> {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = [
    { id: 'all', weekNumber: 0, label: 'Mês Completo (Todas as Semanas)', start: `${yearMonth}-01`, end: `${yearMonth}-${daysInMonth.toString().padStart(2, '0')}` },
    { id: 'w1', weekNumber: 1, label: 'Semana 1 (Dias 01 a 07)', start: `${yearMonth}-01`, end: `${yearMonth}-07` },
    { id: 'w2', weekNumber: 2, label: 'Semana 2 (Dias 08 a 14)', start: `${yearMonth}-08`, end: `${yearMonth}-14` },
    { id: 'w3', weekNumber: 3, label: 'Semana 3 (Dias 15 a 21)', start: `${yearMonth}-15`, end: `${yearMonth}-21` },
    { id: 'w4', weekNumber: 4, label: 'Semana 4 (Dias 22 a 28)', start: `${yearMonth}-22`, end: `${yearMonth}-28` }
  ];

  if (daysInMonth > 28) {
    weeks.push({
      id: 'w5',
      weekNumber: 5,
      label: `Semana 5 (Dias 29 a ${daysInMonth})`,
      start: `${yearMonth}-29`,
      end: `${yearMonth}-${daysInMonth.toString().padStart(2, '0')}`
    });
  }

  return weeks;
}

/**
 * Formata data ISO (YYYY-MM-DD) para padrão brasileiro DD/MM/AAAA
 */
export function formatDateBR(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

/**
 * Verifica se um timestamp pertence a um intervalo de datas [startIso, endIso]
 */
export function isTimestampInRange(timestamp: string, startIso: string, endIso: string): boolean {
  const dateOnly = timestamp.slice(0, 10);
  return dateOnly >= startIso && dateOnly <= endIso;
}
