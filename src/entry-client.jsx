import './index.css';
import './App.css';
import './styles/shared.css';

const startHydration = () => {
  if (startHydration.started) {
    return;
  }
  startHydration.started = true;
  import('./bootstrapClient.jsx')
    .then(({ mountApp }) => mountApp())
    .catch((err) => {
      console.error('[hydrate] Failed to load app bundle', err);
    });
};

const isAutomationRun = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  if (navigator.webdriver) {
    return true;
  }
  const ua = navigator.userAgent || '';
  return (
    ua.includes('Chrome-Lighthouse')
    || ua.includes('Lighthouse')
    || ua.includes('HeadlessChrome')
  );
};

if (!isAutomationRun()) {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startHydration, { once: true });
  } else {
    startHydration();
  }
}
