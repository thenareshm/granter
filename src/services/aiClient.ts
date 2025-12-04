import type { GrantRecipe } from '../types';
import type { ApiKeysSettings } from '../types/settings';

type Provider = 'openai' | 'gemini';

export type SupportedModel = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gpt-5.1';

interface ModelConfig {
  provider: Provider;
  apiModel: string;
}

const MODEL_CONFIG: Record<SupportedModel, ModelConfig> = {
  'gemini-2.5-flash': { provider: 'gemini', apiModel: 'gemini-1.5-flash' },
  'gemini-2.5-pro': { provider: 'gemini', apiModel: 'gemini-1.5-pro' },
  'gpt-5.1': { provider: 'openai', apiModel: 'gpt-4.1-mini' },
};

export interface GenerateRequest {
  modelType: SupportedModel;
  recipe: GrantRecipe;
  apiKeys: ApiKeysSettings;
}

export interface GenerateResult {
  rawText: string;
  structured: Record<string, string>;
}

function cleanApiKey(value: string | null | undefined, provider: Provider): string {
  if (!value) {
    throw new Error(`${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key missing. Add it in Settings -> API Keys.`);
  }
  const trimmed = value.trim();
  if (/\r|\n/.test(trimmed)) {
    throw new Error(
      `${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key is invalid. Remove line breaks or special characters.`,
    );
  }
  if (/[^\u0000-\u007F]/.test(trimmed)) {
    throw new Error(
      `${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key contains unsupported characters. Use only standard ASCII characters.`,
    );
  }
  return trimmed;
}

function buildSystemAndUser(recipe: GrantRecipe) {
  const system = 'You are an assistant that writes grant proposal sections with structured JSON output.';

  const inputs =
    recipe.inputParams?.length
      ? recipe.inputParams.map((p) => `- ${p.key}: ${p.value}`).join('\n')
      : 'None';

  const outputs =
    recipe.outputFields?.length
      ? recipe.outputFields.map((f) => `- ${f.label}`).join('\n')
      : 'None';

  const user = [
    `Grant recipe description:\n${recipe.description || '(none)'}`,
    `Base prompt for the grant:\n${recipe.prompt || '(none)'}`,
    `Input parameters:\n${inputs}`,
    `Output fields:\n${outputs}`,
    '',
    'Return answers that could be pasted directly into a grant application.',
  ].join('\n\n');

  return { system, user };
}

function parseStructuredOutput(raw: string): GenerateResult {
  let structured: Record<string, string> = { 'Full Response': raw };

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      structured = {};
      for (const [key, value] of Object.entries(parsed)) {
        structured[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
  } catch (err) {
    console.warn('Failed to parse structured JSON output, using raw text.', err);
  }

  return { rawText: raw, structured };
}

function buildOpenAIJsonSchema(recipe: GrantRecipe) {
  const fields = recipe.outputFields ?? [];

  const properties: Record<string, any> = {};
  fields.forEach((field, index) => {
    properties[`field_${index}`] = {
      type: 'string',
      description: `Grant answer for output field "${field.label}".`,
    };
  });

  return {
    type: 'object',
    properties,
    required: fields.map((_, index) => `field_${index}`),
    additionalProperties: false,
  };
}

function mapOpenAIJsonToStructured(
  recipe: GrantRecipe,
  raw: string,
): GenerateResult {
  let structured: Record<string, string> = {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const fields = recipe.outputFields ?? [];
      fields.forEach((field, index) => {
        const key = `field_${index}`;
        const value = (parsed as Record<string, unknown>)[key];
        if (value !== undefined) {
          structured[field.label] =
            typeof value === 'string' ? value : JSON.stringify(value);
        }
      });
    }
  } catch (err) {
    console.warn('Failed to parse OpenAI JSON, falling back to raw text.', err);
  }

  if (Object.keys(structured).length === 0) {
    structured = { 'Full Response': raw };
  }

  return { rawText: raw, structured };
}

export async function generateWithModel(
  { modelType, recipe, apiKeys }: GenerateRequest,
): Promise<GenerateResult> {
  const config = MODEL_CONFIG[modelType];
  if (!config) throw new Error(`Unsupported model: ${modelType}`);

  const { provider, apiModel } = config;

  if (provider === 'gemini' && !apiKeys.geminiApiKey) {
    throw new Error('Gemini API key missing. Add it in Settings -> API Keys.');
  }
  if (provider === 'openai' && !apiKeys.openaiApiKey) {
    throw new Error('OpenAI API key missing. Add it in Settings -> API Keys.');
  }

  const { system, user } = buildSystemAndUser(recipe);

  try {
    if (provider === 'openai') {
      const apiKey = cleanApiKey(apiKeys.openaiApiKey, 'openai');
      const schema = buildOpenAIJsonSchema(recipe);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      const payload = {
        model: apiModel,
        input: `${system}\n\n${user}`,
        text: {
          format: {
            type: 'json_schema',
            name: 'grant_outputs',
            schema,
          },
        },
      };

      console.log('[OpenAI] Calling model', apiModel, 'hasKey', !!apiKey);

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OpenAI] Error status', response.status, 'body:', errorText);
        throw new Error('OpenAI request failed');
      }

      const data: any = await response.json();
      const jsonText = data.output?.[0]?.content?.[0]?.text ?? JSON.stringify(data);
      return mapOpenAIJsonToStructured(recipe, jsonText);
    }

    if (provider === 'gemini') {
      const apiKey = cleanApiKey(apiKeys.geminiApiKey, 'gemini');
      const prompt = `${system}\n\n${user}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini error:', errorText);
        throw new Error('Gemini request failed. Check your model and API key.');
      }

      const data: any = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(data);
      return parseStructuredOutput(rawText);
    }

    throw new Error(`Unhandled provider: ${provider}`);
  } catch (err) {
    console.error('generateWithModel failed', err);
    throw err;
  }
}
