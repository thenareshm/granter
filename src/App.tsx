import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { GrantRecipesProvider } from './hooks/useGrantRecipes';
import { AuthProvider } from './context/AuthContext';

const App = () => {
  return (
    <AuthProvider>
      <GrantRecipesProvider>
        <RouterProvider router={router} />
      </GrantRecipesProvider>
    </AuthProvider>
  );
};

export default App;
