export type LimitType = 'words' | 'chars';

export interface InputParam {
  id: string;
  key: string;
  value: string;
}

export interface OutputField {
  id: string;
  label: string;
  max: number;
  limitType: LimitType;
}

export interface GrantRecipe {
  id: string;
  description: string;
  prompt: string;
  inputParams: InputParam[];
  outputFields: OutputField[];
  tokenCount: number;
  modelType: string;
  updatedAt: string;
  projectContextEnabled?: boolean;
  projectContextFiles?: string[];
  locked?: boolean;
  structuredOutput?: Record<string, string>;
}
