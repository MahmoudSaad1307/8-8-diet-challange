import type { ChallengeConfig } from './types';
import { DEFAULT_CHALLENGE_CONFIG } from './constants';
import { api } from './db';

const LS_CONFIG_KEY = 'cc:challenge_config';

function sanitizeConfig(input: Partial<ChallengeConfig> | null | undefined): ChallengeConfig {
  if (!input || typeof input !== 'object') {
    return DEFAULT_CHALLENGE_CONFIG;
  }

  return {
    startDate: typeof input.startDate === 'string' && input.startDate ? input.startDate : DEFAULT_CHALLENGE_CONFIG.startDate,
    goalDate: typeof input.goalDate === 'string' && input.goalDate ? input.goalDate : DEFAULT_CHALLENGE_CONFIG.goalDate,
    startWeightKg: typeof input.startWeightKg === 'number' && !isNaN(input.startWeightKg) ? input.startWeightKg : DEFAULT_CHALLENGE_CONFIG.startWeightKg,
    targetWeightKg: typeof input.targetWeightKg === 'number' && !isNaN(input.targetWeightKg) ? input.targetWeightKg : DEFAULT_CHALLENGE_CONFIG.targetWeightKg,
    targets: {
      calories: Number(input.targets?.calories) || DEFAULT_CHALLENGE_CONFIG.targets.calories,
      protein: Number(input.targets?.protein) || DEFAULT_CHALLENGE_CONFIG.targets.protein,
      carbs: Number(input.targets?.carbs) || DEFAULT_CHALLENGE_CONFIG.targets.carbs,
      fats: Number(input.targets?.fats) || DEFAULT_CHALLENGE_CONFIG.targets.fats,
      sodiumLimit: Number(input.targets?.sodiumLimit) || DEFAULT_CHALLENGE_CONFIG.targets.sodiumLimit,
      potassiumMin: Number(input.targets?.potassiumMin) || DEFAULT_CHALLENGE_CONFIG.targets.potassiumMin,
      potassiumMax: Number(input.targets?.potassiumMax) || DEFAULT_CHALLENGE_CONFIG.targets.potassiumMax,
      waterLiters: Number(input.targets?.waterLiters) || DEFAULT_CHALLENGE_CONFIG.targets.waterLiters,
      cardioCalories: Number(input.targets?.cardioCalories) || DEFAULT_CHALLENGE_CONFIG.targets.cardioCalories,
    },
  };
}

export function getCachedChallengeConfig(): ChallengeConfig {
  try {
    const raw = localStorage.getItem(LS_CONFIG_KEY);
    if (raw) {
      return sanitizeConfig(JSON.parse(raw));
    }
  } catch (err) {
    console.warn('Error reading cached challenge config:', err);
  }
  return DEFAULT_CHALLENGE_CONFIG;
}

export async function fetchChallengeConfig(): Promise<ChallengeConfig> {
  try {
    const remote = await api<ChallengeConfig | null>('/api/settings?key=challenge_config');
    if (remote) {
      const sanitized = sanitizeConfig(remote);
      localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(sanitized));
      return sanitized;
    }
  } catch (err) {
    console.warn('Could not fetch settings from API, using cached or defaults:', err);
  }
  return getCachedChallengeConfig();
}

export async function saveChallengeConfig(config: ChallengeConfig): Promise<ChallengeConfig> {
  const sanitized = sanitizeConfig(config);
  localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(sanitized));

  try {
    await api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        key: 'challenge_config',
        value: sanitized,
      }),
    });
  } catch (err) {
    console.warn('Could not persist settings to server, saved locally:', err);
  }

  return sanitized;
}
