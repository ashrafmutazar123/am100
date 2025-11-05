import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Service worker will be auto-registered by Vite PWA plugin
    navigator.serviceWorker.ready.then((registration) => {
      console.log('✅ PWA: Service Worker ready:', registration.scope);
    }).catch((error) => {
      console.log('❌ PWA: Service Worker error:', error);
    });
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
