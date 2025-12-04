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

  const [form, setForm] = useState<GrantRecipe>(createEmptyRecipe());
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [contextMessage, setContextMessage] = useState<string | null>(null);
  const contextMessageTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEditing = Boolean(id);
  const selectedProjectContextFiles = form.projectContextFiles ?? [];
  const projectContextEnabled = form.projectContextEnabled ?? false;
  const attachedFilesCount = selectedProjectContextFiles.length;

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
        modelType: 'gemini-2.5-flash',
        updatedAt: now,
        projectContextEnabled: form.projectContextEnabled ?? false,
        projectContextFiles: form.projectContextFiles ?? [],
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
    const hasDescription = form.description.trim().length > 0;
    const hasPrompt = form.prompt.trim().length > 0;
    const hasOutputs = form.outputFields.length > 0;

    if (!hasDescription || !hasPrompt || !hasOutputs) {
      setError('Please provide a description, prompt, and at least one output field.');
      return;
    }

    setError(null);
    await persistRecipe(true);
    const projectContextInfo = {
      enabled: projectContextEnabled,
      files: selectedProjectContextFiles,
    };
    console.log('Project context for generation:', projectContextInfo);
    alert('Generation stub – integration coming soon');
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

    const clone: Partial<GrantRecipe> = {
      ...source,
      id: crypto.randomUUID(),
      description: `${source.description || 'Untitled'} (copy)`,
      updatedAt: formatTimestamp(new Date()),
      tokenCount: computeTokenCount(source.prompt),
    };

    await createRecipe(clone);
    navigate('/grant-recipes');
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

      <Card>
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
                disabled={attachedFilesCount === 0}
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
                    placeholder="Key"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={(event) =>
                      handleInputParamChange(param.id, 'value', event.target.value)
                    }
                    placeholder="Value"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-center text-red-600 hover:bg-red-50"
                    onClick={() => handleRemoveInput(param.id)}
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
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveOutput(field.id)}
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
            <div className="flex gap-2">
              <Button size="md" onClick={handleGenerate}>
                Generate
              </Button>
            </div>
          </div>
        </div>
      </Card>
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
