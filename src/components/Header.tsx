import React from 'react';
import { 
  Factory, 
  PlusCircle, 
  LayoutDashboard, 
  History, 
  BarChart3, 
  FileText,
  Printer,
  Download
} from 'lucide-react';
import { MachineId } from '../types/production';

interface HeaderProps {
  activeTab: 'monitor' | 'entry' | 'history' | 'charts' | 'report';
  setActiveTab: (tab: 'monitor' | 'entry' | 'history' | 'charts' | 'report') => void;
  onNewEntryClick: (machineId?: MachineId) => void;
  onPrintReport?: () => void;
  onExportCsv?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNewEntryClick,
  onPrintReport,
  onExportCsv
}) => {
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
            onClick={() => setActiveTab('monitor')}
            className="text-lg font-bold tracking-tight text-white hover:text-red-200 transition-colors whitespace-nowrap cursor-pointer text-left"
          >
            ExtruControl
          </button>
        </div>

        {/* Zone 2: Navigation Links (concise, single-line text links) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-2 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'monitor' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Monitor das Linhas</span>
          </button>

          <button
            onClick={() => setActiveTab('entry')}
            className={`flex items-center gap-2 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'entry' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apontamento Operacional</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'history' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-2 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'charts' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Gráficos & Análise</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'report' 
                ? 'border-red-400 text-white font-semibold' 
                : 'border-transparent text-red-200/80 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Relatório Mensal</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'report' ? (
            <div className="flex items-center gap-2">
              {onExportCsv && (
                <button
                  onClick={onExportCsv}
                  title="Exportar dados consolidados em planilha CSV"
                  className="px-3 py-2 text-xs font-medium text-slate-200 bg-red-900/70 border border-red-800 rounded-lg hover:bg-red-800 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
              )}
              {onPrintReport && (
                <button
                  onClick={onPrintReport}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-500 shadow-sm transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onNewEntryClick()}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-sm transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer"
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
          onClick={() => setActiveTab('monitor')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'monitor' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          Monitor DR
        </button>
        <button
          onClick={() => setActiveTab('entry')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'entry' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          Coleta
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'history' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          Histórico
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'charts' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          Gráficos
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'report' ? 'bg-red-800 text-white font-bold' : 'text-red-200'}`}
        >
          Relatório
        </button>
      </div>
    </header>
  );
};
