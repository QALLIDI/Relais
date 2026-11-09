import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from 'react-oidc-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { oidcConfig } from './auth/auth';
import App from './App';
import Inscription from './pages/Inscription';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// L'inscription est publique : elle s'affiche sans passer par la connexion Keycloak.
const publique = window.location.pathname.startsWith('/inscription');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <QueryClientProvider client={queryClient}>
        {publique ? (
          <Inscription />
        ) : (
          <BrowserRouter>
            <App />
          </BrowserRouter>
        )}
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
