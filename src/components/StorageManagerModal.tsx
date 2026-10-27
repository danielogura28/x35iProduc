import React, { useState } from 'react';
import { 
  HardDrive, 
  Trash2, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Calendar, 
  FileSpreadsheet, 
  ShieldAlert,
  Archive
} from 'lucide-react';
import { 
  getStorageCapacity, 
  deleteOldestRecords, 
  deleteRecordsBeforeDate, 
  clearAllProductionRecords, 
  exportAllRecordsJSON,
  exportToCSV,
  MAX_STORAGE_RECORDS
} from '../utils/storage';
import { ProductionRecord } from '../types/production';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ProductionRecord[];
  onStorageUpdated: () => void;
  onRequestPinAuth?: (action: () => void) => void;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
  isOpen,
  onClose,
  records,
  onStorageUpdated,
  onRequestPinAuth
}) => {
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [purgeDate, setPurgeDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const capacity = getStorageCapacity(records.length);

  const showFeedback = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDeleteOldest = (count: number) => {
    const execute = () => {
      const deleted = deleteOldestRecords(count);
      onStorageUpdated();
      showFeedback(`${deleted} registros mais antigos foram excluídos com sucesso.`);
    };

    if (onRequestPinAuth) {
      onRequestPinAuth(execute);
    } else {
      execute();
    }
  };

  const handleDeleteBeforeDate = () => {
    if (!purgeDate) return;
    const execute = () => {
      const deleted = deleteRecordsBeforeDate(purgeDate);
      onStorageUpdated();
      showFeedback(`${deleted} registros anteriores a ${purgeDate} foram removidos.`);
    };

    if (onRequestPinAuth) {
      onRequestPinAuth(execute);
    } else {
      execute();
    }
  };

  const handleClearAll = () => {
    const execute = () => {
      clearAllProductionRecords();
      setConfirmClearAll(false);
      onStorageUpdated();
      showFeedback('Todo o histórico foi limpo com sucesso.');
    };

    if (onRequestPinAuth) {
      onRequestPinAuth(execute);
    } else {
      execute();
    }
  };

  let barColor = 'bg-emerald-600';
  let badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (capacity.percentage >= 90) {
    barColor = 'bg-red-600';
    badgeColor = 'text-red-700 bg-red-50 border-red-200';
  } else if (capacity.percentage >= 70) {
    barColor = 'bg-amber-500';
    badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 relative border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner text-red-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase text-white">
                Gestão da Capacidade de Armazenamento
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Limite Seguro: até {MAX_STORAGE_RECORDS.toLocaleString('pt-BR')} registros locais
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Card de Capacidade Utilizada */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Capacidade Utilizada:</span>
                <span className="text-[11px] text-slate-500">
                  {capacity.count.toLocaleString('pt-BR')} de {capacity.max.toLocaleString('pt-BR')} registros gravados
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${badgeColor}`}>
                {capacity.percentage.toFixed(1)}% {capacity.isFull ? '• 100% CHEIO' : ''}
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${barColor}`}
                style={{ width: `${Math.min(100, capacity.percentage)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Espaço livre: <strong>{capacity.remaining.toLocaleString('pt-BR')} registros</strong></span>
              {capacity.isFull && (
                <span className="text-red-700 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Capacidade esgotada: exclua registros antigos para salvar novas coletas!
                </span>
              )}
            </div>
          </div>

          {/* Bloco 1: Exportar Backup Antes de Excluir */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Download className="w-4 h-4 text-red-700" />
              <span>1. Salvaguarda & Backup (Recomendado antes da limpeza)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Exporte seus dados antes de deletar registros para garantir o arquivo histórico de auditoria.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => exportAllRecordsJSON()}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-slate-600" />
                <span>Backup JSON Completo</span>
              </button>
              <button
                type="button"
                onClick={() => exportToCSV(records)}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Exportar Tabela CSV</span>
              </button>
            </div>
          </div>

          {/* Bloco 2: Exclusão dos Registros Mais Antigos */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Trash2 className="w-4 h-4 text-red-700" />
              <span>2. Exclusão de Registros Mais Antigos (Liberação Rápida)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Remove automaticamente os apontamentos mais antigos, mantendo os dados mais recentes intactos.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDeleteOldest(100)}
                disabled={records.length === 0}
                className="py-2.5 px-3 bg-white border border-slate-300 hover:border-red-400 hover:bg-red-50 text-slate-800 hover:text-red-900 font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Excluir 100 mais antigos
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOldest(500)}
                disabled={records.length === 0}
                className="py-2.5 px-3 bg-white border border-slate-300 hover:border-red-400 hover:bg-red-50 text-slate-800 hover:text-red-900 font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Excluir 500 mais antigos
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOldest(1000)}
                disabled={records.length === 0}
                className="py-2.5 px-3 bg-white border border-slate-300 hover:border-red-400 hover:bg-red-50 text-slate-800 hover:text-red-900 font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Excluir 1.000 mais antigos
              </button>
            </div>
          </div>

          {/* Bloco 3: Exclusão por Data de Corte */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Calendar className="w-4 h-4 text-red-700" />
              <span>3. Purgar Registros Anteriores a uma Data de Corte</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Elimina todos os apontamentos anteriores à data selecionada (útil para arquivamento anual).
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="date"
                value={purgeDate}
                onChange={(e) => setPurgeDate(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg p-2 font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <button
                type="button"
                onClick={handleDeleteBeforeDate}
                disabled={!purgeDate || records.length === 0}
                className="py-2 px-3 bg-white border border-red-300 hover:bg-red-50 text-red-800 font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Excluir Anteriores a {purgeDate}
              </button>
            </div>
          </div>

          {/* Bloco 4: Limpeza Completa */}
          <div className="bg-red-50/70 border border-red-300 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-950 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-red-700" />
              <span>4. Reset Total do Histórico (Zona Crítica)</span>
            </div>
            <p className="text-[11px] text-red-900">
              Apaga permanentemente todos os registros do banco de dados local. Ação irreversível.
            </p>

            {!confirmClearAll ? (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                disabled={records.length === 0}
                className="py-2 px-4 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Todo o Histórico</span>
              </button>
            ) : (
              <div className="p-3 bg-red-100 border border-red-400 rounded-lg space-y-2">
                <span className="text-xs font-bold text-red-950 block">
                  Confirmar exclusão de TODOS os {records.length} registros?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="py-1.5 px-3 bg-red-800 text-white font-bold rounded hover:bg-red-900 cursor-pointer"
                  >
                    Sim, Deletar Tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="py-1.5 px-3 bg-white text-slate-700 font-semibold border rounded hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
