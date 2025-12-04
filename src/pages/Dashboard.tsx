import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useGrantRecipes } from '../hooks/useGrantRecipes';
import type { GrantRecipe } from '../types';

const Dashboard = () => {
  const navigate = useNavigate();
  const { recipes, createRecipe } = useGrantRecipes();
  const [selectedId, setSelectedId] = useState<string>('');
  const [cloning, setCloning] = useState(false);

  const sortedRecipes = useMemo<GrantRecipe[]>(() => {
    return [...recipes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [recipes]);

  const recentRecipes = sortedRecipes.slice(0, 5);

  const handleClone = async () => {
    if (!selectedId) return;
    const recipe = sortedRecipes.find((r) => r.id === selectedId);
    if (!recipe) return;
    setCloning(true);
    try {
      const { id, updatedAt, ...rest } = recipe;
      const copy = await createRecipe({
        ...rest,
        id: undefined,
        description: recipe.description
          ? `${recipe.description} (copy)`
          : 'Untitled recipe (copy)',
      });
      navigate(`/grant-recipes/${copy.id}`);
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Jump back into your grant work in one click.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Create a recipe" className="h-full">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Start a brand new grant recipe from scratch.
          </p>
          <div className="mt-4">
            <Button onClick={() => navigate('/grant-recipes/new')}>New recipe</Button>
          </div>
        </Card>

        <Card title="Clone a recipe" className="h-full">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Reuse an existing recipe as a starting point.
          </p>
          {sortedRecipes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No recipes yet. Create one first.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Select a recipe to clone</option>
                {sortedRecipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.description || 'Untitled recipe'}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                onClick={handleClone}
                disabled={!selectedId || cloning}
              >
                {cloning ? 'Cloning…' : 'Clone'}
              </Button>
            </div>
          )}
        </Card>

        <Card title="Recent recipes" className="h-full">
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Open one of your latest recipes.
          </p>
          {recentRecipes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              You don't have any recipes yet. Create your first one to see it here.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recentRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => navigate(`/grant-recipes/${recipe.id}`)}
                  className="block w-full text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="px-2 py-3">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {recipe.description || 'Untitled recipe'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">{recipe.updatedAt}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
