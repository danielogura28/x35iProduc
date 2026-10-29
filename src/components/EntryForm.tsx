import React, { useState, useRef, useEffect } from 'react';
import { 
  MachineId, 
  MACHINE_LIST, 
  ShiftType, 
  LineOperationalStatus,
  LINE_STATUS_CONFIG,
  MagnetStatus, 
  SievePowderCondition, 
  SealingQuality, 
  StoppageReason,
  STOPPAGE_REASONS_LIST,
  Dos02HomogenizationStatus,
  CirculationSystemStatus,
  DosersCheckData,
  ScaleCalibrationStatus,
  ScaleIdentificationStatus,
  Operator,
  ShiftLeader,
  ProductionRecord,
  PhotoAttachment 
} from '../types/production';
import { 
  Camera, 
  Upload, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Save, 
  Wrench, 
  Sliders, 
  CalendarClock, 
  PowerOff,
  UserCheck,
  Settings,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  Gauge,
  Scale
} from 'lucide-react';
import { TeamManagerModal } from './TeamManagerModal';
import { getGlobalLineStatuses } from '../utils/storage';

interface EntryFormProps {
  initialMachine?: MachineId;
  operators: Operator[];
  shiftLeaders: ShiftLeader[];
  onUpdateOperators: (ops: Operator[]) => void;
  onUpdateShiftLeaders: (ldrs: ShiftLeader[]) => void;
  onSaveSuccess: (record: ProductionRecord) => void;
  onCancel: () => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({
  initialMachine = 'DR01',
  operators,
  shiftLeaders,
  onUpdateOperators,
  onUpdateShiftLeaders,
  onSaveSuccess,
  onCancel,
}) => {
  const [machineId, setMachineId] = useState<MachineId>(initialMachine);
  const [dateTime, setDateTime] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [shift, setShift] = useState<ShiftType>('Turno 1 (06h - 14h)');

  // Operador e Líder com Dropdown
  const [operatorName, setOperatorName] = useState<string>(() => operators[0]?.name || 'Carlos Silveira');
  const [shiftLeader, setShiftLeader] = useState<string>(() => shiftLeaders[0]?.name || 'Fernando Rocha');
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Status inicial mandatório baseado na configuração global da linha
  const [lineStatus, setLineStatus] = useState<LineOperationalStatus>(() => {
    const globalConfig = getGlobalLineStatuses();
    return globalConfig[initialMachine]?.status || 'em_producao';
  });

  // Campos específicos
  const [setupMaterial, setSetupMaterial] = useState<string>(() => {
    const globalConfig = getGlobalLineStatuses();
    return globalConfig[initialMachine]?.setupMaterial || '';
  });
  const [maintenanceOrderNumber, setMaintenanceOrderNumber] = useState<string>(() => {
    const globalConfig = getGlobalLineStatuses();
    return globalConfig[initialMachine]?.maintenanceOrderNumber || '';
  });

  const handleMachineChange = (newMachine: MachineId) => {
    setMachineId(newMachine);
    setScaleTagNumber(`BAL-${newMachine}`);
    const globalConfig = getGlobalLineStatuses();
    const preset = globalConfig[newMachine];
    if (preset) {
      setLineStatus(preset.status);
      if (preset.setupMaterial) {
        setSetupMaterial(preset.setupMaterial);
      }
      if (preset.maintenanceOrderNumber) {
        setMaintenanceOrderNumber(preset.maintenanceOrderNumber);
      }
    }
  };

  // Campos quando Em Produção
  const [productionOrder, setProductionOrder] = useState<string>('OP-48230');
  const [batchNumber, setBatchNumber] = useState<string>('LT-2710-09');
  const [productName, setProductName] = useState<string>('PP Composto Mineral 30%');
  
  // Parâmetros Operacionais Atuais
  const [productivityKgh, setProductivityKgh] = useState<string>('440');
  const [targetProductivityKgh, setTargetProductivityKgh] = useState<string>('450');
  const [rpm, setRpm] = useState<string>('375');
  const [motorAmperes, setMotorAmperes] = useState<string>('69.5');

  // Comparação com Ficha Anterior de Referência (Campo 3)
  const [hasPreviousReferenceSheet, setHasPreviousReferenceSheet] = useState<boolean>(true);
  const [prevProductivityKgh, setPrevProductivityKgh] = useState<string>('435');
  const [prevRpm, setPrevRpm] = useState<string>('370');
  const [prevMotorAmperes, setPrevMotorAmperes] = useState<string>('68.0');

  // Temperaturas da Máquina
  const [temperaturesConforming, setTemperaturesConforming] = useState<boolean>(true);
  const [temperatureDeviationZones, setTemperatureDeviationZones] = useState<string>('');

  // Parâmetros de acordo com a ficha anterior & DOP
  const [parametersMatchPreviousSheet, setParametersMatchPreviousSheet] = useState<boolean>(true);
  const [parameterDeviationReason, setParameterDeviationReason] = useState<string>('');
  const [dopObservationsIdentified, setDopObservationsIdentified] = useState<boolean>(false);
  const [dopObservationsDetails, setDopObservationsDetails] = useState<string>('');
  const [deviationApprovedByLeader, setDeviationApprovedByLeader] = useState<boolean>(true);
  const [approvingLeaderName, setApprovingLeaderName] = useState<string>(() => shiftLeaders[0]?.name || 'Fernando Rocha');

  // Conferência de Dosadoras (01, 02, 03, 04)
  const [dosers, setDosers] = useState<DosersCheckData>({
    dos01: { checked: true, value: '70% PP', conforming: true },
    dos02: { checked: true, value: '25% Talco', conforming: true },
    dos03: { checked: true, value: '3% Master', conforming: true },
    dos04: { checked: false, value: '', conforming: true }
  });

  // Homogeneização da DOS02
  const [dos02Homogenization, setDos02Homogenization] = useState<Dos02HomogenizationStatus>('conforme');
  const [dos02HomogenizationNotes, setDos02HomogenizationNotes] = useState<string>('');

  // Side Feeder RPM (Atual vs OP Anterior)
  const [hasSideFeeder, setHasSideFeeder] = useState<boolean>(true);
  const [sideFeederCurrentRpm, setSideFeederCurrentRpm] = useState<string>('280');
  const [sideFeederPreviousRpm, setSideFeederPreviousRpm] = useState<string>('280');
  const [sideFeederConforming, setSideFeederConforming] = useState<boolean>(true);

  // Sistema de Circulação
  const [circulationSystemStatus, setCirculationSystemStatus] = useState<CirculationSystemStatus>('ativo');

  // Ímã e Peneira
  const [magnetStatus, setMagnetStatus] = useState<MagnetStatus>('limpo');
  const [magnetNotes, setMagnetNotes] = useState<string>('');
  const [sievePowderCondition, setSievePowderCondition] = useState<SievePowderCondition>('normal');
  const [sieveNotes, setSieveNotes] = useState<string>('');

  // Seladoras e Embalagens
  const [sealerTempConforming, setSealerTempConforming] = useState<boolean>(true);
  const [sealerTempMeasured, setSealerTempMeasured] = useState<string>('145');
  const [labelCodesConforming, setLabelCodesConforming] = useState<boolean>(true);
  const [sealingQuality, setSealingQuality] = useState<SealingQuality>('conforme');
  const [packagingNotes, setPackagingNotes] = useState<string>('');

  // Balança da Linha (Conferência de Etiquetas de Calibração e Identificação)
  const [scaleCalibrationConforming, setScaleCalibrationConforming] = useState<boolean>(true);
  const [scaleCalibrationStatus, setScaleCalibrationStatus] = useState<ScaleCalibrationStatus>('conforme');
  const [scaleCalibrationValidityDate, setScaleCalibrationValidityDate] = useState<string>('12/2026');
  const [scaleIdentificationConforming, setScaleIdentificationConforming] = useState<boolean>(true);
  const [scaleTagNumber, setScaleTagNumber] = useState<string>(() => `BAL-${initialMachine || 'DR01'}`);
  const [scaleCheckNotes, setScaleCheckNotes] = useState<string>('');

  // Comunicação de Desvios ao Líder com Horário
  const [deviationReportedToLeader, setDeviationReportedToLeader] = useState<boolean>(false);
  const [deviationReportTime, setDeviationReportTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [deviationReportLeaderName, setDeviationReportLeaderName] = useState<string>(() => shiftLeaders[0]?.name || 'Fernando Rocha');
  const [deviationReportLeaderNotes, setDeviationReportLeaderNotes] = useState<string>('');

  // Ponto 7: Paradas de Máquina (Apenas Quantidade e Motivos, SEM horários)
  const [hasStoppage, setHasStoppage] = useState<boolean>(false);
  const [stoppageQuantity, setStoppageQuantity] = useState<string>('1');
  const [stoppageReasonsList, setStoppageReasonsList] = useState<StoppageReason[]>(['Troca de Tela']);
  const [hasMaintenanceOrderInProd, setHasMaintenanceOrderInProd] = useState<boolean>(false);
  const [operationalDeviationsNotes, setOperationalDeviationsNotes] = useState<string>('');

  // Fotos
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [photoCaption, setPhotoCaption] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<string[]>([]);
  const [savedSuccessAlert, setSavedSuccessAlert] = useState<boolean>(false);

  useEffect(() => {
    if (initialMachine) {
      setMachineId(initialMachine);
    }
  }, [initialMachine]);

  // Se operadores ou líderes forem atualizados no banco, sincroniza se necessário
  useEffect(() => {
    if (operators.length > 0 && !operators.some(o => o.name === operatorName)) {
      setOperatorName(operators[0].name);
    }
  }, [operators, operatorName]);

  useEffect(() => {
    if (shiftLeaders.length > 0 && !shiftLeaders.some(l => l.name === shiftLeader)) {
      setShiftLeader(shiftLeaders[0].name);
      setApprovingLeaderName(shiftLeaders[0].name);
      setDeviationReportLeaderName(shiftLeaders[0].name);
    }
  }, [shiftLeaders, shiftLeader]);

  // Detecção automática se há qualquer divergência para orientar o aviso ao líder
  const hasAnyQualityDeviation = 
    !temperaturesConforming || 
    !parametersMatchPreviousSheet || 
    !sealerTempConforming || 
    !labelCodesConforming || 
    sealingQuality !== 'conforme' ||
    !scaleCalibrationConforming ||
    scaleCalibrationStatus !== 'conforme' ||
    !scaleIdentificationConforming ||
    dos02Homogenization === 'irregular' ||
    !sideFeederConforming ||
    circulationSystemStatus === 'inativo' ||
    magnetStatus === 'limalha_detectada' ||
    magnetStatus === 'nao_conforme' ||
    sievePowderCondition === 'peneira_obstruida';

  const toggleStoppageReason = (reason: StoppageReason) => {
    setStoppageReasonsList(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const newPhoto: PhotoAttachment = {
            id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: file.name,
            dataUrl: result,
            caption: photoCaption.trim() || `Evidência ${machineId} (${LINE_STATUS_CONFIG[lineStatus].label})`,
            timestamp: new Date().toISOString(),
          };
          setPhotos((prev) => [...prev, newPhoto]);
          setPhotoCaption('');
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!operatorName.trim()) newErrors.push('Selecione o operador responsável pela linha.');
    if (!shiftLeader.trim()) newErrors.push('Selecione o líder do turno.');

    if (lineStatus === 'manutencao') {
      if (!maintenanceOrderNumber.trim()) {
        newErrors.push('Para linha em Manutenção, informe o número da Ordem de Manutenção (OM).');
      }
    } else if (lineStatus === 'setup') {
      if (!setupMaterial.trim()) {
        newErrors.push('Para linha em Setup, informe o material que está em setup.');
      }
    } else if (lineStatus === 'preventiva') {
      if (!operationalDeviationsNotes.trim()) {
        newErrors.push('Para linha em Preventiva, descreva o escopo da manutenção preventiva.');
      }
    } else if (lineStatus === 'em_producao') {
      // 1. Identificação do Produto e Ordem
      if (!productionOrder.trim()) newErrors.push('Número da Ordem de Produção (OP) é obrigatório.');
      if (!batchNumber.trim()) newErrors.push('Número do lote é obrigatório.');
      if (!productName.trim()) newErrors.push('Informe a descrição/código do Produto / Composto.');

      // 2. Parâmetros de Processo Atuais
      const prodNum = parseFloat(productivityKgh);
      if (isNaN(prodNum) || prodNum <= 0) {
        newErrors.push('Informe um valor válido e positivo para a produtividade atual (kg/h).');
      }

      const targetNum = parseFloat(targetProductivityKgh);
      if (isNaN(targetNum) || targetNum <= 0) {
        newErrors.push('Informe a meta de produtividade planejada (kg/h).');
      }

      const rpmNum = parseFloat(rpm);
      if (isNaN(rpmNum) || rpmNum <= 0) {
        newErrors.push('Informe o RPM atual da rosca da extrusora.');
      }

      const ampNum = parseFloat(motorAmperes);
      if (isNaN(ampNum) || ampNum <= 0) {
        newErrors.push('Informe a corrente do motor principal (Amperes).');
      }

      // 3. Ficha Técnica Anterior e Desvios de Parâmetros
      if (hasPreviousReferenceSheet) {
        if (!prevProductivityKgh || isNaN(parseFloat(prevProductivityKgh))) {
          newErrors.push('Informe a produtividade da ficha de referência anterior (kg/h).');
        }
        if (!prevRpm || isNaN(parseFloat(prevRpm))) {
          newErrors.push('Informe o RPM da ficha de referência anterior.');
        }
        if (!prevMotorAmperes || isNaN(parseFloat(prevMotorAmperes))) {
          newErrors.push('Informe a corrente (A) da ficha de referência anterior.');
        }
        if (!parametersMatchPreviousSheet) {
          if (!parameterDeviationReason.trim()) {
            newErrors.push('Informe obrigatoriamente o motivo pelo qual os parâmetros estão diferentes da ficha anterior.');
          }
          if (deviationApprovedByLeader && !approvingLeaderName.trim()) {
            newErrors.push('Informe o nome do líder que aprovou o desvio de parâmetros em relação à ficha.');
          }
        }
      }

      // 4. Temperaturas do Canhão
      if (temperaturesConforming === false && !temperatureDeviationZones.trim()) {
        newErrors.push('Para temperaturas não conformes, aponte quais zonas ou faixas estão fora de ficha.');
      }

      // 5. Dosadoras & Alimentação
      if (!dosers.dos01.value || !dosers.dos01.value.trim()) {
        newErrors.push('Informe o valor/resina da Dosadora 01 (DOS01).');
      }
      if (!dos02Homogenization) {
        newErrors.push('Informe a verificação de homogeneização da DOS02 (Conforme ou Não Conforme).');
      }
      if (dos02Homogenization === 'irregular' && !dos02HomogenizationNotes.trim()) {
        newErrors.push('Descreva o desvio de homogeneização observado na DOS02.');
      }

      // 6. Side Feeder (se ativo)
      if (hasSideFeeder) {
        const sfRpm = parseFloat(sideFeederCurrentRpm);
        if (isNaN(sfRpm) || sfRpm <= 0) {
          newErrors.push('Para Side Feeder em uso, informe o RPM atual.');
        }
      }

      // 7. Sistema de Circulação e Refrigeração
      if (!circulationSystemStatus) {
        newErrors.push('Selecione a condição do sistema de circulação/refrigeração da máquina.');
      }

      // 8. Condição dos Ímãs
      if (!magnetStatus) {
        newErrors.push('Selecione a condição de inspeção do ímã (Limpo, Limalha Detectada, Limpeza no Turno ou Não Conforme).');
      }
      if ((magnetStatus === 'limalha_detectada' || magnetStatus === 'nao_conforme') && !magnetNotes.trim()) {
        newErrors.push('Descreva a contaminação ou presença de partículas identificada no ímã.');
      }

      // 9. Condição de Pó na Peneira
      if (!sievePowderCondition) {
        newErrors.push('Selecione a condição de pó na peneira (Normal, Excesso de Pó, Obstruída ou Finos).');
      }
      if (sievePowderCondition !== 'normal' && !sieveNotes.trim()) {
        newErrors.push('Descreva a observação do pó ou bloqueio na peneira.');
      }

      // 10. Balança da Linha (Calibração e Identificação)
      if (!scaleCalibrationStatus) {
        newErrors.push('Selecione a condição da etiqueta de calibração da balança.');
      }
      if (!scaleTagNumber.trim()) {
        newErrors.push('Informe a identificação / Tag patrimonial da balança da linha (ex: BAL-DR01).');
      }
      if (scaleCalibrationStatus === 'conforme' && !scaleCalibrationValidityDate.trim()) {
        newErrors.push('Informe a data de validade que consta na etiqueta de calibração da balança.');
      }
      if (scaleCalibrationStatus !== 'conforme' && !scaleCheckNotes.trim()) {
        newErrors.push('Descreva a não conformidade constatada na calibração da balança da linha.');
      }

      // 11. Embalagem, Selagem e Etiquetas do Palete
      if (!sealerTempMeasured || isNaN(parseFloat(sealerTempMeasured))) {
        newErrors.push('Informe a temperatura medida na seladora (°C).');
      }
      if (!sealingQuality) {
        newErrors.push('Selecione a avaliação da qualidade da selagem da embalagem.');
      }
      if ((labelCodesConforming === false || sealingQuality !== 'conforme' || sealerTempConforming === false) && !packagingNotes.trim()) {
        newErrors.push('Descreva a observação / não conformidade no setor de embalagem e selagem.');
      }

      // 12. Paradas de Máquina
      if (hasStoppage) {
        const stopQty = parseInt(stoppageQuantity, 10);
        if (isNaN(stopQty) || stopQty <= 0) {
          newErrors.push('Informe a quantidade de paradas ocorridas na máquina.');
        }
        if (stoppageReasonsList.length === 0) {
          newErrors.push('Selecione pelo menos um motivo para a parada da máquina.');
        }
      }

      if (hasMaintenanceOrderInProd && !maintenanceOrderNumber.trim()) {
        newErrors.push('Informe o número da Ordem de Manutenção (OM) aberta durante a produção.');
      }

      // 13. Comunicação Obrigatória ao Líder de Turno em Caso de Desvio
      if (hasAnyQualityDeviation) {
        if (!deviationReportedToLeader) {
          newErrors.push('ATENÇÃO: Existem desvios operacionais/qualidade apontados. É OBRIGATÓRIO confirmar se o líder do turno foi comunicado.');
        } else {
          if (!deviationReportTime.trim()) {
            newErrors.push('Informe o horário exato em que o líder do turno foi comunicado sobre o desvio.');
          }
          if (!deviationReportLeaderName.trim()) {
            newErrors.push('Informe o nome do líder comunicado sobre os desvios de processo/qualidade.');
          }
        }
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors([]);

    let record: ProductionRecord;

    if (lineStatus === 'manutencao') {
      record = {
        id: 'rec-' + Date.now(),
        timestamp: new Date(dateTime).toISOString(),
        machineId,
        shift,
        operatorName,
        shiftLeader,
        lineStatus: 'manutencao',
        hasMaintenanceOrder: true,
        maintenanceOrderNumber: maintenanceOrderNumber.trim().toUpperCase(),
        hasStoppage: true,
        stoppageQuantity: 1,
        stoppageReasonsList: ['Mecânica'],
        operationalDeviationsNotes: operationalDeviationsNotes.trim() || 'Linha sob intervenção de manutenção.',
        photos,
      };
    } else if (lineStatus === 'setup') {
      record = {
        id: 'rec-' + Date.now(),
        timestamp: new Date(dateTime).toISOString(),
        machineId,
        shift,
        operatorName,
        shiftLeader,
        lineStatus: 'setup',
        setupMaterial: setupMaterial.trim(),
        productionOrder: productionOrder.trim().toUpperCase() || undefined,
        hasStoppage: true,
        stoppageQuantity: 1,
        stoppageReasonsList: ['Setup / Limpeza'],
        operationalDeviationsNotes: operationalDeviationsNotes.trim() || `Setup: ${setupMaterial.trim()}`,
        photos,
      };
    } else if (lineStatus === 'preventiva') {
      record = {
        id: 'rec-' + Date.now(),
        timestamp: new Date(dateTime).toISOString(),
        machineId,
        shift,
        operatorName,
        shiftLeader,
        lineStatus: 'preventiva',
        hasStoppage: true,
        stoppageQuantity: 1,
        stoppageReasonsList: ['Mecânica'],
        operationalDeviationsNotes: operationalDeviationsNotes.trim() || 'Manutenção preventiva programada.',
        photos,
      };
    } else if (lineStatus === 'inativa') {
      record = {
        id: 'rec-' + Date.now(),
        timestamp: new Date(dateTime).toISOString(),
        machineId,
        shift,
        operatorName,
        shiftLeader,
        lineStatus: 'inativa',
        hasStoppage: true,
        stoppageQuantity: 0,
        operationalDeviationsNotes: operationalDeviationsNotes.trim() || 'Linha inativa / sem programação.',
        photos,
      };
    } else {
      // em_producao
      record = {
        id: 'rec-' + Date.now(),
        timestamp: new Date(dateTime).toISOString(),
        machineId,
        shift,
        operatorName,
        shiftLeader,
        lineStatus: 'em_producao',
        productionOrder: productionOrder.trim().toUpperCase(),
        batchNumber: batchNumber.trim().toUpperCase(),
        productName: productName.trim() || 'Composto Termoplástico',
        
        productivityKgh: parseFloat(productivityKgh) || 0,
        targetProductivityKgh: parseFloat(targetProductivityKgh) || 450,
        rpm: parseFloat(rpm) || 0,
        motorAmperes: parseFloat(motorAmperes) || 0,
        
        hasPreviousReferenceSheet,
        prevProductivityKgh: hasPreviousReferenceSheet ? (parseFloat(prevProductivityKgh) || undefined) : undefined,
        prevRpm: hasPreviousReferenceSheet ? (parseFloat(prevRpm) || undefined) : undefined,
        prevMotorAmperes: hasPreviousReferenceSheet ? (parseFloat(prevMotorAmperes) || undefined) : undefined,
        
        temperaturesConforming,
        temperatureDeviationZones: temperaturesConforming ? undefined : temperatureDeviationZones.trim(),
        
        parametersMatchPreviousSheet,
        parameterDeviationReason: parametersMatchPreviousSheet ? undefined : parameterDeviationReason.trim(),
        dopObservationsIdentified,
        dopObservationsDetails: dopObservationsIdentified ? dopObservationsDetails.trim() : undefined,
        deviationApprovedByLeader: parametersMatchPreviousSheet ? false : deviationApprovedByLeader,
        approvingLeaderName: (parametersMatchPreviousSheet || !deviationApprovedByLeader) ? undefined : approvingLeaderName.trim(),
        
        dosers,
        dos02Homogenization,
        dos02HomogenizationNotes: dos02HomogenizationNotes.trim() || undefined,
        
        hasSideFeeder,
        sideFeederCurrentRpm: hasSideFeeder ? (parseFloat(sideFeederCurrentRpm) || undefined) : undefined,
        sideFeederPreviousRpm: (hasSideFeeder && hasPreviousReferenceSheet) ? (parseFloat(sideFeederPreviousRpm) || undefined) : undefined,
        sideFeederConforming: hasSideFeeder ? sideFeederConforming : undefined,
        
        circulationSystemStatus,
        
        magnetStatus,
        magnetNotes: magnetNotes.trim() || undefined,
        sievePowderCondition,
        sieveNotes: sieveNotes.trim() || undefined,
        
        sealerTempConforming,
        sealerTempMeasured: sealerTempMeasured ? parseFloat(sealerTempMeasured) : undefined,
        labelCodesConforming,
        sealingQuality,
        packagingNotes: packagingNotes.trim() || undefined,
        
        scaleCalibrationConforming,
        scaleCalibrationStatus,
        scaleCalibrationValidityDate: scaleCalibrationValidityDate.trim() || undefined,
        scaleIdentificationConforming,
        scaleTagNumber: scaleTagNumber.trim().toUpperCase() || undefined,
        scaleCheckNotes: scaleCheckNotes.trim() || undefined,
        
        deviationReportedToLeader,
        deviationReportTime: deviationReportedToLeader ? deviationReportTime : undefined,
        deviationReportLeaderName: deviationReportedToLeader ? deviationReportLeaderName : undefined,
        deviationReportLeaderNotes: deviationReportedToLeader ? deviationReportLeaderNotes.trim() : undefined,
        
        hasStoppage,
        stoppageQuantity: hasStoppage ? parseInt(stoppageQuantity, 10) : 0,
        stoppageReasonsList: hasStoppage ? stoppageReasonsList : [],
        stoppageReason: hasStoppage && stoppageReasonsList.length > 0 ? stoppageReasonsList[0] : undefined,
        hasMaintenanceOrder: hasMaintenanceOrderInProd,
        maintenanceOrderNumber: hasMaintenanceOrderInProd ? maintenanceOrderNumber.trim().toUpperCase() : undefined,
        operationalDeviationsNotes: operationalDeviationsNotes.trim() || undefined,
        photos,
      };
    }

    onSaveSuccess(record);
    setSavedSuccessAlert(true);
    setTimeout(() => setSavedSuccessAlert(false), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Modal de Gestão da Equipe (CRUD) */}
      <TeamManagerModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        operators={operators}
        shiftLeaders={shiftLeaders}
        onUpdateOperators={onUpdateOperators}
        onUpdateShiftLeaders={onUpdateShiftLeaders}
      />

      {/* Banner Superior */}
      <div className="bg-red-950 text-white p-6 rounded-xl border border-red-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
            <h1 className="text-xl font-bold tracking-tight">
              Coleta de Informações Operacionais de Turno
            </h1>
          </div>
          <p className="text-xs text-red-200/90 mt-1 max-w-2xl">
            Inspeção completa: Ficha técnica anterior comparativa, dosadoras 01 a 04, side feeder, homogeneização DOS02, circulação e registro de paradas por quantidade e motivo.
          </p>
        </div>
        <span className="px-3 py-1 bg-red-900 border border-red-800 rounded-lg text-xs font-mono font-medium text-red-100">
          Linha: <strong className="text-white font-bold">{machineId}</strong>
        </span>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-red-800 text-sm">
          <div className="flex items-center gap-2 font-bold mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Atenção: verifique os seguintes itens antes de salvar:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {savedSuccessAlert && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-900 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong>Apontamento gravado com sucesso!</strong>
            <p className="text-xs text-emerald-800">
              O status da linha {machineId} e os dados operacionais foram sincronizados no painel e relatórios.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* PARTE 1: IDENTIFICAÇÃO DA LINHA, TURNO E RESPONSÁVEL (COM DROPDOWN DO BANCO DE DADOS) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-red-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                1
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Identificação da Linha, Turno e Responsáveis
              </h2>
            </div>
            
            {/* Botão para Gerenciar Banco de Dados de Operadores e Líderes */}
            <button
              type="button"
              onClick={() => setIsTeamModalOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Gerenciar Equipe (CRUD)</span>
            </button>
          </div>

          {/* Seleção da Linha */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              1.1 Extrusora:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {MACHINE_LIST.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => handleMachineChange(m)}
                  className={`py-3 px-2 rounded-lg font-mono font-bold text-sm transition-all border cursor-pointer ${
                    machineId === m
                      ? 'bg-red-900 text-white border-red-950 ring-2 ring-red-400 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Status Inicial da Linha */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-900">
                1.2 Status Operacional da Extrusora {machineId}:
              </label>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Padrão Global: <strong className="text-slate-800">{LINE_STATUS_CONFIG[getGlobalLineStatuses()[machineId]?.status || 'em_producao']?.label}</strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <button
                type="button"
                onClick={() => setLineStatus('em_producao')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  lineStatus === 'em_producao'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Em Produção
                </span>
                <p className="text-[11px] text-slate-500 mt-2">
                  Linha operando normalmente. Seguir com a coleta completa.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLineStatus('manutencao')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  lineStatus === 'manutencao'
                    ? 'bg-red-50 border-red-500 ring-2 ring-red-400 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-red-600" />
                  Manutenção
                </span>
                <p className="text-[11px] text-slate-500 mt-2">
                  Intervenção corretiva. Informar apenas o <strong>Número da OM</strong>.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLineStatus('setup')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  lineStatus === 'setup'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" />
                  Setup
                </span>
                <p className="text-[11px] text-slate-500 mt-2">
                  Troca de resina/molde. Informar o <strong>Material em setup</strong>.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLineStatus('preventiva')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  lineStatus === 'preventiva'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                  Preventiva
                </span>
                <p className="text-[11px] text-slate-500 mt-2">
                  Preventiva programada. <strong>Não exige parâmetros</strong>.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLineStatus('inativa')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  lineStatus === 'inativa'
                    ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-400 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <PowerOff className="w-3.5 h-3.5 text-slate-600" />
                  Inativa
                </span>
                <p className="text-[11px] text-slate-500 mt-2">
                  Sem programação. <strong>Não exige parâmetros</strong>.
                </p>
              </button>
            </div>
          </div>

          {/* Dados Gerais: Data/Hora, Turno, Caixa de Seleção para Operador e Líder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data e Horário:
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Turno:
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as ShiftType)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none"
              >
                <option value="Turno 1 (06h - 14h)">Turno 1 (06h - 14h)</option>
                <option value="Turno 2 (14h - 22h)">Turno 2 (14h - 22h)</option>
                <option value="Turno 3 (22h - 06h)">Turno 3 (22h - 06h)</option>
              </select>
            </div>

            {/* CAIXA DE SELEÇÃO: Operador da Linha */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Operador da Linha: <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(true)}
                  className="text-[10px] text-red-700 hover:underline cursor-pointer"
                >
                  + Editar
                </button>
              </div>
              <select
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none cursor-pointer"
                required
              >
                {operators.map((op) => (
                  <option key={op.id} value={op.name}>
                    {op.name}
                  </option>
                ))}
              </select>
            </div>

            {/* CAIXA DE SELEÇÃO: Líder / Responsável do Turno */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Líder / Responsável do Turno: <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(true)}
                  className="text-[10px] text-red-700 hover:underline cursor-pointer"
                >
                  + Editar
                </button>
              </div>
              <select
                value={shiftLeader}
                onChange={(e) => {
                  setShiftLeader(e.target.value);
                  setApprovingLeaderName(e.target.value);
                  setDeviationReportLeaderName(e.target.value);
                }}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none cursor-pointer"
                required
              >
                {shiftLeaders.map((ldr) => (
                  <option key={ldr.id} value={ldr.name}>
                    {ldr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* STATUS: MANUTENÇÃO                                             */}
        {/* ============================================================== */}
        {lineStatus === 'manutencao' && (
          <div className="bg-red-50/70 rounded-xl border border-red-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-red-200 pb-3">
              <Wrench className="w-5 h-5 text-red-700" />
              <div>
                <h3 className="text-sm font-bold text-red-900 uppercase tracking-wide">
                  Linha em Manutenção
                </h3>
                <p className="text-xs text-red-700">
                  Informe apenas o número da Ordem de Manutenção (OM). Os demais parâmetros não são exigidos.
                </p>
              </div>
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-bold text-red-950 mb-1">
                Número da Ordem de Manutenção (OM): <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: OM-2026-8845"
                value={maintenanceOrderNumber}
                onChange={(e) => setMaintenanceOrderNumber(e.target.value)}
                className="w-full text-base font-mono font-bold uppercase bg-white border border-red-300 rounded-lg p-3 focus:ring-2 focus:ring-red-600 focus:outline-none shadow-xs"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações da Manutenção (Opcional):
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Troca de rolamento do motor ou queima de termopar na zona 3..."
                value={operationalDeviationsNotes}
                onChange={(e) => setOperationalDeviationsNotes(e.target.value)}
                className="w-full text-xs bg-white border border-red-200 rounded-lg p-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STATUS: SETUP                                                  */}
        {/* ============================================================== */}
        {lineStatus === 'setup' && (
          <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
              <Sliders className="w-5 h-5 text-amber-700" />
              <div>
                <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
                  Linha em Setup
                </h3>
                <p className="text-xs text-amber-800">
                  Informe o material que está em setup.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1">
                Material / Composto que está em Setup: <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: PP Composto com Carga Mineral 30% Preto (Troca de Matriz e Tela)"
                value={setupMaterial}
                onChange={(e) => setSetupMaterial(e.target.value)}
                className="w-full text-sm font-medium bg-white border border-amber-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  OP Prevista (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: OP-48240"
                  value={productionOrder}
                  onChange={(e) => setProductionOrder(e.target.value)}
                  className="w-full text-xs font-mono uppercase bg-white border border-amber-200 rounded-lg p-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações do Setup (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Limpeza de canhão e troca de tela 80 mesh"
                  value={operationalDeviationsNotes}
                  onChange={(e) => setOperationalDeviationsNotes(e.target.value)}
                  className="w-full text-xs bg-white border border-amber-200 rounded-lg p-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STATUS: PREVENTIVA OU INATIVA                                  */}
        {/* ============================================================== */}
        {(lineStatus === 'preventiva' || lineStatus === 'inativa') && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 shadow-xs text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 mx-auto flex items-center justify-center">
              {lineStatus === 'preventiva' ? <CalendarClock className="w-6 h-6 text-blue-700" /> : <PowerOff className="w-6 h-6 text-slate-700" />}
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Linha {machineId} em {lineStatus === 'preventiva' ? 'Manutenção Preventiva' : 'Status Inativa'}
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              {lineStatus === 'preventiva'
                ? 'A extrusora está sob rotina preventiva programada. Nenhum parâmetro operacional adicional precisa ser informado.'
                : 'A extrusora está desligada / sem programação para este turno. Nenhum parâmetro operacional precisa ser informado.'}
            </p>

            <div className="pt-3 max-w-md mx-auto text-left">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Anotação Adicional (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: Previsão de liberação às 14:00"
                value={operationalDeviationsNotes}
                onChange={(e) => setOperationalDeviationsNotes(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded p-2 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STATUS: EM PRODUÇÃO (FLUXO COMPLETO)                           */}
        {/* ============================================================== */}
        {lineStatus === 'em_producao' && (
          <>
            {/* Bloco 2: OP, Lote e Produto */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-md bg-red-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                  2
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Dados da Ordem de Produção (OP) & Lote
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número da OP: <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: OP-48230"
                    value={productionOrder}
                    onChange={(e) => setProductionOrder(e.target.value)}
                    className="w-full text-xs font-mono font-medium uppercase bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número do Lote: <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: LT-2610-09"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full text-xs font-mono font-medium uppercase bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Produto / Composto:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PP Carga Mineral 30% Preto"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* CAMPO 3: PARÂMETROS DE OPERAÇÃO & FICHA DE PROCESSO (ATUAL VS FICHA ANTERIOR DE REFERÊNCIA) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-md bg-red-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                  3
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Parâmetros de Operação & Comparação com Ficha Anterior
                </h2>
              </div>

              {/* 3.1 Parâmetros Atuais */}
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-2">
                  3.1 Parâmetros Atuais Medidos na Extrusora:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Produtividade Atual (kg/h): <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={productivityKgh}
                      onChange={(e) => setProductivityKgh(e.target.value)}
                      className="w-full text-lg font-bold font-mono bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-red-600 focus:outline-none tabular-nums"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Vazão real em ensaque</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Meta Esperada (kg/h):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={targetProductivityKgh}
                      onChange={(e) => setTargetProductivityKgh(e.target.value)}
                      className="w-full text-lg font-bold font-mono bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-red-600 focus:outline-none tabular-nums"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Padrão da ficha da OP</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      RPM da Rosca: <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={rpm}
                      onChange={(e) => setRpm(e.target.value)}
                      className="w-full text-lg font-bold font-mono bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-red-600 focus:outline-none tabular-nums"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Rotação no painel</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Corrente do Motor (A): <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={motorAmperes}
                      onChange={(e) => setMotorAmperes(e.target.value)}
                      className="w-full text-lg font-bold font-mono bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-red-600 focus:outline-none tabular-nums"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Carga do inversor</span>
                  </div>
                </div>
              </div>

              {/* 3.2 Condições da Ficha de Processo Anterior de Referência */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      3.2 Condições da Ficha de Processo Anterior de Referência (kg/h, RPM e Corrente):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Caso não exista ficha anterior cadastrada com referências, marque a opção correspondente.
                    </span>
                  </div>

                  {/* Toggle: Existe Ficha de Referência? */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHasPreviousReferenceSheet(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        hasPreviousReferenceSheet
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Sim, Há Ficha Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasPreviousReferenceSheet(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        !hasPreviousReferenceSheet
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Não Há Ficha de Referência
                    </button>
                  </div>
                </div>

                {hasPreviousReferenceSheet ? (
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Produtividade Ficha Anterior (kg/h):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={prevProductivityKgh}
                          onChange={(e) => setPrevProductivityKgh(e.target.value)}
                          placeholder="Ex: 435"
                          className="w-full text-sm font-mono bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-red-600 focus:outline-none tabular-nums"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Diferença atual: <strong className={parseFloat(productivityKgh) >= parseFloat(prevProductivityKgh) ? 'text-emerald-700' : 'text-red-700'}>
                            {((parseFloat(productivityKgh) || 0) - (parseFloat(prevProductivityKgh) || 0)).toFixed(1)} kg/h
                          </strong>
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          RPM da Ficha Anterior:
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={prevRpm}
                          onChange={(e) => setPrevRpm(e.target.value)}
                          placeholder="Ex: 370"
                          className="w-full text-sm font-mono bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-red-600 focus:outline-none tabular-nums"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Diferença atual: <strong>{((parseFloat(rpm) || 0) - (parseFloat(prevRpm) || 0)).toFixed(0)} RPM</strong>
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Corrente do Motor Anterior (A):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={prevMotorAmperes}
                          onChange={(e) => setPrevMotorAmperes(e.target.value)}
                          placeholder="Ex: 68.0"
                          className="w-full text-sm font-mono bg-white border border-slate-300 rounded p-2 focus:ring-2 focus:ring-red-600 focus:outline-none tabular-nums"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Diferença atual: <strong>{((parseFloat(motorAmperes) || 0) - (parseFloat(prevMotorAmperes) || 0)).toFixed(1)} A</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Sem Ficha de Processo de Referência Anterior:</strong> Apontamento registrado como nova corrida / primeiro lote sem histórico comparativo disponível.
                    </span>
                  </div>
                )}
              </div>

              {/* 3.3 Temperaturas de acordo com a Ficha de Processo */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Temperaturas da Máquina estão de acordo com a Ficha de Processo?
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTemperaturesConforming(true)}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      temperaturesConforming
                        ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-300'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Sim, Conforme Ficha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemperaturesConforming(false)}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      !temperaturesConforming
                        ? 'bg-red-700 text-white border-red-800 ring-2 ring-red-300'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Não, Há Desvio Térmico</span>
                  </button>
                </div>

                {!temperaturesConforming && (
                  <div className="mt-3 bg-red-50 border border-red-200 p-3 rounded-lg space-y-1">
                    <label className="block text-xs font-semibold text-red-900">
                      Descreva as Zonas com Desvio Térmico e Valores Medidos:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Zona 3 setpoint 210°C / medido 228°C"
                      value={temperatureDeviationZones}
                      onChange={(e) => setTemperatureDeviationZones(e.target.value)}
                      className="w-full text-xs bg-white border border-red-300 rounded p-2 focus:ring-2 focus:ring-red-600 focus:outline-none"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bloco 4: Gestão de Mudanças, DOP & Aprovação do Líder */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-md bg-red-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                  4
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Gestão de Mudanças, Diário de Produção (DOP) & Aprovação
                </h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Os parâmetros operacionais atuais estão de acordo com a Ficha Anterior do lote/OP?
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setParametersMatchPreviousSheet(true)}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      parametersMatchPreviousSheet
                        ? 'bg-slate-800 text-white border-slate-900 ring-2 ring-slate-400'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Sim, Conforme Ficha Anterior</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParametersMatchPreviousSheet(false)}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      !parametersMatchPreviousSheet
                        ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-300'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Não, Parâmetros Alterados</span>
                  </button>
                </div>
              </div>

              {!parametersMatchPreviousSheet && (
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">
                      Justificativa / Motivo da alteração de parâmetros: <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Redução de RPM para estabilizar massa..."
                      value={parameterDeviationReason}
                      onChange={(e) => setParameterDeviationReason(e.target.value)}
                      className="w-full text-xs bg-white border border-amber-300 rounded-lg p-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="pt-2 border-t border-amber-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Identificado anotação no Diário de Produção (DOP)?
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDopObservationsIdentified(true)}
                          className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                            dopObservationsIdentified ? 'bg-amber-700 text-white' : 'bg-white border text-slate-700'
                          }`}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setDopObservationsIdentified(false)}
                          className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                            !dopObservationsIdentified ? 'bg-slate-700 text-white' : 'bg-white border text-slate-700'
                          }`}
                        >
                          Não
                        </button>
                      </div>
                    </div>

                    {dopObservationsIdentified && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Anotação no DOP (Ex: DOP pág 15 - Ajuste de rotação)"
                          value={dopObservationsDetails}
                          onChange={(e) => setDopObservationsDetails(e.target.value)}
                          className="w-full text-xs bg-white border border-amber-300 rounded p-2 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-amber-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Modificações aprovadas pelo Líder do Turno?
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDeviationApprovedByLeader(true)}
                          className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                            deviationApprovedByLeader ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700'
                          }`}
                        >
                          Sim, Aprovado
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeviationApprovedByLeader(false)}
                          className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                            !deviationApprovedByLeader ? 'bg-red-700 text-white' : 'bg-white border text-slate-700'
                          }`}
                        >
                          Não
                        </button>
                      </div>
                    </div>

                    {deviationApprovedByLeader && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-600 shrink-0">Líder que Aprovou:</span>
                        <select
                          value={approvingLeaderName}
                          onChange={(e) => setApprovingLeaderName(e.target.value)}
                          className="flex-1 text-xs bg-white border border-amber-300 rounded p-1.5 focus:outline-none font-semibold text-slate-800"
                        >
                          {shiftLeaders.map(l => (
                            <option key={l.id} value={l.name}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* BLOCO 5: DOSADORAS (01 A 04), HOMOGENEIZAÇÃO DA DOS02, SIDE FEEDER & CIRCULAÇÃO */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-md bg-red-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                  5
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Conferência de Dosadoras (01-04), Side Feeder & Circulação
                </h2>
              </div>

              {/* 5.1 Conferência das Dosadoras 01 a 04 */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2">
                  5.1 Conferência de Dosagem nas Dosadoras:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'dos01' as const, label: 'Dosadora 01 (DOS01)' },
                    { key: 'dos02' as const, label: 'Dosadora 02 (DOS02)' },
                    { key: 'dos03' as const, label: 'Dosadora 03 (DOS03)' },
                    { key: 'dos04' as const, label: 'Dosadora 04 (DOS04)' },
                  ].map(({ key, label }) => {
                    const item = dosers[key];
                    return (
                      <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800">{label}</span>
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) => setDosers({
                              ...dosers,
                              [key]: { ...item, checked: e.target.checked }
                            })}
                            className="rounded text-red-600 focus:ring-red-500 cursor-pointer"
                            title="Ativa nesta OP"
                          />
                        </div>

                        {item.checked ? (
                          <>
                            <input
                              type="text"
                              placeholder="Ex: 70% PP / 35 kg/h"
                              value={item.value || ''}
                              onChange={(e) => setDosers({
                                ...dosers,
                                [key]: { ...item, value: e.target.value }
                              })}
                              className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-none"
                            />
                            <div className="flex gap-1 pt-1">
                              <button
                                type="button"
                                onClick={() => setDosers({
                                  ...dosers,
                                  [key]: { ...item, conforming: true }
                                })}
                                className={`flex-1 py-1 text-[11px] font-bold rounded cursor-pointer ${
                                  item.conforming ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-600'
                                }`}
                              >
                                Conforme
                              </button>
                              <button
                                type="button"
                                onClick={() => setDosers({
                                  ...dosers,
                                  [key]: { ...item, conforming: false }
                                })}
                                className={`flex-1 py-1 text-[11px] font-bold rounded cursor-pointer ${
                                  !item.conforming ? 'bg-red-700 text-white' : 'bg-white border text-slate-600'
                                }`}
                              >
                                Desvio
                              </button>
                            </div>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 block py-1">Não utilizada nesta OP</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5.2 Homogeneização da DOS02 */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-900 mb-2">
                  5.2 Verificação da Homogeneização da Dosadora 02 (DOS02):
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => setDos02Homogenization('conforme')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        dos02Homogenization === 'conforme'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border text-slate-700'
                      }`}
                    >
                      Conforme (Homogênea / Sem Grumos)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDos02Homogenization('irregular')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        dos02Homogenization === 'irregular'
                          ? 'bg-red-700 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border text-slate-700'
                      }`}
                    >
                      Irregular / Segregação de Material
                    </button>
                    <button
                      type="button"
                      onClick={() => setDos02Homogenization('nao_aplicavel')}
                      className={`py-2 px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        dos02Homogenization === 'nao_aplicavel'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-50 hover:bg-slate-100 border text-slate-600'
                      }`}
                    >
                      N/A
                    </button>
                  </div>

                  {dos02Homogenization === 'irregular' && (
                    <input
                      type="text"
                      placeholder="Descreva o desvio na DOS02 (Ex: acúmulo de pó, rosca travando)"
                      value={dos02HomogenizationNotes}
                      onChange={(e) => setDos02HomogenizationNotes(e.target.value)}
                      className="flex-1 text-xs bg-white border border-red-300 rounded-lg p-2 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* 5.3 RPM do Side Feeder (Atual vs OP Anterior de Referência) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-900">
                    5.3 Verificação de RPM do Side Feeder (Alimentador Lateral):
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSideFeeder}
                      onChange={(e) => setHasSideFeeder(e.target.checked)}
                      className="rounded text-red-600"
                    />
                    <span>Utiliza Side Feeder</span>
                  </label>
                </div>

                {hasSideFeeder ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        RPM Side Feeder Atual:
                      </label>
                      <input
                        type="number"
                        value={sideFeederCurrentRpm}
                        onChange={(e) => setSideFeederCurrentRpm(e.target.value)}
                        placeholder="Ex: 280"
                        className="w-full text-xs font-mono bg-white border border-slate-300 rounded p-1.5 focus:outline-none tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        RPM da OP Anterior (Referência):
                      </label>
                      <input
                        type="number"
                        value={sideFeederPreviousRpm}
                        onChange={(e) => setSideFeederPreviousRpm(e.target.value)}
                        placeholder="Ex: 280"
                        disabled={!hasPreviousReferenceSheet}
                        className={`w-full text-xs font-mono rounded p-1.5 focus:outline-none tabular-nums ${
                          hasPreviousReferenceSheet ? 'bg-white border border-slate-300' : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      />
                      {!hasPreviousReferenceSheet && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">Sem OP anterior</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Status do Side Feeder:
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSideFeederConforming(true)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded cursor-pointer ${
                            sideFeederConforming ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          Conforme
                        </button>
                        <button
                          type="button"
                          onClick={() => setSideFeederConforming(false)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded cursor-pointer ${
                            !sideFeederConforming ? 'bg-red-700 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          Divergente
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Extrusora sem alimentação por Side Feeder para esta OP.</span>
                )}
              </div>

              {/* 5.4 Sistema de Circulação / Refrigeração (Ativo ou Inativo) */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-900 block">
                    5.4 Sistema de Circulação / Refrigeração:
                  </label>
                  <span className="text-[11px] text-slate-500">
                    O sistema de bombeamento e água de circulação deve permanecer ativo durante o processo.
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCirculationSystemStatus('ativo')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                      circulationSystemStatus === 'ativo'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                    <span>Ativo / Operando</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCirculationSystemStatus('inativo')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                      circulationSystemStatus === 'inativo'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Inativo / Desligado</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bloco 6: Ímã, Peneira, Balança da Linha, Seladoras & Embalagens */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-md bg-red-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                  6
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Ímã, Peneira, Balança da Linha, Seladoras & Embalagens
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ímã */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Avaliação do Ímã:
                  </label>
                  <select
                    value={magnetStatus}
                    onChange={(e) => setMagnetStatus(e.target.value as MagnetStatus)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="limpo">Conforme - Ímã Limpo</option>
                    <option value="limpeza_realizada">Limpeza Realizada no Turno</option>
                    <option value="limalha_detectada">Alerta - Presença de Limalha</option>
                    <option value="nao_conforme">Não Conforme</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Observações do ímã (opcional)"
                    value={magnetNotes}
                    onChange={(e) => setMagnetNotes(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-none"
                  />
                </div>

                {/* Peneira / Pó */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Condições de Pó na Peneira:
                  </label>
                  <select
                    value={sievePowderCondition}
                    onChange={(e) => setSievePowderCondition(e.target.value as SievePowderCondition)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="normal">Normal - Fluxo contínuo</option>
                    <option value="presenca_finos">Presença de Finos</option>
                    <option value="excesso_po">Excesso de Pó</option>
                    <option value="peneira_obstruida">Peneira Obstruída</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Ação tomada na peneira (opcional)"
                    value={sieveNotes}
                    onChange={(e) => setSieveNotes(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* CONFERÊNCIA OBRIGATÓRIA DA BALANÇA DA LINHA (CALIBRAÇÃO E IDENTIFICAÇÃO) */}
              <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-red-800 text-white flex items-center justify-center">
                      <Scale className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Balança da Linha · Calibração & Identificação
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Conferência obrigatória: certifique-se de que a balança está identificada e com etiqueta de calibração válida.
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    scaleCalibrationConforming && scaleIdentificationConforming && scaleCalibrationStatus === 'conforme'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-red-50 text-red-800 border-red-300'
                  }`}>
                    {scaleCalibrationConforming && scaleIdentificationConforming && scaleCalibrationStatus === 'conforme'
                      ? 'Balança Conforme'
                      : 'Desvio na Balança'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Etiqueta de Calibração */}
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Etiqueta de Calibração:</span>
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setScaleCalibrationConforming(true);
                            setScaleCalibrationStatus('conforme');
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                            scaleCalibrationConforming ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Conforme / Válida
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScaleCalibrationConforming(false);
                            if (scaleCalibrationStatus === 'conforme') setScaleCalibrationStatus('vencida');
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                            !scaleCalibrationConforming ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Incorreta / Vencida
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Status da Calibração:</label>
                        <select
                          value={scaleCalibrationStatus}
                          onChange={(e) => {
                            const val = e.target.value as ScaleCalibrationStatus;
                            setScaleCalibrationStatus(val);
                            setScaleCalibrationConforming(val === 'conforme');
                          }}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-none focus:bg-white"
                        >
                          <option value="conforme">Conforme - Dentro da Validade</option>
                          <option value="vencida">Calibração Vencida / Expirada</option>
                          <option value="sem_etiqueta">Sem Etiqueta de Calibração</option>
                          <option value="danificada">Etiqueta Danificada / Ilegível</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Validade Impressa na Etiqueta:</label>
                        <input
                          type="text"
                          placeholder="Ex: 12/2026 ou 15/11/2026"
                          value={scaleCalibrationValidityDate}
                          onChange={(e) => setScaleCalibrationValidityDate(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-none focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Identificação da Balança */}
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Identificação da Balança (Tag / Patrimônio):
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setScaleIdentificationConforming(true)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                            scaleIdentificationConforming ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Conforme
                        </button>
                        <button
                          type="button"
                          onClick={() => setScaleIdentificationConforming(false)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                            !scaleIdentificationConforming ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Divergente / Ausente
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Código / Tag da Balança:</label>
                        <input
                          type="text"
                          placeholder="Ex: BAL-DR01"
                          value={scaleTagNumber}
                          onChange={(e) => setScaleTagNumber(e.target.value.toUpperCase())}
                          className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-none focus:bg-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Obs. da Balança (opcional):</label>
                        <input
                          type="text"
                          placeholder="Ex: Prato limpo, zerada corretamente"
                          value={scaleCheckNotes}
                          onChange={(e) => setScaleCheckNotes(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-none focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alerta de Desvio na Balança */}
                {(!scaleCalibrationConforming || scaleCalibrationStatus !== 'conforme' || !scaleIdentificationConforming) && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-900 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      <strong>Atenção:</strong> Balança com etiqueta de calibração vencida/ausente ou identificação divergente. O ensaque e a pesagem de embalagens não devem prosseguir sem a validação do Líder de Turno.
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Seladora */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Temperatura da Seladora:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSealerTempConforming(true)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                        sealerTempConforming ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      Conforme
                    </button>
                    <button
                      type="button"
                      onClick={() => setSealerTempConforming(false)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                        !sealerTempConforming ? 'bg-red-700 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      Incorreta
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600">Temp. Medida (°C):</label>
                    <input
                      type="number"
                      value={sealerTempMeasured}
                      onChange={(e) => setSealerTempMeasured(e.target.value)}
                      placeholder="Ex: 145"
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded p-1.5 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Etiquetas */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Conferência das Etiquetas:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLabelCodesConforming(true)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                        labelCodesConforming ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      Conforme
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabelCodesConforming(false)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                        !labelCodesConforming ? 'bg-red-700 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      Divergente
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    OP: <strong>{productionOrder}</strong> · Lote: <strong>{batchNumber}</strong>
                  </span>
                </div>

                {/* Qualidade Selagem */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Qualidade da Selagem:
                  </label>
                  <select
                    value={sealingQuality}
                    onChange={(e) => setSealingQuality(e.target.value as SealingQuality)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="conforme">Conforme</option>
                    <option value="defeituosa">Defeituosa</option>
                    <option value="queimada">Queimada</option>
                    <option value="aberta">Aberta</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Observações do ensaque"
                    value={packagingNotes}
                    onChange={(e) => setPackagingNotes(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* COMUNICAÇÃO DE DESVIOS AO LÍDER (COM HORÁRIO) */}
              <div className="mt-3 p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Desvio Identificado (Balança, Seladora, Etiqueta, Selagem ou Ficha) foi repassado ao Líder?
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Registre se a liderança foi acionada para alinhamento operacional.
                    </span>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDeviationReportedToLeader(true)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                        deviationReportedToLeader ? 'bg-amber-800 text-white shadow-xs' : 'bg-white border text-slate-700'
                      }`}
                    >
                      Sim, Repassado
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviationReportedToLeader(false)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                        !deviationReportedToLeader ? 'bg-slate-700 text-white' : 'bg-white border text-slate-700'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {deviationReportedToLeader && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        Horário do Comunicado: <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="time"
                        value={deviationReportTime}
                        onChange={(e) => setDeviationReportTime(e.target.value)}
                        className="w-full text-xs font-mono font-bold bg-white border border-amber-300 rounded p-2 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        Líder que Recebeu:
                      </label>
                      <select
                        value={deviationReportLeaderName}
                        onChange={(e) => setDeviationReportLeaderName(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-amber-300 rounded p-2 focus:outline-none"
                      >
                        {shiftLeaders.map(l => (
                          <option key={l.id} value={l.name}>{l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        Orientação / Ação Acordada com o Líder:
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Liberado prosseguir com monitoramento"
                        value={deviationReportLeaderNotes}
                        onChange={(e) => setDeviationReportLeaderNotes(e.target.value)}
                        className="w-full text-xs bg-white border border-amber-300 rounded p-2 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PONTO 7: PARADAS DE MÁQUINA & OM (APENAS QUANTIDADES E MOTIVOS, SEM HORÁRIOS) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-md bg-red-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                  7
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Paradas de Máquina (Quantidades e Motivos) & OM
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parada: Quantidade e Motivos */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        Houve Parada da Extrusora no Período?
                      </label>
                      <span className="text-[10px] text-slate-500">Informe apenas a quantidade e os motivos</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHasStoppage(true)}
                        className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                          hasStoppage ? 'bg-red-700 text-white' : 'bg-white border text-slate-700'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHasStoppage(false);
                          setStoppageQuantity('0');
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                          !hasStoppage ? 'bg-slate-700 text-white' : 'bg-white border text-slate-700'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>

                  {hasStoppage && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Quantidade de Paradas: <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={stoppageQuantity}
                          onChange={(e) => setStoppageQuantity(e.target.value)}
                          placeholder="Ex: 2"
                          className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded p-2 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Selecione o(s) Motivo(s) da(s) Parada(s):
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {STOPPAGE_REASONS_LIST.map((reason) => {
                            const isSelected = stoppageReasonsList.includes(reason);
                            return (
                              <button
                                type="button"
                                key={reason}
                                onClick={() => toggleStoppageReason(reason)}
                                className={`p-2 rounded text-left text-xs font-medium border transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-red-100 border-red-400 text-red-950 font-bold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected ? '✓ ' : '+ '} {reason}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ordem de Manutenção (OM) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        Ordem de Manutenção (OM) Aberta?
                      </label>
                      <span className="text-[10px] text-slate-500">Chamado técnico para a equipe</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHasMaintenanceOrderInProd(true)}
                        className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                          hasMaintenanceOrderInProd ? 'bg-red-700 text-white' : 'bg-white border text-slate-700'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHasMaintenanceOrderInProd(false);
                          setMaintenanceOrderNumber('');
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                          !hasMaintenanceOrderInProd ? 'bg-slate-700 text-white' : 'bg-white border text-slate-700'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>

                  {hasMaintenanceOrderInProd && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Número da OM:
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: OM-2026-8845"
                        value={maintenanceOrderNumber}
                        onChange={(e) => setMaintenanceOrderNumber(e.target.value)}
                        className="w-full text-xs font-mono font-bold uppercase bg-white border border-slate-300 rounded p-2 focus:outline-none"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Relato de Eventuais Desvios de Processo / Observações Operacionais:
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva variações de viscosidade, oscilação de pressão de massa, quebra de espaguete, ruídos no redutor..."
                  value={operationalDeviationsNotes}
                  onChange={(e) => setOperationalDeviationsNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {/* FOTOS E EVIDÊNCIAS (DISPONÍVEL PARA QUALQUER STATUS) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Camera className="w-5 h-5 text-red-800" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Fotos para Evidências e Anexos Rápidos
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Legenda da foto (Ex: Foto da gaveta magnética / Peça em manutenção)"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Camera className="w-4 h-4" />
                <span>Tirar Foto</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>Anexar Arquivo</span>
              </button>
            </div>
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                  <img src={photo.dataUrl} alt={photo.caption} className="w-full h-28 object-cover" />
                  <div className="p-2 bg-white text-[11px]">
                    <p className="font-semibold text-slate-800 truncate" title={photo.caption}>{photo.caption}</p>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(photo.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-400">
              Nenhuma foto anexada. Use a câmera ou anexo caso precise registrar evidências visuais.
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancelar / Voltar
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-white bg-red-800 hover:bg-red-900 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {lineStatus === 'manutencao' && 'Salvar Apontamento de Manutenção (OM)'}
              {lineStatus === 'setup' && 'Salvar Apontamento de Setup'}
              {lineStatus === 'preventiva' && 'Registrar Linha em Preventiva'}
              {lineStatus === 'inativa' && 'Registrar Linha Inativa'}
              {lineStatus === 'em_producao' && 'Salvar Apontamento Operacional Completo'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
