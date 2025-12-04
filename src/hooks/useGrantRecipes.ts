import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { GrantRecipe } from '../types';

interface GrantRecipesContextValue {
  recipes: GrantRecipe[];
  loading: boolean;
  getRecipeById: (id: string) => GrantRecipe | undefined;
  createRecipe: (recipePartial: Partial<GrantRecipe>) => Promise<GrantRecipe>;
  updateRecipe: (
    id: string,
    updates: Partial<GrantRecipe>,
  ) => Promise<GrantRecipe | undefined>;
  deleteRecipe: (id: string) => Promise<void>;
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

type FirestoreRecipe = Omit<GrantRecipe, 'updatedAt'> & {
  updatedAt?: Timestamp | string;
};

const normalizeRecipe = (data: FirestoreRecipe, id: string): GrantRecipe => {
  const updatedAtString =
    data.updatedAt instanceof Timestamp
      ? formatTimestamp(data.updatedAt.toDate())
      : typeof data.updatedAt === 'string'
        ? data.updatedAt
        : '';

  return {
    id,
    description: data.description ?? '',
    prompt: data.prompt ?? '',
    inputParams: data.inputParams ?? [],
    outputFields: data.outputFields ?? [],
    tokenCount: data.tokenCount ?? computeTokenCount(data.prompt),
    modelType: data.modelType ?? 'gemini-2.5-flash',
    updatedAt: updatedAtString,
    projectContextEnabled: data.projectContextEnabled ?? false,
    projectContextFiles: data.projectContextFiles ?? [],
  };
};

export const GrantRecipesProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<GrantRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      if (!user) {
        setRecipes([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const recipesRef = collection(db, 'users', user.uid, 'recipes');
        const q = query(recipesRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const loaded = snapshot.docs.map((docSnap) =>
          normalizeRecipe(docSnap.data() as FirestoreRecipe, docSnap.id),
        );
        setRecipes(loaded);
      } catch (error) {
        console.error('Failed to load recipes from Firestore', error);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [user]);

  const value = useMemo<GrantRecipesContextValue>(() => {
    const ensureUser = () => {
      if (!user) {
        throw new Error('Sign in to manage recipes.');
      }
      return user;
    };

    const getRecipeById = (id: string) =>
      recipes.find((recipe) => recipe.id === id);

    const createRecipe = async (
      recipePartial: Partial<GrantRecipe>,
    ): Promise<GrantRecipe> => {
      const currentUser = ensureUser();
      const now = new Date();
      const id = recipePartial.id ?? crypto.randomUUID();
      const recipe: GrantRecipe = {
        id,
        description: recipePartial.description ?? '',
        prompt: recipePartial.prompt ?? '',
        inputParams: recipePartial.inputParams ?? [],
        outputFields: recipePartial.outputFields ?? [],
        tokenCount:
          recipePartial.tokenCount ?? computeTokenCount(recipePartial.prompt),
        modelType: recipePartial.modelType ?? 'gemini-2.5-flash',
        updatedAt: formatTimestamp(now),
        projectContextEnabled: recipePartial.projectContextEnabled ?? false,
        projectContextFiles: recipePartial.projectContextFiles ?? [],
      };

      const recipeRef = doc(db, 'users', currentUser.uid, 'recipes', id);
      await setDoc(recipeRef, { ...recipe, updatedAt: serverTimestamp() });
      setRecipes((prev) => {
        const next = [recipe, ...prev.filter((r) => r.id !== id)];
        return next;
      });
      return recipe;
    };

    const updateRecipe = async (
      id: string,
      updates: Partial<GrantRecipe>,
    ): Promise<GrantRecipe | undefined> => {
      const currentUser = ensureUser();
      const existing = getRecipeById(id);
      if (!existing) return undefined;

      const merged: GrantRecipe = {
        ...existing,
        ...updates,
        updatedAt: formatTimestamp(new Date()),
      };

      const recipeRef = doc(db, 'users', currentUser.uid, 'recipes', id);
      await setDoc(recipeRef, { ...merged, updatedAt: serverTimestamp() }, { merge: true });
      setRecipes((prev) =>
        prev.map((recipe) => (recipe.id === id ? merged : recipe)),
      );
      return merged;
    };

    const deleteRecipe = async (id: string): Promise<void> => {
      const currentUser = ensureUser();
      const recipeRef = doc(db, 'users', currentUser.uid, 'recipes', id);
      await deleteDoc(recipeRef);
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
    };

    return {
      recipes,
      loading,
      getRecipeById,
      createRecipe,
      updateRecipe,
      deleteRecipe,
    };
  }, [recipes, user, loading]);

  return createElement(GrantRecipesContext.Provider, { value }, children);
};

export const useGrantRecipes = () => {
  const ctx = useContext(GrantRecipesContext);
  if (!ctx) throw new Error('useGrantRecipes must be used within provider');
  return ctx;
};
