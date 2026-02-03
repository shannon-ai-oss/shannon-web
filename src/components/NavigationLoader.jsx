import React, { startTransition, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import RouteLoader from './RouteLoader';
import './NavigationLoader.css';

const SHOW_DURATION_MS = 500;

export default function NavigationLoader() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    startTransition(() => {
      setVisible(true);
    });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        setVisible(false);
      });
      timeoutRef.current = null;
    }, SHOW_DURATION_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [location.pathname, location.search, location.hash]);

  if (!visible) {
    return null;
  }

  return (
    <div className="navigation-loader-overlay" aria-live="polite" aria-busy="true">
      <RouteLoader label="Loading…" />
    </div>
  );
}
