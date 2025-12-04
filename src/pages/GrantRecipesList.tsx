import { Link, useNavigate } from 'react-router-dom';
import { Table } from '../components/Table';
import { EditIcon, PlusIcon, TrashIcon, DuplicateIcon } from '../components/Icons';
import { useGrantRecipes } from '../hooks/useGrantRecipes';
import { useAuth } from '../context/AuthContext';

const GrantRecipesList = () => {
  const { user } = useAuth();
  const { recipes, deleteRecipe, loading, getRecipeById, createRecipe } =
    useGrantRecipes();
  const navigate = useNavigate();

  const handleDelete = async (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string,
    description: string,
  ) => {
    event.stopPropagation();
    const confirmed = window.confirm(
      `Delete "${description}"? This action cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteRecipe(id);
    } catch (error) {
      console.error('Failed to delete recipe', error);
      alert('Please sign in to delete recipes.');
    }
  };

  const handleClone = async (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ) => {
    event.stopPropagation();

    const original = getRecipeById(id);
    if (!original) return;

    const baseDescription = original.description || 'Untitled';
    const existingDescriptions = recipes.map((r) => r.description || 'Untitled');

    let copyIndex = 1;
    let newDescription = '';
    while (true) {
      newDescription =
        copyIndex === 1
          ? `${baseDescription} (copy)`
          : `${baseDescription} (copy ${copyIndex})`;

      if (!existingDescriptions.includes(newDescription)) break;
      copyIndex += 1;
    }

    try {
      const cloned = await createRecipe({
        description: newDescription,
        prompt: original.prompt,
        inputParams: original.inputParams,
        outputFields: original.outputFields,
        modelType: original.modelType,
        projectContextEnabled: original.projectContextEnabled,
        projectContextFiles: original.projectContextFiles,
        locked: false,
        structuredOutput: {},
      });

      navigate(`/grant-recipes/${cloned.id}`);
    } catch (error) {
      console.error('Failed to clone recipe', error);
      alert('Please sign in to clone recipes.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Grant Recipes</h1>
          <p className="text-sm text-slate-500">
            Browse, edit, and create prompt recipes for grants.
          </p>
        </div>
        <Link
          to="/grant-recipes/new"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-md transition hover:bg-brand-600"
          aria-label="Create grant recipe"
        >
          <PlusIcon className="h-6 w-6" />
        </Link>
      </div>

      {!user && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 shadow-card">
          Sign in with Google to sync your recipes to the cloud.
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-card">
          Loading recipes…
        </div>
      ) : recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-card">
          No recipes yet. Click the + button to create one.
        </div>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Token Count</th>
              <th className="px-4 py-3">Model Type</th>
              <th className="px-4 py-3">Updated At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {recipes.map((recipe) => (
              <tr
                key={recipe.id}
                onClick={() => navigate(`/grant-recipes/${recipe.id}`)}
                className="cursor-pointer bg-white transition hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-800">
                  {recipe.description || 'Untitled'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {recipe.tokenCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-600">{recipe.modelType}</td>
                <td className="px-4 py-3 text-slate-600">{recipe.updatedAt}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/grant-recipes/${recipe.id}`);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-100"
                      aria-label="Edit"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => handleClone(event, recipe.id)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-100"
                      aria-label="Clone"
                    >
                      <DuplicateIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) =>
                        handleDelete(event, recipe.id, recipe.description)
                      }
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-red-600 transition hover:bg-red-100"
                      aria-label="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default GrantRecipesList;
