import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, X, KeyRound, Check } from 'lucide-react';
import { verifySupervisorPin, checkLockoutStatus } from '../utils/security';

interface PinPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
  actionDescription?: string;
}

export const PinPromptModal: React.FC<PinPromptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Autenticação de Supervisão',
  actionDescription = 'Para consultar histórico, gráficos, relatórios e exportar dados consolidados em Excel, informe a senha de acesso.'
}) => {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      const lockout = checkLockoutStatus();
      if (lockout.isLocked) {
        setLockoutRemaining(lockout.remainingSeconds);
      } else {
        setLockoutRemaining(0);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: any;
    if (lockoutRemaining > 0) {
      interval = setInterval(() => {
        setLockoutRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim() || isSubmitting || lockoutRemaining > 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await verifySupervisorPin(pin);
      if (result.success) {
        setPin('');
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Senha incorreta.');
        const lockout = checkLockoutStatus();
        if (lockout.isLocked) {
          setLockoutRemaining(lockout.remainingSeconds);
        }
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Erro ao validar senha criptográfica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (lockoutRemaining > 0) return;
    if (pin.length < 10) {
      setPin(prev => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    if (lockoutRemaining > 0) return;
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (lockoutRemaining > 0) return;
    setPin('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Superior */}
        <div className="bg-red-950 text-white p-5 relative border-b border-red-900">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 text-red-200 hover:text-white p-1 rounded-lg hover:bg-red-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-800 text-white flex items-center justify-center shadow-inner">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase text-white">
                {actionTitle}
              </h3>
              <p className="text-[11px] text-red-200/90 font-mono">
                Autenticação Criptografada SHA-256
              </p>
            </div>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {actionDescription}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-red-700" />
                  <span>Digite a Senha do Gestor:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{showPassword ? 'Ocultar' : 'Visualizar'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  disabled={lockoutRemaining > 0 || isSubmitting}
                  className="w-full text-center text-2xl tracking-widest font-mono font-bold bg-slate-50 border-2 border-slate-300 rounded-xl py-3 px-4 focus:border-red-600 focus:bg-white focus:outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800 animate-in shake duration-150">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {lockoutRemaining > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold text-center">
                Muitas tentativas falhas. Aguarde <strong>{lockoutRemaining}s</strong> para tentar novamente.
              </div>
            )}

            {/* Teclado Numérico em Tela (Touch-friendly para Tablets na Produção) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  disabled={lockoutRemaining > 0}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg font-mono font-bold text-base text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={lockoutRemaining > 0}
                className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                disabled={lockoutRemaining > 0}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg font-mono font-bold text-base text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={lockoutRemaining > 0}
                className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                ⌫
              </button>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!pin.trim() || lockoutRemaining > 0 || isSubmitting}
                className="flex-1 py-2.5 px-3 rounded-xl bg-red-700 text-white text-xs font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar</span>
              </button>
            </div>
          </form>
        </div>

        {/* Rodapé de Segurança */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Sessão protegida por token temporal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
