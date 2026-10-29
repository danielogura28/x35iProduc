import React from 'react';
import { 
  Factory, 
  PlusCircle, 
  LayoutDashboard, 
  History, 
  BarChart3, 
  FileText,
  Printer,
  Download,
  Lock,
  Unlock,
  HardDrive,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { MachineId } from '../types/production';
import { MAX_STORAGE_RECORDS } from '../utils/storage';

interface HeaderProps {
  activeTab: 'monitor' | 'entry' | 'history' | 'charts' | 'report';
  onTabSelect: (tab: 'monitor' | 'entry' | 'history' | 'charts' | 'report') => void;
  onNewEntryClick: (machineId?: MachineId) => void;
  onPrintReport?: () => void;
  onExportCsv?: () => void;
  isSupervisorActive: boolean;
  onLockSupervisor: () => void;
  onOpenStorageManager: () => void;
  recordsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabSelect,
  onNewEntryClick,
  onPrintReport,
  onExportCsv,
  isSupervisorActive,
  onLockSupervisor,
  onOpenStorageManager,
  recordsCount
}) => {
  const isFull = recordsCount >= MAX_STORAGE_RECORDS;
  const isNearFull = recordsCount >= MAX_STORAGE_RECORDS * 0.85;

  return (
    <header className="w-full bg-red-950 text-white border-b border-red-900 sticky top-0 z-40 shadow-md print:hidden">
      {/* TIER 1: BRAND + STATUS & SYSTEM ACTIONS (Memória, Gestão, Coleta/Imprimir) */}
      <div className="w-full border-b border-red-900/60 bg-red-950">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Wordmark & Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-700 flex items-center justify-center text-white shadow-inner shrink-0">
              <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <button 
              onClick={() => onTabSelect('monitor')}
              className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-red-200 transition-colors whitespace-nowrap cursor-pointer text-left flex items-baseline gap-1.5"
            >
              <span>ExtruControl</span>
              <span className="hidden sm:inline-block text-[10px] text-red-300 font-mono tracking-wider font-normal opacity-80">
                • PETROPOL
              </span>
            </button>
          </div>

          {/* Action Buttons: Storage, Supervisor Status & Primary Action */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Storage Capacity Indicator */}
            <button
              onClick={onOpenStorageManager}
              title={`Armazenamento: ${recordsCount} de ${MAX_STORAGE_RECORDS} registros (${((recordsCount / MAX_STORAGE_RECORDS) * 100).toFixed(1)}%). Clique para gerenciar ou liberar espaço.`}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] sm:text-xs font-mono font-medium flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isFull
                  ? 'bg-red-600 text-white border-red-500 animate-pulse'
                  : isNearFull
                  ? 'bg-amber-900/60 text-amber-200 border-amber-700 hover:bg-amber-900'
                  : 'bg-red-900/50 text-red-200 border-red-800/80 hover:bg-red-900'
              }`}
            >
              {isFull ? <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0" /> : <HardDrive className="w-3.5 h-3.5 text-red-300 shrink-0" />}
              <span className="hidden md:inline">Memória:</span>
              <span className="font-bold">{recordsCount}/{MAX_STORAGE_RECORDS}</span>
            </button>

            {/* Supervisor Status & Lock */}
            {isSupervisorActive ? (
              <div className="flex items-center gap-1 bg-red-900/70 border border-red-700 rounded-lg px-2 py-1 shrink-0">
                <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Gestão</span>
                </span>
                <button
                  onClick={onLockSupervisor}
                  title="Bloquear acesso de supervisão e voltar ao modo operador"
                  className="ml-1 p-1 text-red-200 hover:text-white rounded hover:bg-red-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onTabSelect('history')}
                title="Acesso restrito à supervisão"
                className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-red-900/40 border border-red-800/60 text-[11px] font-semibold text-red-200 hover:text-white hover:bg-red-900/80 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <Lock className="w-3.5 h-3.5 text-red-300 shrink-0" />
                <span className="hidden sm:inline">Gestão</span>
              </button>
            )}

            {/* Primary Action Button (Nova Coleta or Imprimir/CSV) */}
            {activeTab === 'report' ? (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {onExportCsv && (
                  <button
                    onClick={onExportCsv}
                    title="Exportar dados consolidados em planilha CSV"
                    className="px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-red-900/70 border border-red-800 rounded-lg hover:bg-red-800 transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">CSV</span>
                  </button>
                )}
                {onPrintReport && (
                  <button
                    onClick={onPrintReport}
                    className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-500 shadow-sm transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                    title="Imprimir relatório"
                  >
                    <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Imprimir</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNewEntryClick()}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-sm transition-all whitespace-nowrap flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Nova Coleta</span>
                <span className="xs:hidden">Coleta</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TIER 2: RESPONSIVE NAVIGATION TABS RIBBON */}
      {/* 100% responsivo para tablet, celular e desktop: sem quebras de layout e sem corte de fundo */}
      <nav className="w-full bg-red-950/95 overflow-x-auto scrollbar-none border-b border-red-900/40">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 py-1.5 min-w-max sm:min-w-0">
            <button
              onClick={() => onTabSelect('monitor')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'monitor'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'text-red-200/80 hover:text-white hover:bg-red-900/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Monitor</span>
              <span className="hidden md:inline">das Linhas</span>
            </button>

            <button
              onClick={() => onTabSelect('entry')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'entry'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'text-red-200/80 hover:text-white hover:bg-red-900/50'
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Apontamento</span>
              <span className="hidden md:inline">Operacional</span>
            </button>

            <button
              onClick={() => onTabSelect('history')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'text-red-200/80 hover:text-white hover:bg-red-900/50'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Histórico</span>
              {!isSupervisorActive && (
                <Lock className="w-3 h-3 text-red-300 opacity-90 shrink-0" />
              )}
            </button>

            <button
              onClick={() => onTabSelect('charts')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'charts'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'text-red-200/80 hover:text-white hover:bg-red-900/50'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Gráficos & Análise</span>
              {!isSupervisorActive && (
                <Lock className="w-3 h-3 text-red-300 opacity-90 shrink-0" />
              )}
            </button>

            <button
              onClick={() => onTabSelect('report')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'text-red-200/80 hover:text-white hover:bg-red-900/50'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Relatórios</span>
              <span className="hidden lg:inline">(Diário / Mensal)</span>
              {!isSupervisorActive && (
                <Lock className="w-3 h-3 text-red-300 opacity-90 shrink-0" />
              )}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};
