import { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { DriveLogo } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useUserSettings } from '../hooks/useUserSettings';

const DriveConnectPage = () => {
  const { user, signInWithGoogle } = useAuth();
  const { settings, loading, error, setDriveConnected } = useUserSettings();
  const [connecting, setConnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const driveConnected = settings?.driveConnected ?? false;
  const statusLabel = driveConnected ? 'Connected to Drive' : 'Not connected';

  const handleConnectDrive = async () => {
    try {
      setConnecting(true);
      setLocalError(null);
      await signInWithGoogle();
      await setDriveConnected(true);
    } catch (err) {
      console.error('[Drive] connect failed', err);
      setLocalError('Failed to connect Google Drive. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Google Drive</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Connect your Google Drive so Granter can attach project context files to your grant
          recipes.
        </p>
      </div>

      <Card className="space-y-6 text-center">
        {(error || localError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-950/40">
            {localError ?? error}
          </div>
        )}

        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-brand-600 dark:bg-slate-800">
            <DriveLogo className="h-10 w-10" />
          </div>
        </div>

        <div className="space-y-2">
          <div
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              driveConnected
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {statusLabel}
          </div>
          {settings?.driveStatusUpdatedAt && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Updated: {settings.driveStatusUpdatedAt}
            </p>
          )}
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Granter only requests the drive.file scope, which lets it see and edit only the files you
          choose to use with this app.
        </p>

        <div className="flex justify-center">
          <Button
            onClick={handleConnectDrive}
            disabled={connecting || loading}
            className="flex items-center gap-2"
          >
            {connecting
              ? 'Connecting…'
              : !user
                ? 'Sign in with Google'
                : driveConnected
                  ? 'Reconnect Drive'
                  : 'Connect Drive'}
            <DriveLogo className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DriveConnectPage;
