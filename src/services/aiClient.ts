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
    throw new Error(`${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key missing. Add it in Settings → API Keys.`);
  }
  const trimmed = value.trim();
  if (/\r|\n/.test(trimmed)) {
    throw new Error(
      `${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key is invalid. Remove line breaks or special characters.`,
    );
  }
  return trimmed;
}

function buildOpenAIJsonSchema(recipe: GrantRecipe) {
  const labels = recipe.outputFields?.map((f) => f.label).filter(Boolean) ?? [];

  const properties: Record<string, unknown> = {};
  for (const label of labels) {
    properties[label] = {
      type: 'string',
      description: `Grant answer for field "${label}".`,
    };
  }

  return {
    name: 'grant_outputs',
    strict: true,
    schema: {
      type: 'object',
      properties,
      required: labels,
      additionalProperties: false,
    },
  };
}

function buildSystemAndUser(recipe: GrantRecipe) {
  const system =
    'You are an expert nonprofit grant writer. ' +
    'You help fill in grant application fields with clear, specific answers.';

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

export async function generateWithModel(
  { modelType, recipe, apiKeys }: GenerateRequest,
): Promise<GenerateResult> {
  const config = MODEL_CONFIG[modelType];
  if (!config) throw new Error(`Unsupported model: ${modelType}`);

  const { provider, apiModel } = config;

  if (provider === 'gemini' && !apiKeys.geminiApiKey) {
    throw new Error('Gemini API key missing. Add it in Settings → API Keys.');
  }
  if (provider === 'openai' && !apiKeys.openaiApiKey) {
    throw new Error('OpenAI API key missing. Add it in Settings → API Keys.');
  }

  const { system, user } = buildSystemAndUser(recipe);

  try {
    if (provider === 'openai') {
      const apiKey = cleanApiKey(apiKeys.openaiApiKey, 'openai');
      const jsonSchema = buildOpenAIJsonSchema(recipe);

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: apiModel,
          input: [
            { role: 'system', content: [{ type: 'input_text', text: system }] },
            { role: 'user', content: [{ type: 'input_text', text: user }] },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: jsonSchema,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI error:', errorText);
        throw new Error('OpenAI request failed. Check your model and API key.');
      }

      const data: any = await response.json();
      const rawText = data.output?.[0]?.content?.[0]?.text ?? JSON.stringify(data);
      return parseStructuredOutput(rawText);
    }

    if (provider === 'gemini') {
      const apiKey = cleanApiKey(apiKeys.geminiApiKey, 'gemini');
      const prompt = `${system}\n\n${user}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${encodeURIComponent(
        apiKey,
      )}`;

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
