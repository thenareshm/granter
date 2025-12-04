import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { ApiKeysSettings } from '../types/settings';

interface UseApiKeysResult {
  apiKeys: ApiKeysSettings | null;
  loading: boolean;
  error: string | null;
  saveApiKeys: (update: ApiKeysSettings) => Promise<void>;
}

export function useApiKeys(): UseApiKeysResult {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeysSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setApiKeys(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const ref = doc(db, 'users', user.uid, 'settings', 'apiKeys');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as ApiKeysSettings;
          setApiKeys({
            geminiApiKey: data.geminiApiKey ?? null,
            openaiApiKey: data.openaiApiKey ?? null,
          });
        } else {
          setApiKeys({ geminiApiKey: null, openaiApiKey: null });
        }
      } catch (err: any) {
        console.error('Failed to load API keys', err);
        setError(err?.message ?? 'Unable to load API keys');
        setApiKeys(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  const saveApiKeys = async (update: ApiKeysSettings) => {
    if (!user) {
      setError('You must be signed in to save API keys.');
      return;
    }

    setError(null);

    try {
      const ref = doc(db, 'users', user.uid, 'settings', 'apiKeys');
      await setDoc(
        ref,
        {
          geminiApiKey: update.geminiApiKey ?? null,
          openaiApiKey: update.openaiApiKey ?? null,
        },
        { merge: true },
      );
      setApiKeys({
        geminiApiKey: update.geminiApiKey ?? null,
        openaiApiKey: update.openaiApiKey ?? null,
      });
    } catch (err: any) {
      console.error('Failed to save API keys', err);
      setError(err?.message ?? 'Failed to save settings');
      throw err;
    }
  };

  return { apiKeys, loading, error, saveApiKeys };
}
