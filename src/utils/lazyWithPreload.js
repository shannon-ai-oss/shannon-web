import React from 'react';

/**
 * Wrap React.lazy to expose a preload() helper so server-side rendering can
 * resolve all lazy modules before calling renderToString. On the client this
 * still preserves code-splitting.
 */
export const lazyWithPreload = (importer) => {
  if (typeof importer !== 'function') {
    throw new Error('lazyWithPreload expects a dynamic import callback');
  }

  let loadPromise = null;
  const load = () => {
    if (!loadPromise) {
      loadPromise = Promise.resolve().then(importer);
    }
    return loadPromise;
  };

  const LazyComponent = React.lazy(() => load());
  LazyComponent.preload = () => load();

  return LazyComponent;
};

export default lazyWithPreload;
