import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AppProviders from './AppProviders.jsx';
import ErrorBoundary from './components/ErrorBoundary';

export function mountApp() {
  const initialData =
    typeof window !== 'undefined' && window.__INITIAL_DATA__
      ? window.__INITIAL_DATA__
      : {};
  const container = document.getElementById('root');
  if (!container) {
    return;
  }
  const hasServerRenderedContent = Boolean(container.firstElementChild);

  const appTree = (
    <React.StrictMode>
      <ErrorBoundary>
        <AppProviders initialData={initialData}>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <App />
          </BrowserRouter>
        </AppProviders>
      </ErrorBoundary>
    </React.StrictMode>
  );

  if (hasServerRenderedContent) {
    hydrateRoot(container, appTree);
  } else {
    createRoot(container).render(appTree);
  }
}

export default mountApp;
