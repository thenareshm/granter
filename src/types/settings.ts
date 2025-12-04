export interface ApiKeysSettings {
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
}

export interface UserSettings {
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  driveConnected?: boolean;
  driveStatusUpdatedAt?: string;
}

export const defaultUserSettings: UserSettings = {
  geminiApiKey: '',
  openaiApiKey: '',
  driveConnected: false,
  driveStatusUpdatedAt: undefined,
};
