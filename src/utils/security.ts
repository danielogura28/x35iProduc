/**
 * Utilitários de Segurança e Autenticação Criptográfica para o ExtruControl
 * 
 * Implementa verificação com hash SHA-256 com salt via Web Crypto API nativa do navegador.
 * A senha em texto puro NUNCA é armazenada ou exposta no código-fonte.
 * Inclui proteção contra força bruta (bloqueio temporário após tentativas inválidas)
 * e expiração de sessão de supervisão.
 */

// Salt fixo para proteção contra ataques de dicionário e rainbow tables
const SECURITY_SALT = 'petropol_extrucontrol_salt_2026_dr';

// Hash criptográfico seguro SHA-256 pré-calculado com o salt de segurança:
const DEFAULT_PIN_HASH = '9aa6b014b6f95207054ea9f1647146129460cd16b3bace0699a64a2c530fc2ad';

const STORAGE_HASH_KEY = 'extrucontrol_supervisor_hash_v1';
const SESSION_AUTH_KEY = 'extrucontrol_supervisor_session_v1';
const ATTEMPTS_KEY = 'extrucontrol_failed_attempts_v1';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 segundos de espera após 5 falhas
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inatividade

/**
 * Calcula o hash SHA-256 com salt de uma string usando a Web Crypto API nativa.
 */
export async function computeHashWithSalt(input: string): Promise<string> {
  const salted = `${input}:${SECURITY_SALT}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(salted);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Retorna o hash do PIN atualmente configurado (o padrão ou o atualizado pelo usuário).
 */
export function getStoredPinHash(): string {
  try {
    const customHash = localStorage.getItem(STORAGE_HASH_KEY);
    return customHash || DEFAULT_PIN_HASH;
  } catch {
    return DEFAULT_PIN_HASH;
  }
}

/**
 * Verifica se o lockout por tentativas inválidas está ativo.
 */
export function checkLockoutStatus(): { isLocked: boolean; remainingSeconds: number } {
  try {
    const raw = sessionStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0 };
    
    const { count, lockoutUntil } = JSON.parse(raw);
    const now = Date.now();

    if (count >= MAX_FAILED_ATTEMPTS && lockoutUntil && lockoutUntil > now) {
      const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds };
    }

    if (lockoutUntil && lockoutUntil <= now) {
      sessionStorage.removeItem(ATTEMPTS_KEY);
    }

    return { isLocked: false, remainingSeconds: 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0 };
  }
}

/**
 * Registra uma tentativa falha e calcula o lockout se atingir o limite.
 */
function recordFailedAttempt(): number {
  try {
    const raw = sessionStorage.getItem(ATTEMPTS_KEY);
    const current = raw ? JSON.parse(raw) : { count: 0, lockoutUntil: 0 };
    current.count += 1;

    if (current.count >= MAX_FAILED_ATTEMPTS) {
      current.lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    }

    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(current));
    return current.count;
  } catch {
    return 1;
  }
}

/**
 * Limpa o histórico de falhas após sucesso.
 */
function resetFailedAttempts(): void {
  try {
    sessionStorage.removeItem(ATTEMPTS_KEY);
  } catch {
    // ignore
  }
}

/**
 * Valida a senha fornecida pelo usuário.
 */
export async function verifySupervisorPin(pin: string): Promise<{ success: boolean; error?: string }> {
  const lockout = checkLockoutStatus();
  if (lockout.isLocked) {
    return {
      success: false,
      error: `Muitas tentativas incorretas. Sistema bloqueado temporariamente por ${lockout.remainingSeconds}s.`
    };
  }

  const computed = await computeHashWithSalt(pin.trim());
  const stored = getStoredPinHash();

  if (computed === stored) {
    resetFailedAttempts();
    setSupervisorSession();
    return { success: true };
  } else {
    const attempts = recordFailedAttempt();
    const remaining = MAX_FAILED_ATTEMPTS - attempts;
    if (remaining <= 0) {
      return {
        success: false,
        error: `Senha incorreta. Limite excedido! Bloqueado por 30 segundos.`
      };
    }
    return {
      success: false,
      error: `Senha de acesso incorreta. Tentativas restantes: ${remaining}.`
    };
  }
}

/**
 * Atualiza o PIN do supervisor (requer o PIN atual).
 */
export async function updateSupervisorPin(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  const verifyCurrent = await verifySupervisorPin(currentPin);
  if (!verifyCurrent.success) {
    return { success: false, error: 'A senha atual informada está incorreta.' };
  }

  if (newPin.trim().length < 4) {
    return { success: false, error: 'A nova senha deve ter no mínimo 4 dígitos.' };
  }

  const newHash = await computeHashWithSalt(newPin.trim());
  localStorage.setItem(STORAGE_HASH_KEY, newHash);
  setSupervisorSession();
  return { success: true };
}

/**
 * Define a sessão de supervisor autenticado.
 */
export function setSupervisorSession(): void {
  try {
    const sessionData = {
      authenticatedAt: Date.now(),
      expiresAt: Date.now() + SESSION_TIMEOUT_MS
    };
    sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(sessionData));
  } catch {
    // fallback
  }
}

/**
 * Verifica se há uma sessão de supervisor válida e ativa.
 */
export function isSupervisorAuthenticated(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_AUTH_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session || !session.expiresAt) return false;

    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_AUTH_KEY);
      return false;
    }

    session.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
    sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

/**
 * Encerra a sessão de supervisor (logout imediato).
 */
export function logoutSupervisor(): void {
  try {
    sessionStorage.removeItem(SESSION_AUTH_KEY);
  } catch {
    // ignore
  }
}
