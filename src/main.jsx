import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// ─── Service Worker Registration (PWA) ───
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registered:', reg.scope);

        // Verifier les mises a jour periodiquement
        setInterval(() => reg.update(), 60 * 60 * 1000);

        // Detecter une nouvelle version du SW
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouvelle version disponible — afficher un toast
              showUpdateToast(reg);
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });

    // Ecouter les messages du SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('[SW] Updated to version:', event.data.version);
      }
    });
  });
}

function showUpdateToast(registration) {
  const toast = document.createElement('div');
  toast.id = 'sw-update-toast';
  toast.innerHTML = `
    <div style="
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      z-index: 10000; display: flex; align-items: center; gap: 12px;
      padding: 12px 20px; border-radius: 12px;
      background: rgba(12, 20, 36, 0.95);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(34, 211, 238, 0.3);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: slideUp 0.3s ease;
    ">
      <span style="font-size: 16px;">🔄</span>
      <span style="font-size: 13px; color: #e2e8f0;">Nouvelle version disponible</span>
      <button onclick="
        document.getElementById('sw-update-toast').remove();
        navigator.serviceWorker.ready.then(r => {
          if (r.waiting) r.waiting.postMessage({ type: 'SKIP_WAITING' });
        });
        setTimeout(() => window.location.reload(), 300);
      " style="
        padding: 6px 14px; border-radius: 8px;
        background: linear-gradient(135deg, rgba(34,211,238,0.25), rgba(34,211,238,0.1));
        border: 1px solid rgba(34,211,238,0.4);
        color: #22d3ee; font-size: 12px; font-weight: 600;
        cursor: pointer;
      ">Mettre a jour</button>
      <button onclick="document.getElementById('sw-update-toast').remove()" style="
        background: none; border: none; color: #64748b; cursor: pointer;
        font-size: 16px; padding: 4px;
      ">&times;</button>
    </div>
    <style>
      @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    </style>
  `;
  document.body.appendChild(toast);
}
