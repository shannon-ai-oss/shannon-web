import React from 'react';
import './RouteLoader.css';

function RouteLoader({ label = 'Loading…' }) {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <div className="loading-bar" aria-hidden="true">
        <span className="loading-bar__track" />
        <span className="loading-bar__progress" />
        <span className="loading-bar__flare" />
      </div>
      <p className="loading-bar__label">{label}</p>
    </div>
  );
}

export default RouteLoader;
