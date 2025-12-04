import type { GrantRecipe } from '../types';
import type { SupportedModel } from '../types/models';
import type { ApiKeysSettings } from '../types/settings';

export interface GenerateRequest {
  modelType: SupportedModel;
  recipe: GrantRecipe;
  apiKeys: ApiKeysSettings;
}

export async function generateWithModel(request: GenerateRequest) {
  const { modelType, apiKeys } = request;

  if (modelType.startsWith('gemini')) {
    if (!apiKeys.geminiApiKey) {
      throw new Error('Gemini API key missing. Add it in Settings → API Keys.');
    }
  }

  if (modelType.startsWith('gpt')) {
    if (!apiKeys.openaiApiKey) {
      throw new Error('OpenAI API key missing. Add it in Settings → API Keys.');
    }
  }

  return {
    message: `Generation stub – integration coming soon for model: ${modelType}`,
  };
}
