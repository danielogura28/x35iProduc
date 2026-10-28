import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LineMonitor } from './components/LineMonitor';
import { EntryForm } from './components/EntryForm';
import { HistoryTable } from './components/HistoryTable';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { MonthlyReport } from './components/MonthlyReport';
import { PinPromptModal } from './components/PinPromptModal';
import { StorageManagerModal } from './components/StorageManagerModal';
import { 
  ProductionRecord, 
  MachineId, 
  FactoryMonthlyGoals,
  Operator,
  ShiftLeader,
  GlobalLineStatuses
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
  getGlobalLineStatuses,
  saveGlobalLineStatuses,
  exportToCSV,
  MAX_STORAGE_RECORDS
} from './utils/storage';
import { 
  isSupervisorAuthenticated, 
  logoutSupervisor 
} from './utils/security';
import { 
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'entry' | 'history' | 'charts' | 'report'>('monitor');
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [factoryGoals, setFactoryGoals] = useState<FactoryMonthlyGoals>(getFactoryGoals());
  const [operators, setOperators] = useState<Operator[]>(getOperators);
  const [shiftLeaders, setShiftLeaders] = useState<ShiftLeader[]>(getShiftLeaders);
  const [globalLineStatuses, setGlobalLineStatuses] = useState<GlobalLineStatuses>(getGlobalLineStatuses);
  const [entryPreselectedMachine, setEntryPreselectedMachine] = useState<MachineId>('DR01');
  const [historyMachineFilter, setHistoryMachineFilter] = useState<MachineId | 'ALL'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados de Segurança e Autenticação
  const [isSupervisorActive, setIsSupervisorActive] = useState<boolean>(isSupervisorAuthenticated);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinModalTitle, setPinModalTitle] = useState<string>('Autenticação de Supervisão');
  const [pinModalDescription, setPinModalDescription] = useState<string>('Digite a senha de acesso da supervisão.');
  const [pendingAuthorizedAction, setPendingAuthorizedAction] = useState<(() => void) | null>(null);

  // Estado do Modal de Gestão de Armazenamento
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);

  // Carregar dados na inicialização
  useEffect(() => {
    const loaded = getProductionRecords();
    setRecords(loaded);
    setOperators(getOperators());
    setShiftLeaders(getShiftLeaders());
    setIsSupervisorActive(isSupervisorAuthenticated());
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
    const res = saveProductionRecord(newRecord);
    if (!res.success) {
      showToast(res.error || 'Erro ao salvar: limite de 3.000 registros atingido.');
      setIsStorageModalOpen(true);
      return;
    }
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

  const handleUpdateGlobalLineStatuses = (updated: GlobalLineStatuses) => {
    saveGlobalLineStatuses(updated);
    setGlobalLineStatuses(updated);
    showToast('Status operacional das 6 linhas atualizado com sucesso.');
  };


  const handleNewEntryClick = (machineId?: MachineId) => {
    if (machineId) {
      setEntryPreselectedMachine(machineId);
    }
    setActiveTab('entry');
  };

  const handleFilterHistoryByMachine = (machineId: MachineId) => {
    handleTabSelect('history');
    setHistoryMachineFilter(machineId);
  };

  // Controle de Abas Restritas à Gestão
  const handleTabSelect = (tab: 'monitor' | 'entry' | 'history' | 'charts' | 'report') => {
    if (tab === 'monitor' || tab === 'entry') {
      setActiveTab(tab);
      return;
    }

    // Abas restritas: history, charts, report
    if (isSupervisorAuthenticated()) {
      setIsSupervisorActive(true);
      setActiveTab(tab);
    } else {
      const tabNames: Record<string, string> = {
        history: 'o Histórico de Apontamentos',
        charts: 'os Gráficos & Análise de Produtividade',
        report: 'o Relatório Mensal e Metas'
      };
      setPinModalTitle('Acesso Restrito à Gestão');
      setPinModalDescription(`Para visualizar ${tabNames[tab] || 'esta área'}, informe a senha de acesso da supervisão.`);
      setPendingAuthorizedAction(() => () => {
        setIsSupervisorActive(true);
        setActiveTab(tab);
      });
      setIsPinModalOpen(true);
    }
  };

  // Solicitar autenticação para ações sensíveis (exportações Excel, purga de registros)
  const handleRequestPinAuth = (action: () => void) => {
    if (isSupervisorAuthenticated()) {
      setIsSupervisorActive(true);
      action();
    } else {
      setPinModalTitle('Autorização de Gestão');
      setPinModalDescription('Esta operação requer autorização da supervisão. Digite a senha de acesso.');
      setPendingAuthorizedAction(() => () => {
        setIsSupervisorActive(true);
        action();
      });
      setIsPinModalOpen(true);
    }
  };

  const handlePinSuccess = () => {
    setIsSupervisorActive(true);
    if (pendingAuthorizedAction) {
      pendingAuthorizedAction();
      setPendingAuthorizedAction(null);
    }
    showToast('Acesso de supervisão liberado com sucesso.');
  };

  const handleLockSupervisor = () => {
    logoutSupervisor();
    setIsSupervisorActive(false);
    if (activeTab === 'history' || activeTab === 'charts' || activeTab === 'report') {
      setActiveTab('monitor');
    }
    showToast('Acesso de gestão bloqueado. Modo operador ativo.');
  };

  const handleStorageUpdated = () => {
    setRecords(getProductionRecords());
    showToast('Banco de dados de histórico atualizado.');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Modal de Autenticação da Supervisão */}
      <PinPromptModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingAuthorizedAction(null);
        }}
        onSuccess={handlePinSuccess}
        actionTitle={pinModalTitle}
        actionDescription={pinModalDescription}
      />

      {/* Modal de Gestão da Capacidade de Armazenamento (Até 3000 registros) */}
      <StorageManagerModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        records={records}
        onStorageUpdated={handleStorageUpdated}
        onRequestPinAuth={handleRequestPinAuth}
      />

      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
        onNewEntryClick={handleNewEntryClick}
        onPrintReport={() => window.print()}
        onExportCsv={() => exportToCSV(records)}
        isSupervisorActive={isSupervisorActive}
        onLockSupervisor={handleLockSupervisor}
        onOpenStorageManager={() => setIsStorageModalOpen(true)}
        recordsCount={records.length}
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
            globalLineStatuses={globalLineStatuses}
            onUpdateGlobalLineStatuses={handleUpdateGlobalLineStatuses}
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
            onOpenStorageManager={() => setIsStorageModalOpen(true)}
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
            onRequestPinAuth={handleRequestPinAuth}
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
            <span>Capacidade até 3.000 Registros</span>
            <span className="text-slate-700">·</span>
            <span>Segurança Criptografada SHA-256</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
