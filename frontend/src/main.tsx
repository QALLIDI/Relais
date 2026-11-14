import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from 'react-oidc-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { oidcConfig } from './auth/auth';
import App from './App';
import Inscription from './pages/Inscription';
import PageLegaleVue from './pages/legal/PageLegaleVue';
import { CHEMINS_LEGAUX } from './pages/legal/contenus';
import { BandeauCookies } from './components/Cookies';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// L'inscription et les pages légales sont publiques : elles s'affichent sans passer par la connexion Keycloak.
const chemin = window.location.pathname.replace(/\/+$/, '') || '/';
const publique = chemin.startsWith('/inscription');
const legale = CHEMINS_LEGAUX.includes(chemin);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <QueryClientProvider client={queryClient}>
        {legale ? (
          <PageLegaleVue slug={chemin.slice(1)} />
        ) : publique ? (
          <Inscription />
        ) : (
          <BrowserRouter>
            <App />
          </BrowserRouter>
        )}
        <BandeauCookies />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
