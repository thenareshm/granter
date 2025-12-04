import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useApiKeys } from '../hooks/useApiKeys';

const ApiKeysSettings = () => {
  const { user } = useAuth();
  const { apiKeys, loading, error, saveApiKeys } = useApiKeys();

  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (apiKeys) {
      setGeminiKey(apiKeys.geminiApiKey ?? '');
      setOpenaiKey(apiKeys.openaiApiKey ?? '');
    }
  }, [apiKeys]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveApiKeys({
        geminiApiKey: geminiKey || null,
        openaiApiKey: openaiKey || null,
      });
      setSaveSuccess(true);
    } catch {
      // error already handled in hook
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="space-y-2">
        <div className="text-lg font-semibold text-slate-800">Loading settings…</div>
        <p className="text-sm text-slate-500">Please wait.</p>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="text-center text-slate-600">
        Sign in with Google to save and sync your API keys.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">API Keys</h1>
        <p className="text-sm text-slate-500">
          Store your own Gemini and OpenAI keys. These keys are used only for your account.
        </p>
      </div>

      <Card className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Settings saved
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-800">Gemini API key</label>
              <p className="text-xs text-slate-500">Get a key from Google AI Studio.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGemini((v) => !v)}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              {showGemini ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={showGemini ? 'text' : 'password'}
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Paste your Gemini API key"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-800">OpenAI API key</label>
              <p className="text-xs text-slate-500">Get a key from platform.openai.com.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowOpenAi((v) => !v)}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              {showOpenAi ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={showOpenAi ? 'text' : 'password'}
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Paste your OpenAI API key"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ApiKeysSettings;
