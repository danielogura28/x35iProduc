import React, { useState, useMemo } from 'react';
import { 
  ProductionRecord, 
  MachineId, 
  MACHINE_LIST,
  LineOperationalStatus,
  LINE_STATUS_CONFIG 
} from '../types/production';
import { 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Wrench, 
  Sliders, 
  CalendarClock, 
  PowerOff,
  HardDrive,
  X 
} from 'lucide-react';
import { MAX_STORAGE_RECORDS } from '../utils/storage';

interface HistoryTableProps {
  records: ProductionRecord[];
  onDeleteRecord: (id: string) => void;
  selectedMachineFilter?: MachineId | 'ALL';
  onClearMachineFilter?: () => void;
  onOpenStorageManager?: () => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  records,
  onDeleteRecord,
  selectedMachineFilter = 'ALL',
  onClearMachineFilter,
  onOpenStorageManager
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState<string>(selectedMachineFilter);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeRecordForModal, setActiveRecordForModal] = useState<ProductionRecord | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  React.useEffect(() => {
    setMachineFilter(selectedMachineFilter);
  }, [selectedMachineFilter]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (machineFilter !== 'ALL' && r.machineId !== machineFilter) {
        return false;
      }

      if (statusFilter !== 'ALL') {
        const currentStatus = r.lineStatus || 'em_producao';
        if (currentStatus !== statusFilter) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches = 
          r.machineId.toLowerCase().includes(query) ||
          r.operatorName.toLowerCase().includes(query) ||
          r.shiftLeader.toLowerCase().includes(query) ||
          (r.productionOrder && r.productionOrder.toLowerCase().includes(query)) ||
          (r.batchNumber && r.batchNumber.toLowerCase().includes(query)) ||
          (r.productName && r.productName.toLowerCase().includes(query)) ||
          (r.setupMaterial && r.setupMaterial.toLowerCase().includes(query)) ||
          (r.maintenanceOrderNumber && r.maintenanceOrderNumber.toLowerCase().includes(query));
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records, machineFilter, statusFilter, searchTerm]);

  const capacityPct = Math.min(100, Math.round((records.length / MAX_STORAGE_RECORDS) * 1000) / 10);
  const isCapacityFull = records.length >= MAX_STORAGE_RECORDS;

  return (
    <div className="space-y-4">
      {/* Storage Capacity Bar & Management */}
      <div className={`rounded-xl border p-4 shadow-xs transition-colors ${
        isCapacityFull ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isCapacityFull ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Capacidade de Histórico:
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isCapacityFull 
                    ? 'bg-red-200 text-red-950 border-red-300 animate-pulse' 
                    : capacityPct >= 85 
                    ? 'bg-amber-100 text-amber-900 border-amber-200' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  {records.length.toLocaleString('pt-BR')} / {MAX_STORAGE_RECORDS.toLocaleString('pt-BR')} ({capacityPct}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isCapacityFull
                  ? 'Atingiu 100% da capacidade permitida. Exclua registros antigos para salvar novas coletas com segurança.'
                  : 'Armazenamento de alta performance para até 3.000 apontamentos com gráficos e relatórios.'}
              </p>
            </div>
          </div>

          {onOpenStorageManager && (
            <button
              onClick={onOpenStorageManager}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs ${
                isCapacityFull
                  ? 'bg-red-700 hover:bg-red-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Gerenciar / Liberar Espaço</span>
            </button>
          )}
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 rounded-full ${
              capacityPct >= 95 ? 'bg-red-600' : capacityPct >= 80 ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, capacityPct)}%` }}
          ></div>
        </div>
      </div>

      {/* Search and Filters Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por OP, Lote, Material de Setup, OM, Operador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">Todos os Status</option>
              <option value="em_producao">Em Produção</option>
              <option value="manutencao">Em Manutenção</option>
              <option value="setup">Em Setup</option>
              <option value="preventiva">Em Preventiva</option>
              <option value="inativa">Inativa / Parada</option>
            </select>

            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => {
                  setMachineFilter('ALL');
                  if (onClearMachineFilter) onClearMachineFilter();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  machineFilter === 'ALL'
                    ? 'bg-red-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Todas
              </button>
              {MACHINE_LIST.map((m) => (
                <button
                  key={m}
                  onClick={() => setMachineFilter(m)}
                  className={`px-2 py-1.5 text-xs font-mono font-bold rounded-md transition-colors cursor-pointer ${
                    machineFilter === m
                      ? 'bg-red-800 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Total filtrado: <strong>{filteredRecords.length}</strong> de {records.length} apontamentos</span>
          <span className="hidden sm:inline">Clique no ícone de olho para ver os detalhes completos</span>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-600 tracking-wider">
              <tr>
                <th className="py-3 px-3">Linha</th>
                <th className="py-3 px-3">Status da Linha</th>
                <th className="py-3 px-3">Data / Turno</th>
                <th className="py-3 px-3">Detalhes / OP / Material</th>
                <th className="py-3 px-3">Operador / Líder</th>
                <th className="py-3 px-3 text-right">Produtividade</th>
                <th className="py-3 px-3 text-center">Ficha & Qualidade</th>
                <th className="py-3 px-3 text-center">Fotos</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => {
                  const status = r.lineStatus || 'em_producao';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        <span className="inline-block px-2 py-1 bg-red-900 text-white rounded text-xs">
                          {r.machineId}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {status === 'em_producao' && (
                          <span className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            <span>Em Produção</span>
                          </span>
                        )}
                        {status === 'manutencao' && (
                          <span className="px-2 py-1 rounded text-[11px] font-semibold bg-red-100 text-red-900 border border-red-200 flex items-center gap-1 w-fit">
                            <Wrench className="w-3 h-3 text-red-600" />
                            <span>Manutenção</span>
                          </span>
                        )}
                        {status === 'setup' && (
                          <span className="px-2 py-1 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 w-fit">
                            <Sliders className="w-3 h-3 text-amber-600" />
                            <span>Em Setup</span>
                          </span>
                        )}
                        {status === 'preventiva' && (
                          <span className="px-2 py-1 rounded text-[11px] font-semibold bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1 w-fit">
                            <CalendarClock className="w-3 h-3 text-blue-600" />
                            <span>Preventiva</span>
                          </span>
                        )}
                        {status === 'inativa' && (
                          <span className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1 w-fit">
                            <PowerOff className="w-3 h-3 text-slate-600" />
                            <span>Inativa</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 font-mono">
                          {new Date(r.timestamp).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {r.shift.split(' ')[0]}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-[220px]">
                        {status === 'manutencao' ? (
                          <div className="font-mono font-bold text-red-800">
                            OM: {r.maintenanceOrderNumber}
                          </div>
                        ) : status === 'setup' ? (
                          <div>
                            <span className="font-semibold text-amber-900 block truncate" title={r.setupMaterial}>
                              {r.setupMaterial}
                            </span>
                            {r.productionOrder && <span className="text-[10px] text-slate-400 font-mono">Próx OP: {r.productionOrder}</span>}
                          </div>
                        ) : status === 'em_producao' ? (
                          <div>
                            <span className="font-mono font-bold text-slate-900">{r.productionOrder}</span>
                            <span className="text-[10px] text-slate-500 ml-1 font-mono">({r.batchNumber})</span>
                            <div className="text-[10px] text-slate-500 truncate" title={r.productName}>
                              {r.productName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sem parâmetros</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{r.operatorName}</div>
                        <div className="text-[10px] text-slate-500">Líder: {r.shiftLeader}</div>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {status === 'em_producao' ? (
                          <>
                            <div className="font-mono font-bold text-slate-900 tabular-nums">
                              {r.productivityKgh || 0} <span className="text-[10px] text-slate-400 font-normal">kg/h</span>
                            </div>
                            <div className="text-[10px] text-slate-500 tabular-nums font-mono">
                              {r.rpm || 0} RPM · {r.motorAmperes || 0} A
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {status === 'em_producao' ? (
                          <div className="flex flex-col items-center gap-1">
                            {r.temperaturesConforming ? (
                              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Ficha OK</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-red-700 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                <span>Desvio Ficha</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {r.photos.length > 0 ? (
                          <button
                            onClick={() => setActiveRecordForModal(r)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 hover:bg-slate-200 text-xs font-mono cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-red-700" />
                            <span>{r.photos.length}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setActiveRecordForModal(r)}
                            className="p-1.5 text-slate-600 hover:text-red-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Confirma a exclusão deste apontamento da linha ${r.machineId}?`)) {
                                onDeleteRecord(r.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenhum apontamento encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {activeRecordForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="bg-red-950 text-white p-5 sticky top-0 z-10 flex items-center justify-between border-b border-red-900">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-red-800 font-mono font-bold text-base flex items-center justify-center">
                  {activeRecordForModal.machineId}
                </span>
                <div>
                  <h3 className="font-bold text-base">
                    Apontamento - Extrusora {activeRecordForModal.machineId}
                  </h3>
                  <p className="text-xs text-red-200">
                    Status: <strong className="uppercase">{LINE_STATUS_CONFIG[activeRecordForModal.lineStatus || 'em_producao'].label}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveRecordForModal(null)}
                className="p-1.5 text-red-200 hover:text-white rounded-lg hover:bg-red-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-700">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Data / Hora</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {new Date(activeRecordForModal.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Turno</span>
                  <span className="font-semibold text-slate-900">{activeRecordForModal.shift}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Operador</span>
                  <span className="font-semibold text-slate-900">{activeRecordForModal.operatorName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Líder</span>
                  <span className="font-semibold text-slate-900">{activeRecordForModal.shiftLeader}</span>
                </div>
              </div>

              {/* Se Manutenção */}
              {activeRecordForModal.lineStatus === 'manutencao' && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-red-900 uppercase">Ordem de Manutenção</span>
                  <div className="text-xl font-mono font-bold text-red-950">
                    {activeRecordForModal.maintenanceOrderNumber}
                  </div>
                  {activeRecordForModal.operationalDeviationsNotes && (
                    <p className="text-xs text-red-800 pt-2 border-t border-red-200">
                      <strong>Observações:</strong> {activeRecordForModal.operationalDeviationsNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Se Setup */}
              {activeRecordForModal.lineStatus === 'setup' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-amber-900 uppercase">Material em Setup</span>
                  <div className="text-base font-semibold text-amber-950">
                    {activeRecordForModal.setupMaterial}
                  </div>
                  {activeRecordForModal.productionOrder && (
                    <div className="text-xs text-amber-800 font-mono">
                      Próxima OP: {activeRecordForModal.productionOrder}
                    </div>
                  )}
                  {activeRecordForModal.operationalDeviationsNotes && (
                    <p className="text-xs text-amber-800 pt-2 border-t border-amber-200">
                      <strong>Observações:</strong> {activeRecordForModal.operationalDeviationsNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Se Em Produção */}
              {activeRecordForModal.lineStatus === 'em_producao' && (
                <>
                  {/* Bloco Parâmetros Atuais e Ficha Anterior */}
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2 border-b pb-1 flex items-center justify-between">
                      <span>Parâmetros de Operação & Comparação com Ficha Anterior</span>
                      {activeRecordForModal.hasPreviousReferenceSheet ? (
                        <span className="text-[10px] text-emerald-700 font-semibold">Comparado com Ficha Anterior</span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-semibold">Sem Ficha Anterior de Referência</span>
                      )}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Vazão Atual</span>
                        <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                          {activeRecordForModal.productivityKgh} kg/h
                        </span>
                        {activeRecordForModal.prevProductivityKgh !== undefined ? (
                          <span className="text-[10px] text-slate-500 block">
                            Ficha Ant: <strong>{activeRecordForModal.prevProductivityKgh} kg/h</strong>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block">Meta: {activeRecordForModal.targetProductivityKgh || '-'}</span>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-[10px] text-slate-500 block">RPM Rosca</span>
                        <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                          {activeRecordForModal.rpm}
                        </span>
                        {activeRecordForModal.prevRpm !== undefined && (
                          <span className="text-[10px] text-slate-500 block">
                            Ficha Ant: <strong>{activeRecordForModal.prevRpm} RPM</strong>
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Corrente Motor</span>
                        <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                          {activeRecordForModal.motorAmperes} A
                        </span>
                        {activeRecordForModal.prevMotorAmperes !== undefined && (
                          <span className="text-[10px] text-slate-500 block">
                            Ficha Ant: <strong>{activeRecordForModal.prevMotorAmperes} A</strong>
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Temperaturas</span>
                        <span className={`text-xs font-bold block mt-1 ${activeRecordForModal.temperaturesConforming ? 'text-emerald-700' : 'text-red-700'}`}>
                          {activeRecordForModal.temperaturesConforming ? 'Conforme Ficha' : 'Desvio Térmico'}
                        </span>
                        {activeRecordForModal.temperatureDeviationZones && (
                          <span className="text-[10px] text-red-600 block truncate" title={activeRecordForModal.temperatureDeviationZones}>
                            {activeRecordForModal.temperatureDeviationZones}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dosadoras 01 a 04, Homogeneização DOS02, Side Feeder e Circulação */}
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2 border-b pb-1">
                      Dosadoras, Side Feeder & Refrigeração
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {(['dos01', 'dos02', 'dos03', 'dos04'] as const).map((key, idx) => {
                        const item = activeRecordForModal.dosers?.[key];
                        return (
                          <div key={key} className="p-2 bg-slate-50 border rounded-lg text-center">
                            <span className="text-[10px] text-slate-500 block font-bold">DOS 0{idx + 1}</span>
                            <span className="text-xs font-mono font-bold text-slate-800">
                              {item?.value ? item.value : (item?.checked ? 'Conferido' : 'Padrão')}
                            </span>
                            <span className={`text-[10px] block font-semibold ${item?.conforming !== false ? 'text-emerald-700' : 'text-red-700'}`}>
                              {item?.conforming !== false ? 'Conforme' : 'Desvio'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="p-2 bg-slate-50 border rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Homogeneização DOS02:</span>
                        <span className="text-xs font-bold text-slate-800 capitalize">
                          {activeRecordForModal.dos02Homogenization || 'Conforme'}
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50 border rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Side Feeder RPM:</span>
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          {activeRecordForModal.sideFeederCurrentRpm !== undefined ? `${activeRecordForModal.sideFeederCurrentRpm} RPM` : 'N/A'}
                        </span>
                        {activeRecordForModal.sideFeederPreviousRpm !== undefined && (
                          <span className="text-[10px] text-slate-500 block">
                            (Ref anterior: {activeRecordForModal.sideFeederPreviousRpm} RPM)
                          </span>
                        )}
                      </div>

                      <div className="p-2 bg-slate-50 border rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Sistema de Circulação:</span>
                        <span className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${activeRecordForModal.circulationSystemStatus === 'ativo' ? 'text-emerald-700' : 'text-red-700'}`}>
                          <span className={`w-2 h-2 rounded-full ${activeRecordForModal.circulationSystemStatus === 'ativo' ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                          {activeRecordForModal.circulationSystemStatus === 'ativo' ? 'Ativo / Operando' : 'Inativo / Desligado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Controle Físico, Seladora & Embalagem */}
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2 border-b pb-1">
                      Controle Físico & Embalagem
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-slate-500 block text-[10px]">Ímã:</span>
                        <strong className="capitalize text-slate-800">{activeRecordForModal.magnetStatus}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-slate-500 block text-[10px]">Peneira:</span>
                        <strong className="capitalize text-slate-800">{activeRecordForModal.sievePowderCondition}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-slate-500 block text-[10px]">Temp Seladora:</span>
                        <strong className={activeRecordForModal.sealerTempConforming ? 'text-emerald-700' : 'text-red-700'}>
                          {activeRecordForModal.sealerTempConforming ? 'Correta' : 'Incorreta'}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 border rounded-lg">
                        <span className="text-slate-500 block text-[10px]">Etiquetas / Selagem:</span>
                        <strong>{activeRecordForModal.labelCodesConforming ? 'Etiquetas OK' : 'Divergente'} · {activeRecordForModal.sealingQuality}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Comunicação de Desvios ao Líder */}
                  {activeRecordForModal.deviationReportedToLeader && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-1 text-amber-950">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>Desvio Repassado ao Líder do Turno</span>
                        <span className="font-mono bg-amber-200 px-2 py-0.5 rounded text-[11px]">
                          Horário: {activeRecordForModal.deviationReportTime || '--:--'}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900">
                        Líder informado: <strong>{activeRecordForModal.deviationReportLeaderName || activeRecordForModal.shiftLeader}</strong>
                        {activeRecordForModal.deviationReportLeaderNotes && (
                          <span> · Orientação: "{activeRecordForModal.deviationReportLeaderNotes}"</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Paradas de Máquina (Quantidade e Motivos) */}
                  {activeRecordForModal.hasStoppage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-red-950">
                        <span>Paradas de Máquina no Período</span>
                        <span className="font-mono bg-red-200 px-2 py-0.5 rounded text-[11px]">
                          {activeRecordForModal.stoppageQuantity || 1} parada(s)
                        </span>
                      </div>
                      {activeRecordForModal.stoppageReasonsList && activeRecordForModal.stoppageReasonsList.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {activeRecordForModal.stoppageReasonsList.map((m, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-900 rounded text-[10px] font-semibold border border-red-300">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Fotos */}
              {activeRecordForModal.photos.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2 border-b pb-1">
                    Evidências Fotográficas ({activeRecordForModal.photos.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeRecordForModal.photos.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => setExpandedPhoto(p.dataUrl)}
                        className="group relative rounded-lg border overflow-hidden cursor-pointer bg-slate-100 hover:ring-2 hover:ring-red-600 transition-all"
                      >
                        <img src={p.dataUrl} alt={p.caption} className="w-full h-32 object-cover" />
                        <div className="p-2 bg-white">
                          <p className="font-semibold text-slate-800 truncate">{p.caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setActiveRecordForModal(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded photo lightbox */}
      {expandedPhoto && (
        <div 
          onClick={() => setExpandedPhoto(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={expandedPhoto} alt="Evidência ampliada" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" />
            <button
              onClick={() => setExpandedPhoto(null)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-slate-800/80 px-3 py-1 rounded"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
