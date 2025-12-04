import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import GrantRecipeDetail from './pages/GrantRecipeDetail';
import GrantRecipesList from './pages/GrantRecipesList';
import ApiKeysSettings from './pages/ApiKeysSettings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'grant-recipes', element: <GrantRecipesList /> },
      { path: 'grant-recipes/new', element: <GrantRecipeDetail /> },
      { path: 'grant-recipes/:id', element: <GrantRecipeDetail /> },
      { path: 'settings/api-keys', element: <ApiKeysSettings /> },
    ],
  },
]);
