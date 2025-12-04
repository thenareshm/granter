import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DuplicateIcon, PlusIcon, SaveIcon, TrashIcon } from '../components/Icons';
import { Toggle } from '../components/Toggle';
import { ProjectContextModal, type ProjectFile } from '../components/ProjectContextModal';
import {
  computeTokenCount,
  formatTimestamp,
  useGrantRecipes,
} from '../hooks/useGrantRecipes';
import { useAuth } from '../context/AuthContext';
import { useApiKeys } from '../hooks/useApiKeys';
import {
  generateWithModel,
  type GenerateResult,
  type SupportedModel,
} from '../services/aiClient';
import type { GrantRecipe, InputParam, OutputField } from '../types';

const MOCK_PROJECT_FILES: ProjectFile[] = [
  { id: 'file1', name: 'STEM Access 2024 Proposal.pdf' },
  { id: 'file2', name: 'Youth Arts One-Pager.docx' },
  { id: 'file3', name: 'Annual Impact Report 2023.pdf' },
];

const blankInputParam = (): InputParam => ({
  id: crypto.randomUUID(),
  key: '',
  value: '',
});

const blankOutputField = (): OutputField => ({
  id: crypto.randomUUID(),
  label: '',
  max: 150,
  limitType: 'words',
});

const createEmptyRecipe = (): GrantRecipe => ({
  id: '',
  description: '',
  prompt: '',
  inputParams: [blankInputParam()],
  outputFields: [blankOutputField()],
  tokenCount: 0,
  modelType: 'gemini-2.5-flash',
  updatedAt: '',
  projectContextEnabled: false,
  projectContextFiles: [],
});

const GrantRecipeDetail = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getRecipeById,
    createRecipe,
    updateRecipe,
    loading: recipesLoading,
  } = useGrantRecipes();
  const {
    apiKeys,
    loading: apiKeysLoading,
    error: apiKeysError,
  } = useApiKeys();

  const [form, setForm] = useState<GrantRecipe>(createEmptyRecipe());
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [contextMessage, setContextMessage] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GenerateResult | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const contextMessageTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEditing = Boolean(id);
  const selectedProjectContextFiles = form.projectContextFiles ?? [];
  const projectContextEnabled = form.projectContextEnabled ?? false;
  const attachedFilesCount = selectedProjectContextFiles.length;
  const isLocked = Boolean(form.locked);

  useEffect(() => {
    if (recipesLoading) return;

    if (!id) {
      setForm(createEmptyRecipe());
      setIsDirty(false);
      setNotFound(false);
      return;
    }

    if (!user) {
      setForm(createEmptyRecipe());
      setNotFound(false);
      return;
    }

    const existing = getRecipeById(id);
    if (!existing) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    setForm({
      ...existing,
      modelType: existing.modelType || 'gemini-2.5-flash',
      projectContextEnabled: existing.projectContextEnabled ?? false,
      projectContextFiles: existing.projectContextFiles ?? [],
    });
    setIsDirty(false);
  }, [id, getRecipeById, recipesLoading, user]);

  const persistRecipe = useCallback(
    async (force = false) => {
      const hasMeaningfulContent = Boolean(
        form.description.trim() ||
          form.prompt.trim() ||
          form.inputParams.some(
            (param) => param.key.trim() || param.value.trim(),
          ) ||
          form.outputFields.some(
            (field) =>
              field.label.trim() ||
              field.max !== 150 ||
              field.limitType !== 'words',
          ),
      );

      if (!force && !isDirty) {
        return form.id ? form : undefined;
      }

      if (!form.id && !hasMeaningfulContent) {
        return undefined;
      }

      if (!user) {
        return undefined;
      }

      const now = formatTimestamp(new Date());
      const payload: GrantRecipe = {
        ...form,
        id: form.id || crypto.randomUUID(),
        tokenCount: computeTokenCount(form.prompt),
        modelType: form.modelType || 'gemini-2.5-flash',
        updatedAt: now,
        projectContextEnabled: form.projectContextEnabled ?? false,
        projectContextFiles: form.projectContextFiles ?? [],
        locked: form.locked ?? false,
      };

      const targetId = id ?? form.id;
      if (targetId && getRecipeById(targetId)) {
        await updateRecipe(targetId, payload);
      } else {
        const created = await createRecipe(payload);
        payload.id = created.id;
      }

      setForm(payload);
      setIsDirty(false);
      return payload;
    },
    [form, id, isDirty, createRecipe, updateRecipe, getRecipeById, user],
  );

  useEffect(() => {
    return () => {
      if (contextMessageTimeout.current) {
        clearTimeout(contextMessageTimeout.current);
      }
    };
  }, []);

  const handleFieldChange = <K extends keyof GrantRecipe>(
    key: K,
    value: GrantRecipe[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setError(null);
  };

  const handleInputParamChange = (paramId: string, key: keyof InputParam, value: string) => {
    setForm((prev) => ({
      ...prev,
      inputParams: prev.inputParams.map((param) =>
        param.id === paramId ? { ...param, [key]: value } : param,
      ),
    }));
    setIsDirty(true);
    setError(null);
  };

  const handleOutputFieldChange = (
    fieldId: string,
    key: keyof OutputField,
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      outputFields: prev.outputFields.map((field) =>
        field.id === fieldId ? { ...field, [key]: value } : field,
      ),
    }));
    setIsDirty(true);
    setError(null);
  };

  const handleOpenProjectContext = () => {
    setIsProjectModalOpen(true);
  };

  const handleAttachProjectFiles = (fileIds: string[]) => {
    setForm((prev) => ({
      ...prev,
      projectContextFiles: fileIds,
      projectContextEnabled:
        fileIds.length === 0 ? false : prev.projectContextEnabled ?? false,
    }));
    if (fileIds.length === 0) {
      setContextMessage(null);
    }
    setIsDirty(true);
  };

  const handleProjectContextToggle = (enabled: boolean) => {
    if (attachedFilesCount === 0) return;
    setForm((prev) => ({ ...prev, projectContextEnabled: enabled }));
    setIsDirty(true);
    setError(null);

    if (contextMessageTimeout.current) {
      clearTimeout(contextMessageTimeout.current);
    }

    if (enabled) {
      setContextMessage('Project context added to prompt.');
      contextMessageTimeout.current = setTimeout(() => {
        setContextMessage(null);
      }, 2800);
    } else {
      setContextMessage(null);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      setError('Sign in with Google to save and generate.');
      return;
    }
    if (apiKeysLoading) {
      alert('Loading API key settings, please try again in a moment.');
      return;
    }
    if (!apiKeys) {
      alert('Sign in and add your API keys in Settings → API Keys before generating.');
      return;
    }
    const hasDescription = form.description.trim().length > 0;
    const hasPrompt = form.prompt.trim().length > 0;
    const hasOutputs = form.outputFields.length > 0;

    if (!hasDescription || !hasPrompt || !hasOutputs) {
      setError('Please provide a description, prompt, and at least one output field.');
      return;
    }

    setError(null);
    const saved = await persistRecipe(true);
    const recipeForGen = saved ?? form;
    const projectContextInfo = {
      enabled: projectContextEnabled,
      files: selectedProjectContextFiles,
    };

    try {
      const response = await generateWithModel({
        modelType: recipeForGen.modelType as SupportedModel,
        recipe: recipeForGen,
        apiKeys: apiKeys ?? {},
      });
      console.log('Project context for generation:', projectContextInfo);
      setGeneratedResult(response);

      if (!recipeForGen.locked && recipeForGen.id) {
        const lockedRecipe = { ...recipeForGen, locked: true };
        setForm(lockedRecipe);
        await updateRecipe(lockedRecipe.id, { locked: true });
      }
      // alert('Generation complete. See Structured Output below.');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to generate';
      setGeneratedResult(null);
      alert(message);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setError('Sign in with Google to save your recipe.');
      return;
    }
    setError(null);
    await persistRecipe(true);
  };

  const handleClone = async () => {
    if (!user) {
      setError('Sign in with Google to clone recipes.');
      return;
    }
    const hasContent = Boolean(
      form.description.trim() ||
        form.prompt.trim() ||
        form.inputParams.some((param) => param.key || param.value) ||
        form.outputFields.some((field) => field.label),
    );
    if (!hasContent) return;

    const saved = await persistRecipe(true);
    if (!saved) return;

    const source = saved ?? form;

    const baseDescription = source.description || 'Untitled';
    const description = baseDescription.endsWith('(copy)')
      ? baseDescription
      : `${baseDescription} (copy)`;

    const clonedInputParams = source.inputParams.map((param) => ({
      ...param,
      id: crypto.randomUUID(),
    }));
    const clonedOutputFields = source.outputFields.map((field) => ({
      ...field,
      id: crypto.randomUUID(),
    }));

    const clone: Partial<GrantRecipe> = {
      description,
      prompt: source.prompt,
      inputParams: clonedInputParams,
      outputFields: clonedOutputFields,
      tokenCount: 0,
      modelType: source.modelType,
      updatedAt: formatTimestamp(new Date()),
      locked: false,
      projectContextEnabled: source.projectContextEnabled ?? false,
      projectContextFiles: source.projectContextFiles ?? [],
    };

    const newRecipe = await createRecipe(clone);
    navigate(`/grant-recipes/${newRecipe.id}`);
  };

  const handleAddInput = () => {
    setForm((prev) => ({
      ...prev,
      inputParams: [...prev.inputParams, blankInputParam()],
    }));
    setIsDirty(true);
  };

  const handleRemoveInput = (paramId: string) => {
    setForm((prev) => ({
      ...prev,
      inputParams: prev.inputParams.filter((param) => param.id !== paramId),
    }));
    setIsDirty(true);
  };

  const handleAddOutput = () => {
    setForm((prev) => ({
      ...prev,
      outputFields: [...prev.outputFields, blankOutputField()],
    }));
    setIsDirty(true);
  };

  const handleRemoveOutput = (fieldId: string) => {
    setForm((prev) => ({
      ...prev,
      outputFields: prev.outputFields.filter((field) => field.id !== fieldId),
    }));
    setIsDirty(true);
  };

  const handleCopyField = async (label: string) => {
    if (!generatedResult) return;
    const value = generatedResult.structured[label];
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 2000);
    } catch (err) {
      console.error('Failed to copy field to clipboard', err);
    }
  };

  const pageTitle = useMemo(
    () => (isEditing ? 'Edit Grant Recipe' : 'Create Grant Recipe'),
    [isEditing],
  );

  if (recipesLoading && id) {
    return (
      <Card className="space-y-2">
        <div className="text-lg font-semibold text-slate-800">Loading recipe…</div>
        <p className="text-sm text-slate-500">Please wait while we fetch your data.</p>
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="space-y-4">
        <div className="text-lg font-semibold text-slate-800">Recipe not found</div>
        <Button variant="secondary" onClick={() => navigate('/grant-recipes')}>
          Back to Grant Recipes
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{pageTitle}</h1>
          <p className="text-sm text-slate-500">
            Define the prompt, inputs, and outputs for this grant recipe.
          </p>
        </div>
      </div>

      {!user && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 shadow-card">
          Sign in with Google to save and sync your recipes in the cloud.
        </div>
      )}

      {isLocked && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          This recipe is locked because a structured output was generated. Clone it to make changes.
        </div>
      )}

      <Card>
        {apiKeysError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {apiKeysError}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(event) => handleFieldChange('description', event.target.value)}
              disabled={isLocked}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Short summary for this recipe"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-700">Prompt</label>
              <button
                type="button"
                onClick={handleOpenProjectContext}
                disabled={isLocked}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-600 shadow-sm transition hover:bg-brand-50"
                aria-label="Attach project context"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            {attachedFilesCount > 0 && (
              <div className="mb-2 text-xs font-medium text-slate-600">
                {attachedFilesCount} file{attachedFilesCount === 1 ? '' : 's'} attached as project
                context
              </div>
            )}
            <textarea
              value={form.prompt}
              onChange={(event) => handleFieldChange('prompt', event.target.value)}
              disabled={isLocked}
              rows={6}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="System prompt for your grant recipe"
            />
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-800">Project context</div>
                {attachedFilesCount === 0 ? (
                  <p className="text-xs text-slate-500">
                    Attach files first to enable project context.
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">
                    {projectContextEnabled
                      ? `Project context ON • ${attachedFilesCount} file${attachedFilesCount === 1 ? '' : 's'} selected`
                      : `${attachedFilesCount} file${attachedFilesCount === 1 ? '' : 's'} selected • toggle to include in prompt`}
                  </p>
                )}
                {contextMessage && (
                  <p className="text-xs font-medium text-brand-700">{contextMessage}</p>
                )}
              </div>
              <Toggle
                checked={projectContextEnabled}
                onChange={handleProjectContextToggle}
                disabled={attachedFilesCount === 0 || isLocked}
                labelOff="Off"
                labelOn="On"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Input Parameters (key/value)
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddInput}
                disabled={isLocked}
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                <PlusIcon className="h-4 w-4" />
                Add Input Parameter
              </Button>
            </div>
            <div className="space-y-3">
              {form.inputParams.map((param) => (
                <div
                  key={param.id}
                  className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3 md:grid-cols-[1fr,1fr,auto]"
                >
                  <input
                    type="text"
                    value={param.key}
                    onChange={(event) =>
                      handleInputParamChange(param.id, 'key', event.target.value)
                    }
                    disabled={isLocked}
                    placeholder="Key"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={(event) =>
                      handleInputParamChange(param.id, 'value', event.target.value)
                    }
                    disabled={isLocked}
                    placeholder="Value"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-center text-red-600 hover:bg-red-50"
                    onClick={() => handleRemoveInput(param.id)}
                    disabled={isLocked}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ))}
              {form.inputParams.length === 0 && (
                <div className="text-sm text-slate-500">
                  No input parameters yet. Add one to capture key/value pairs.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Output Fields (field / max symbol count)
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddOutput}
                disabled={isLocked}
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                <PlusIcon className="h-4 w-4" />
                Add Output Field
              </Button>
            </div>
            <div className="space-y-3">
              {form.outputFields.map((field) => {
                const isChars = field.limitType === 'chars';
                const label = isChars ? 'Max Characters' : 'Max Words';
                return (
                  <div
                    key={field.id}
                    className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-3"
                  >
                    <div className="grid gap-3 md:grid-cols-[2fr,1fr,auto]">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Field Name
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(event) =>
                            handleOutputFieldChange(
                              field.id,
                              'label',
                              event.target.value,
                            )
                          }
                          disabled={isLocked}
                          placeholder="e.g. Summary, Budget"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            {label}
                          </label>
                          <Toggle
                            checked={isChars}
                            onChange={(checked) =>
                              handleOutputFieldChange(
                                field.id,
                                'limitType',
                                checked ? 'chars' : 'words',
                              )
                            }
                            labelOff="Words"
                            labelOn="Chars"
                            disabled={isLocked}
                          />
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={field.max}
                          onChange={(event) =>
                            handleOutputFieldChange(
                              field.id,
                              'max',
                              Number.isNaN(Number(event.target.value))
                                ? 0
                                : Number(event.target.value),
                            )
                          }
                          disabled={isLocked}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveOutput(field.id)}
                          disabled={isLocked}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {form.outputFields.length === 0 && (
                <div className="text-sm text-slate-500">
                  No output fields yet. Add one to define generated sections.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSave}
                disabled={isLocked}
                className="text-slate-700"
              >
                <SaveIcon className="h-4 w-4" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClone}
                className="text-slate-700"
              >
                <DuplicateIcon className="h-4 w-4" />
                Clone
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={form.modelType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    modelType: e.target.value as SupportedModel,
                  }))
                }
                disabled={isLocked}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gpt-5.1">OpenAI GPT 5.1</option>
              </select>
              <Button size="md" onClick={handleGenerate} disabled={isLocked}>
                Generate
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {generatedResult && form.outputFields && form.outputFields.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <h3 className="mb-2 text-base font-semibold text-slate-800">Structured Output</h3>
          <div className="divide-y divide-slate-100">
            {form.outputFields.map((field) => (
              <div
                key={field.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="w-full text-sm font-medium text-slate-700 sm:w-1/3">
                  {field.label}
                </div>
                <div className="w-full text-sm text-slate-700 sm:w-2/3">
                  {generatedResult.structured[field.label] ?? (
                    <span className="italic text-slate-400">No value generated.</span>
                  )}
                  {generatedResult.structured[field.label] && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopyField(field.label)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3 w-3"
                        >
                          <path d="M6 2a2 2 0 0 0-2 2v8h2V4h6V2H6z" />
                          <path d="M8 6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V6z" />
                        </svg>
                        {copiedLabel === field.label ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Uncomment for debugging raw response */}
          {/* <pre className="mt-4 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-600">{generatedResult.rawText}</pre> */}
        </div>
      )}
      <ProjectContextModal
        isOpen={isProjectModalOpen}
        files={MOCK_PROJECT_FILES}
        initialSelected={selectedProjectContextFiles}
        onClose={() => setIsProjectModalOpen(false)}
        onAttach={handleAttachProjectFiles}
      />
    </div>
  );
};

export default GrantRecipeDetail;
