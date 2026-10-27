import React, { useState } from 'react';
import { Operator, ShiftLeader } from '../types/production';
import { Users, UserPlus, Trash2, Edit2, Check, X, ShieldAlert } from 'lucide-react';

interface TeamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  operators: Operator[];
  shiftLeaders: ShiftLeader[];
  onUpdateOperators: (operators: Operator[]) => void;
  onUpdateShiftLeaders: (leaders: ShiftLeader[]) => void;
}

export const TeamManagerModal: React.FC<TeamManagerModalProps> = ({
  isOpen,
  onClose,
  operators,
  shiftLeaders,
  onUpdateOperators,
  onUpdateShiftLeaders,
}) => {
  const [activeTab, setActiveTab] = useState<'operators' | 'leaders'>('operators');
  
  // Novo item
  const [newName, setNewName] = useState('');
  
  // Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (activeTab === 'operators') {
      const newOp: Operator = {
        id: 'op-' + Date.now(),
        name: trimmed,
      };
      onUpdateOperators([...operators, newOp]);
    } else {
      const newLdr: ShiftLeader = {
        id: 'ldr-' + Date.now(),
        name: trimmed,
      };
      onUpdateShiftLeaders([...shiftLeaders, newLdr]);
    }
    setNewName('');
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    if (activeTab === 'operators') {
      onUpdateOperators(operators.map(op => op.id === id ? { ...op, name: trimmed } : op));
    } else {
      onUpdateShiftLeaders(shiftLeaders.map(ldr => ldr.id === id ? { ...ldr, name: trimmed } : ldr));
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Deseja remover "${name}" da lista?`)) {
      if (activeTab === 'operators') {
        onUpdateOperators(operators.filter(op => op.id !== id));
      } else {
        onUpdateShiftLeaders(shiftLeaders.filter(ldr => ldr.id !== id));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-red-950 text-white p-4 flex items-center justify-between border-b border-red-900">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-300" />
            <h3 className="font-bold text-base">Banco de Dados: Equipe de Chão de Fábrica</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-red-200 hover:text-white hover:bg-red-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Operadores vs Líderes */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            onClick={() => { setActiveTab('operators'); setEditingId(null); }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'operators'
                ? 'border-red-700 text-red-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Operadores da Linha ({operators.length})
          </button>
          <button
            onClick={() => { setActiveTab('leaders'); setEditingId(null); }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'leaders'
                ? 'border-red-700 text-red-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Líderes de Turno ({shiftLeaders.length})
          </button>
        </div>

        {/* Content & List */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Form to Add New */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder={activeTab === 'operators' ? "Nome do novo operador..." : "Nome do novo líder de turno..."}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </form>

          {/* List items */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
            {(activeTab === 'operators' ? operators : shiftLeaders).map((item) => (
              <div key={item.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-white border border-red-400 rounded p-1 text-xs focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                      title="Salvar alteração"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 bg-slate-400 hover:bg-slate-500 text-white rounded cursor-pointer"
                      title="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(item.id, item.name)}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                        title="Editar nome"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        title="Deletar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * As alterações feitas são salvas automaticamente e ficam disponíveis na caixa de seleção dos apontamentos.
          </p>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 cursor-pointer"
          >
            Concluir / Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
