import React, { useState } from 'react';
import { 
  MachineId, 
  MACHINE_LIST, 
  LineOperationalStatus, 
  GlobalLineStatuses,
  LINE_STATUS_CONFIG 
} from '../types/production';
import { 
  X, 
  CheckCircle2, 
  Wrench, 
  Sliders, 
  CalendarClock, 
  PowerOff, 
  Sparkles,
  Zap,
  Save,
  RotateCcw
} from 'lucide-react';
import { setAllLinesStatusGlobally, saveGlobalLineStatuses } from '../utils/storage';

interface GlobalLineStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatuses: GlobalLineStatuses;
  onStatusesUpdated: (updated: GlobalLineStatuses) => void;
}

export const GlobalLineStatusModal: React.FC<GlobalLineStatusModalProps> = ({
  isOpen,
  onClose,
  currentStatuses,
  onStatusesUpdated
}) => {
  const [statuses, setStatuses] = useState<GlobalLineStatuses>(currentStatuses);
  const [operatorLeader, setOperatorLeader] = useState<string>('Supervisão Geral');

  if (!isOpen) return null;

  const handleSetAllInProduction = () => {
    const updated = setAllLinesStatusGlobally('em_producao', operatorLeader);
    setStatuses(updated);
    onStatusesUpdated(updated);
  };

  const handleLineStatusChange = (machineId: MachineId, newStatus: LineOperationalStatus) => {
    setStatuses(prev => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: operatorLeader
      }
    }));
  };

  const handleFieldChange = (machineId: MachineId, field: 'setupMaterial' | 'maintenanceOrderNumber' | 'notes', value: string) => {
    setStatuses(prev => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    saveGlobalLineStatuses(statuses);
    onStatusesUpdated(statuses);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-red-800 text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-800/80 text-amber-300">
                  <Zap className="w-5 h-5" />
                </span>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Definição Global de Status das Linhas
                </h3>
              </div>
              <p className="text-xs text-red-200 mt-1 max-w-xl">
                Configure o status operacional padrão para as extrusoras DR01 a DR06. Os operadores economizarão tempo, pois o formulário de coleta já abrirá com a linha pré-configurada!
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-red-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick 1-Click Action Bar */}
          <div className="mt-5 pt-4 border-t border-red-800/60 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSetAllInProduction}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>1-Clique: Definir TODAS as Linhas em Produção</span>
            </button>

            <span className="text-[11px] text-red-200 font-mono">
              Economiza tempo no chão de fábrica
            </span>
          </div>
        </div>

        {/* Modal Body: List of DR01 - DR06 */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-slate-50">
          <div className="text-xs text-slate-600 mb-2 font-medium">
            Selecione o status de cada máquina. Se estiver em manutenção ou setup, informe o detalhe para agilizar o registro:
          </div>

          {MACHINE_LIST.map((mId) => {
            const current = statuses[mId] || { status: 'em_producao' };
            const statusKey = current.status;

            return (
              <div 
                key={mId}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-[130px]">
                    <div className="w-10 h-10 rounded-lg bg-red-900 text-white font-extrabold flex items-center justify-center font-mono text-sm shadow-inner">
                      {mId}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Extrusora {mId}</h4>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {current.updatedAt ? `Atualizado: ${new Date(current.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Padrão'}
                      </span>
                    </div>
                  </div>

                  {/* Status Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 flex-1 max-w-2xl">
                    <button
                      type="button"
                      onClick={() => handleLineStatusChange(mId, 'em_producao')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        statusKey === 'em_producao'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Produção</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLineStatusChange(mId, 'setup')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        statusKey === 'setup'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5 shrink-0" />
                      <span>Setup</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLineStatusChange(mId, 'manutencao')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        statusKey === 'manutencao'
                          ? 'bg-red-600 text-white border-red-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50 hover:text-red-800'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 shrink-0" />
                      <span>Manutenção</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLineStatusChange(mId, 'preventiva')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        statusKey === 'preventiva'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-800'
                      }`}
                    >
                      <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                      <span>Preventiva</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLineStatusChange(mId, 'inativa')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        statusKey === 'inativa'
                          ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <PowerOff className="w-3.5 h-3.5 shrink-0" />
                      <span>Inativa</span>
                    </button>
                  </div>
                </div>

                {/* Sub-inputs when Setup or Maintenance is chosen */}
                {statusKey === 'setup' && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                    <span className="text-xs font-semibold text-amber-900 shrink-0">
                      Material em Setup:
                    </span>
                    <input
                      type="text"
                      placeholder="Ex: PP com Fibra de Vidro 30% / Troca de Tela"
                      value={current.setupMaterial || ''}
                      onChange={(e) => handleFieldChange(mId, 'setupMaterial', e.target.value)}
                      className="flex-1 w-full text-xs px-3 py-1.5 rounded-lg border border-amber-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-amber-50/50"
                    />
                  </div>
                )}

                {statusKey === 'manutencao' && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                    <span className="text-xs font-semibold text-red-900 shrink-0">
                      Número da OM:
                    </span>
                    <input
                      type="text"
                      placeholder="Ex: OM-2026-8842"
                      value={current.maintenanceOrderNumber || ''}
                      onChange={(e) => handleFieldChange(mId, 'maintenanceOrderNumber', e.target.value)}
                      className="w-full sm:w-48 text-xs px-3 py-1.5 rounded-lg border border-red-300 focus:outline-hidden focus:ring-2 focus:ring-red-500 bg-red-50/50 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Observação da equipe técnica (opcional)"
                      value={current.notes || ''}
                      onChange={(e) => handleFieldChange(mId, 'notes', e.target.value)}
                      className="flex-1 w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar e Aplicar Globalmente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
