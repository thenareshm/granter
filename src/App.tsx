import { RouterProvider } from 'react-router-dom';
import { GrantRecipesProvider } from './hooks/useGrantRecipes';
import { router } from './router';

const App = () => {
  return (
    <GrantRecipesProvider>
      <RouterProvider router={router} />
    </GrantRecipesProvider>
  );
};

export default App;
