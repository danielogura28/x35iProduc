import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LineMonitor } from './components/LineMonitor';
import { EntryForm } from './components/EntryForm';
import { HistoryTable } from './components/HistoryTable';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { MonthlyReport } from './components/MonthlyReport';
import { 
  ProductionRecord, 
  MachineId, 
  FactoryMonthlyGoals,
  Operator,
  ShiftLeader
} from './types/production';
import { 
  getProductionRecords, 
  saveProductionRecord, 
  deleteProductionRecord, 
  getFactoryGoals, 
  saveFactoryGoals,
  getOperators,
  saveOperators,
  getShiftLeaders,
  saveShiftLeaders,
  exportToCSV 
} from './utils/storage';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Factory, 
  BellRing,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'entry' | 'history' | 'charts' | 'report'>('monitor');
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [factoryGoals, setFactoryGoals] = useState<FactoryMonthlyGoals>(getFactoryGoals());
  const [operators, setOperators] = useState<Operator[]>(getOperators);
  const [shiftLeaders, setShiftLeaders] = useState<ShiftLeader[]>(getShiftLeaders);
  const [entryPreselectedMachine, setEntryPreselectedMachine] = useState<MachineId>('DR01');
  const [historyMachineFilter, setHistoryMachineFilter] = useState<MachineId | 'ALL'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Carregar dados na inicialização
  useEffect(() => {
    const loaded = getProductionRecords();
    setRecords(loaded);
    setOperators(getOperators());
    setShiftLeaders(getShiftLeaders());
  }, []);

  const handleUpdateOperators = (newOps: Operator[]) => {
    saveOperators(newOps);
    setOperators(newOps);
  };

  const handleUpdateShiftLeaders = (newLdrs: ShiftLeader[]) => {
    saveShiftLeaders(newLdrs);
    setShiftLeaders(newLdrs);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleSaveSuccess = (newRecord: ProductionRecord) => {
    saveProductionRecord(newRecord);
    setRecords(getProductionRecords());
    showToast(`Apontamento da linha ${newRecord.machineId} salvo com sucesso!`);
    setActiveTab('monitor');
  };

  const handleDeleteRecord = (id: string) => {
    deleteProductionRecord(id);
    setRecords(getProductionRecords());
    showToast('Apontamento excluído do registro.');
  };

  const handleUpdateGoals = (newGoals: FactoryMonthlyGoals) => {
    saveFactoryGoals(newGoals);
    setFactoryGoals(newGoals);
    showToast('Metas industriais mensais atualizadas com sucesso.');
  };

  const handleNewEntryClick = (machineId?: MachineId) => {
    if (machineId) {
      setEntryPreselectedMachine(machineId);
    }
    setActiveTab('entry');
  };

  const handleFilterHistoryByMachine = (machineId: MachineId) => {
    setHistoryMachineFilter(machineId);
    setActiveTab('history');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewEntryClick={handleNewEntryClick}
        onPrintReport={() => window.print()}
        onExportCsv={() => exportToCSV(records)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'monitor' && (
          <LineMonitor
            records={records}
            onSelectMachineForEntry={handleNewEntryClick}
            onFilterHistoryByMachine={handleFilterHistoryByMachine}
          />
        )}

        {activeTab === 'entry' && (
          <EntryForm
            initialMachine={entryPreselectedMachine}
            operators={operators}
            shiftLeaders={shiftLeaders}
            onUpdateOperators={handleUpdateOperators}
            onUpdateShiftLeaders={handleUpdateShiftLeaders}
            onSaveSuccess={handleSaveSuccess}
            onCancel={() => setActiveTab('monitor')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTable
            records={records}
            onDeleteRecord={handleDeleteRecord}
            selectedMachineFilter={historyMachineFilter}
            onClearMachineFilter={() => setHistoryMachineFilter('ALL')}
          />
        )}

        {activeTab === 'charts' && (
          <AnalyticsCharts
            records={records}
          />
        )}

        {activeTab === 'report' && (
          <MonthlyReport
            records={records}
            factoryGoals={factoryGoals}
            onUpdateGoals={handleUpdateGoals}
          />
        )}
      </main>

      {/* Industrial Footer (hidden when printing) */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-xs print:hidden mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-900 text-white flex items-center justify-center font-bold text-[10px]">
              EC
            </div>
            <span className="font-semibold text-slate-200">
              ExtruControl
            </span>
            <span className="text-slate-600">·</span>
            <span>Sistema Integrado de Chão de Fábrica e Controle de Extrusão (DR01 - DR06)</span>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span>6 Linhas Extrusoras Ativas</span>
            <span className="text-slate-700">·</span>
            <span>Controle Ficha & DOP</span>
            <span className="text-slate-700">·</span>
            <span>Auditoria e Fotos</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
