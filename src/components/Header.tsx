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
    <header className="bg-red-950 text-white border-b border-red-900 sticky top-0 z-40 shadow-md print:hidden">
      {/* 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Brand Wordmark (single element, no subtitle clutter) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-red-700 flex items-center justify-center text-white shadow-inner">
            <Factory className="w-5 h-5 text-white" />
          </div>
          <button 
            onClick={() => onTabSelect('monitor')}
            className="text-lg font-bold tracking-tight text-white hover:text-red-200 transition-colors whitespace-nowrap cursor-pointer text-left"
          >
            ExtruControl
          </button>
        </div>

        {/* Zone 2: Navigation Links (with Lock indicators for protected areas) */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          <button
            onClick={() => onTabSelect('monitor')}
            className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'monitor' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Monitor das Linhas</span>
          </button>

          <button
            onClick={() => onTabSelect('entry')}
            className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'entry' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apontamento Operacional</span>
          </button>

          <button
            onClick={() => onTabSelect('history')}
            className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'history' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico</span>
            {!isSupervisorActive && (
              <span title="Acesso protegido por senha (3535)">
                <Lock className="w-3 h-3 text-red-300 opacity-90" />
              </span>
            )}
          </button>

          <button
            onClick={() => onTabSelect('charts')}
            className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'charts' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Gráficos & Análise</span>
            {!isSupervisorActive && (
              <span title="Acesso protegido por senha (3535)">
                <Lock className="w-3 h-3 text-red-300 opacity-90" />
              </span>
            )}
          </button>

          <button
            onClick={() => onTabSelect('report')}
            className={`flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'report' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Relatório Mensal</span>
            {!isSupervisorActive && (
              <span title="Acesso protegido por senha (3535)">
                <Lock className="w-3 h-3 text-red-300 opacity-90" />
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Storage, Supervisor Auth & Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Storage Capacity Pill */}
          <button
            onClick={onOpenStorageManager}
            title={`Armazenamento: ${recordsCount} de ${MAX_STORAGE_RECORDS} registros (${((recordsCount / MAX_STORAGE_RECORDS) * 100).toFixed(1)}%). Clique para gerenciar ou liberar espaço.`}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isFull
                ? 'bg-red-600 text-white border-red-500 animate-pulse'
                : isNearFull
                ? 'bg-amber-900/60 text-amber-200 border-amber-700 hover:bg-amber-900'
                : 'bg-red-900/50 text-red-200 border-red-800/80 hover:bg-red-900'
            }`}
          >
            {isFull ? <AlertTriangle className="w-3.5 h-3.5 text-white" /> : <HardDrive className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Memória:</span>
            <span className="font-bold">{recordsCount}/{MAX_STORAGE_RECORDS}</span>
          </button>

          {/* Supervisor Status & Lock */}
          {isSupervisorActive ? (
            <div className="flex items-center gap-1 bg-red-900/70 border border-red-700 rounded-lg px-2 py-1">
              <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Gestão</span>
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
              title="Acesso de Supervisão (Senha 3535)"
              className="px-2.5 py-1.5 rounded-lg bg-red-900/40 border border-red-800/60 text-[11px] font-semibold text-red-200 hover:text-white hover:bg-red-900/80 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-red-300" />
              <span className="hidden xl:inline">Acesso Gestão</span>
            </button>
          )}

          {/* Primary Action Button */}
          {activeTab === 'report' ? (
            <div className="flex items-center gap-1.5">
              {onExportCsv && (
                <button
                  onClick={onExportCsv}
                  title="Exportar dados consolidados em planilha CSV"
                  className="px-2.5 py-2 text-xs font-medium text-slate-200 bg-red-900/70 border border-red-800 rounded-lg hover:bg-red-800 transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
              )}
              {onPrintReport && (
                <button
                  onClick={onPrintReport}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-500 shadow-sm transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onNewEntryClick()}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Coleta</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-bar on mobile viewports for quick tab navigation */}
      <div className="md:hidden border-t border-red-900/60 bg-red-950 px-3 py-2 flex items-center justify-between overflow-x-auto gap-2 text-xs">
        <button
          onClick={() => onTabSelect('monitor')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'monitor' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          Monitor DR
        </button>
        <button
          onClick={() => onTabSelect('entry')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'entry' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          Coleta
        </button>
        <button
          onClick={() => onTabSelect('history')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap flex items-center gap-1 ${activeTab === 'history' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          <span>Histórico</span>
          {!isSupervisorActive && <Lock className="w-3 h-3 text-red-300" />}
        </button>
        <button
          onClick={() => onTabSelect('charts')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap flex items-center gap-1 ${activeTab === 'charts' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          <span>Gráficos</span>
          {!isSupervisorActive && <Lock className="w-3 h-3 text-red-300" />}
        </button>
        <button
          onClick={() => onTabSelect('report')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap flex items-center gap-1 ${activeTab === 'report' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          <span>Relatório</span>
          {!isSupervisorActive && <Lock className="w-3 h-3 text-red-300" />}
        </button>
      </div>
    </header>
  );
};
