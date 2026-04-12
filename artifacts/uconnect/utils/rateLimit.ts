import AsyncStorage from "@react-native-async-storage/async-storage";

interface RateLimitState {
  attempts: number[];
  lockedUntil: number | null;
}

interface RateLimitStatus {
  allowed: boolean;
  attemptsUsed: number;
  attemptsLeft: number;
  isLocked: boolean;
  lockedUntil: number | null;
  secondsLeft: number;
}

const PREFIX = "@rl_";

async function _load(key: string): Promise<RateLimitState> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return { attempts: [], lockedUntil: null };
    return JSON.parse(raw) as RateLimitState;
  } catch {
    return { attempts: [], lockedUntil: null };
  }
}

async function _save(key: string, state: RateLimitState): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(state));
  } catch {}
}

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitStatus> {
  const now = Date.now();
  const state = await _load(key);

  if (state.lockedUntil && now < state.lockedUntil) {
    const secondsLeft = Math.ceil((state.lockedUntil - now) / 1000);
    return {
      allowed: false,
      attemptsUsed: state.attempts.length,
      attemptsLeft: 0,
      isLocked: true,
      lockedUntil: state.lockedUntil,
      secondsLeft,
    };
  }

  const recentAttempts = state.attempts.filter((ts) => now - ts < windowMs);
  const attemptsUsed = recentAttempts.length;
  const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);

  return {
    allowed: attemptsUsed < maxAttempts,
    attemptsUsed,
    attemptsLeft,
    isLocked: false,
    lockedUntil: null,
    secondsLeft: 0,
  };
}

export async function recordAttempt(
  key: string,
  maxAttempts: number,
  windowMs: number,
  lockoutMs: number
): Promise<RateLimitStatus> {
  const now = Date.now();
  const state = await _load(key);

  if (state.lockedUntil && now < state.lockedUntil) {
    const secondsLeft = Math.ceil((state.lockedUntil - now) / 1000);
    return {
      allowed: false,
      attemptsUsed: state.attempts.length,
      attemptsLeft: 0,
      isLocked: true,
      lockedUntil: state.lockedUntil,
      secondsLeft,
    };
  }

  const recentAttempts = state.attempts.filter((ts) => now - ts < windowMs);
  recentAttempts.push(now);

  let lockedUntil: number | null = null;
  if (recentAttempts.length >= maxAttempts && lockoutMs > 0) {
    lockedUntil = now + lockoutMs;
  }

  await _save(key, { attempts: recentAttempts, lockedUntil });

  const attemptsUsed = recentAttempts.length;
  const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
  const isLocked = lockedUntil !== null;
  const secondsLeft = isLocked ? Math.ceil(lockoutMs / 1000) : 0;

  return {
    allowed: !isLocked,
    attemptsUsed,
    attemptsLeft,
    isLocked,
    lockedUntil,
    secondsLeft,
  };
}

export async function clearRateLimit(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {}
}

export function formatLockTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.ceil(seconds / 60);
  if (m < 60) return `${m} minute${m !== 1 ? "s" : ""}`;
  const h = Math.ceil(m / 60);
  return `${h} hour${h !== 1 ? "s" : ""}`;
}
