import '@fontsource-variable/fraunces';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from '@/routes';
import './styles/global.css';

function resolveBasename(): string | undefined {
  const env: unknown = Reflect.get(globalThis, 'SFDC_ENV');
  const basePath = typeof env === 'object' && env !== null ? Reflect.get(env, 'basePath') : undefined;
  if (typeof basePath === 'string') return basePath.replace(/\/+$/, '') || undefined;
  const base = document.querySelector('base');
  return base ? new URL(base.href).pathname.replace(/\/+$/, '') || undefined : undefined;
}

const router = createBrowserRouter(routes, { basename: resolveBasename() });

const root = document.getElementById('root');
if (!root) throw new Error('Fin Card Studio needs a #root element.');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
