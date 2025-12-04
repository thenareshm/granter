import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { UserSettings } from '../types/settings';
import { defaultUserSettings } from '../types/settings';

interface UseUserSettingsResult {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  saveApiKeys: (update: Pick<UserSettings, 'geminiApiKey' | 'openaiApiKey'>) => Promise<void>;
  setDriveConnected: (connected: boolean) => Promise<void>;
}

export function useUserSettings(): UseUserSettingsResult {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setSettings(null);
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
          const data = snap.data() as UserSettings;
          setSettings({
            geminiApiKey: data.geminiApiKey ?? '',
            openaiApiKey: data.openaiApiKey ?? '',
            driveConnected: data.driveConnected ?? false,
            driveStatusUpdatedAt: data.driveStatusUpdatedAt,
          });
        } else {
          setSettings(defaultUserSettings);
        }
      } catch (err: any) {
        console.error('Failed to load user settings', err);
        setError(err?.message ?? 'Unable to load settings');
        setSettings(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  const saveApiKeys = async (update: Pick<UserSettings, 'geminiApiKey' | 'openaiApiKey'>) => {
    if (!user) {
      setError('You must be signed in to save settings.');
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
      setSettings((prev) => ({
        ...defaultUserSettings,
        ...(prev ?? {}),
        geminiApiKey: update.geminiApiKey ?? '',
        openaiApiKey: update.openaiApiKey ?? '',
      }));
    } catch (err: any) {
      console.error('Failed to save API keys', err);
      setError(err?.message ?? 'Failed to save settings');
      throw err;
    }
  };

  const setDriveConnected = async (connected: boolean) => {
    if (!user) {
      setError('You must be signed in to connect Drive.');
      return;
    }
    const now = new Date().toISOString();
    try {
      const ref = doc(db, 'users', user.uid, 'settings', 'apiKeys');
      await setDoc(
        ref,
        { driveConnected: connected, driveStatusUpdatedAt: now },
        { merge: true },
      );
      setSettings((prev) => ({
        ...defaultUserSettings,
        ...(prev ?? {}),
        driveConnected: connected,
        driveStatusUpdatedAt: now,
      }));
    } catch (err: any) {
      console.error('[Drive] failed to update status', err);
      setError(err?.message ?? 'Failed to update Drive status');
      throw err;
    }
  };

  return { settings, loading, error, saveApiKeys, setDriveConnected };
}
