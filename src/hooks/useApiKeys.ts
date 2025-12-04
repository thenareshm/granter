import type { ApiKeysSettings } from '../types/settings';
import { useUserSettings } from './useUserSettings';

interface UseApiKeysResult {
  apiKeys: ApiKeysSettings | null;
  loading: boolean;
  error: string | null;
  saveApiKeys: (update: ApiKeysSettings) => Promise<void>;
}

export function useApiKeys(): UseApiKeysResult {
  const { settings, loading, error, saveApiKeys } = useUserSettings();
  const apiKeys: ApiKeysSettings | null = settings
    ? {
        geminiApiKey: settings.geminiApiKey ?? null,
        openaiApiKey: settings.openaiApiKey ?? null,
      }
    : null;

  return { apiKeys, loading, error, saveApiKeys };
}
