import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import type { ChallengeConfig } from '../lib/types';
import { getCachedChallengeConfig, fetchChallengeConfig, saveChallengeConfig } from '../lib/settings';
import { parseDateKey } from '../lib/constants';

interface ConfigContextValue {
  config: ChallengeConfig;
  updateConfig: (newConfig: ChallengeConfig) => Promise<ChallengeConfig>;
  isLoading: boolean;
  startDateObj: Date;
  goalDateObj: Date;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ChallengeConfig>(() => getCachedChallengeConfig());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    fetchChallengeConfig().then((fetched) => {
      if (mounted) {
        setConfig(fetched);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const startDateObj = useMemo(() => parseDateKey(config.startDate), [config.startDate]);
  const goalDateObj = useMemo(() => parseDateKey(config.goalDate), [config.goalDate]);

  // useCallback so consumers get a stable reference and the closure is always fresh
  const updateConfig = useCallback(async (newConfig: ChallengeConfig): Promise<ChallengeConfig> => {
    setConfig(newConfig); // Optimistic update
    const saved = await saveChallengeConfig(newConfig);
    setConfig(saved); // Apply any server-side normalization
    return saved;
  }, []);

  const value = useMemo(
    () => ({
      config,
      updateConfig,
      isLoading,
      startDateObj,
      goalDateObj,
    }),
    [config, updateConfig, isLoading, startDateObj, goalDateObj],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
