import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { GrantRecipe } from '../types';

const STORAGE_KEY = 'granter.recipes';

interface GrantRecipesContextValue {
  recipes: GrantRecipe[];
  getRecipeById: (id: string) => GrantRecipe | undefined;
  createRecipe: (recipePartial: Partial<GrantRecipe>) => GrantRecipe;
  updateRecipe: (
    id: string,
    updates: Partial<GrantRecipe>,
  ) => GrantRecipe | undefined;
  deleteRecipe: (id: string) => void;
}

const GrantRecipesContext = createContext<GrantRecipesContextValue | null>(
  null,
);

export const formatTimestamp = (date: Date) => {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}/${date.getFullYear()} ${hh}:${min}`;
};

export const computeTokenCount = (prompt?: string) =>
  Math.max(0, Math.round((prompt?.length ?? 0) / 4));

const seedRecipes = (): GrantRecipe[] => {
  const now = formatTimestamp(new Date());
  const baseModel = 'gemini-2.5-flash';
  const firstPrompt =
    'Draft a concise outline for a community grant proposal focused on STEM access. Include an executive summary and a short budget line item.';
  const secondPrompt =
    'Create a grant recipe to request a one-pager with objectives, success metrics, and timeline for a youth arts program.';

  return [
    {
      id: 'seed-1',
      description: 'STEM Access Outline',
      prompt: firstPrompt,
      inputParams: [
        { id: 'ip-1', key: 'organization', value: 'Our Wave Labs' },
        { id: 'ip-2', key: 'focus_area', value: 'STEM Education' },
      ],
      outputFields: [
        { id: 'op-1', label: 'Executive Summary', max: 150, limitType: 'words' },
        { id: 'op-2', label: 'Budget Snapshot', max: 600, limitType: 'chars' },
      ],
      tokenCount: computeTokenCount(firstPrompt),
      modelType: baseModel,
      updatedAt: now,
    },
    {
      id: 'seed-2',
      description: 'Youth Arts One-Pager',
      prompt: secondPrompt,
      inputParams: [
        { id: 'ip-3', key: 'program', value: 'Youth Arts Collective' },
        { id: 'ip-4', key: 'deadline', value: '03/15/2025' },
      ],
      outputFields: [
        { id: 'op-3', label: 'Objectives', max: 120, limitType: 'words' },
        { id: 'op-4', label: 'Timeline', max: 900, limitType: 'chars' },
      ],
      tokenCount: computeTokenCount(secondPrompt),
      modelType: baseModel,
      updatedAt: now,
    },
  ];
};

const loadInitialRecipes = (): GrantRecipe[] => {
  if (typeof window === 'undefined') return seedRecipes();

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return seedRecipes();

  try {
    const parsed = JSON.parse(stored) as GrantRecipe[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to parse stored recipes, using defaults', error);
  }

  return seedRecipes();
};

export const GrantRecipesProvider = ({ children }: PropsWithChildren) => {
  const [recipes, setRecipes] = useState<GrantRecipe[]>(() =>
    loadInitialRecipes(),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }, [recipes]);

  const value = useMemo<GrantRecipesContextValue>(() => {
    const getRecipeById = (id: string) =>
      recipes.find((recipe) => recipe.id === id);

    const createRecipe = (recipePartial: Partial<GrantRecipe>) => {
      const now = new Date();
      const recipe: GrantRecipe = {
        id: recipePartial.id ?? crypto.randomUUID(),
        description: recipePartial.description ?? '',
        prompt: recipePartial.prompt ?? '',
        inputParams: recipePartial.inputParams ?? [],
        outputFields: recipePartial.outputFields ?? [],
        tokenCount:
          recipePartial.tokenCount ?? computeTokenCount(recipePartial.prompt),
        modelType: recipePartial.modelType ?? 'gemini-2.5-flash',
        updatedAt: recipePartial.updatedAt ?? formatTimestamp(now),
      };
      setRecipes((prev) => [recipe, ...prev]);
      return recipe;
    };

    const updateRecipe = (
      id: string,
      updates: Partial<GrantRecipe>,
    ): GrantRecipe | undefined => {
      let nextRecipe: GrantRecipe | undefined;
      setRecipes((prev) =>
        prev.map((recipe) => {
          if (recipe.id !== id) return recipe;
          nextRecipe = { ...recipe, ...updates };
          return nextRecipe;
        }),
      );
      return nextRecipe;
    };

    const deleteRecipe = (id: string) => {
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
    };

    return {
      recipes,
      getRecipeById,
      createRecipe,
      updateRecipe,
      deleteRecipe,
    };
  }, [recipes]);

  return createElement(GrantRecipesContext.Provider, { value }, children);
};

export const useGrantRecipes = () => {
  const ctx = useContext(GrantRecipesContext);
  if (!ctx) throw new Error('useGrantRecipes must be used within provider');
  return ctx;
};
