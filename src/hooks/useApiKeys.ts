import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import type { ApiKeysSettings } from '../types/settings';

interface UseApiKeysResult {
  apiKeys: ApiKeysSettings | null;
  loading: boolean;
  error: string | null;
  saveApiKeys: (update: ApiKeysSettings) => Promise<void>;
}

export const useApiKeys = (): UseApiKeysResult => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeysSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setApiKeys(null);
        setLoading(false);
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
          setApiKeys({});
        }
      } catch (err) {
        console.error('Failed to load API keys', err);
        setError('Unable to load API keys');
        setApiKeys(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  const saveApiKeys = async (update: ApiKeysSettings) => {
    if (!user) {
      setError('You must sign in to save API keys.');
      throw new Error('Not authenticated');
    }
    setError(null);
    const ref = doc(db, 'users', user.uid, 'settings', 'apiKeys');
    await setDoc(ref, update, { merge: true });
    setApiKeys((prev) => ({ ...(prev ?? {}), ...update }));
  };

  return { apiKeys, loading, error, saveApiKeys };
};
