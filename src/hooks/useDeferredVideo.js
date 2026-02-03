import { useEffect, useState } from 'react';

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const hasSaveDataEnabled = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return Boolean(navigator.connection && navigator.connection.saveData);
};

const isSlowConnection = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) {
    return false;
  }
  const effectiveType = connection.effectiveType || '';
  if (effectiveType.includes('2g') || effectiveType.includes('3g')) {
    return true;
  }
  const downlink = connection.downlink;
  return typeof downlink === 'number' && downlink > 0 && downlink < 1.5;
};

const isSmallScreen = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  if (window.matchMedia) {
    return window.matchMedia('(max-width: 767px)').matches;
  }
  return window.innerWidth < 768;
};

const useDeferredVideo = ({
  delay = 1200,
  idleTimeout = 2500,
  forceLoad = false,
} = {}) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (forceLoad) {
      setShouldLoad(true);
      return undefined;
    }
    if (
      prefersReducedMotion()
      || hasSaveDataEnabled()
      || isSlowConnection()
      || isSmallScreen()
    ) {
      return undefined;
    }

    let cancelled = false;

    const triggerLoad = () => {
      if (!cancelled) {
        setShouldLoad(true);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(triggerLoad, { timeout: idleTimeout });
      return () => {
        cancelled = true;
        if (typeof window !== 'undefined' && window.cancelIdleCallback) {
          window.cancelIdleCallback(idleId);
        }
      };
    }

    const timeoutId = window.setTimeout(triggerLoad, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [delay, idleTimeout, forceLoad]);

  return shouldLoad;
};

export default useDeferredVideo;
