import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { ConfigProvider } from 'antd';
import { antdThemeConfig } from './styles/antd-theme';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

// Safety net: if React fails to mount, show error in DOM directly
const rootEl = document.getElementById('root');

try {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Provider store={store}>
        <ConfigProvider theme={antdThemeConfig}>
          <BrowserRouter>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '10px',
                  background: '#1e293b',
                  color: '#f8fafc',
                  fontSize: '14px',
                },
              }}
            />
          </BrowserRouter>
        </ConfigProvider>
      </Provider>
    </React.StrictMode>
  );
} catch (err) {
  // If React itself fails to mount, show a visible error in HTML
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:Inter,sans-serif;padding:24px;">
      <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px;max-width:500px;width:100%;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 8px;">App Failed to Start</h1>
        <p style="color:#94a3b8;margin-bottom:20px;">Please hard refresh the page (Ctrl+Shift+R)</p>
        <pre style="background:#0f172a;color:#f87171;padding:16px;border-radius:8px;font-size:12px;text-align:left;overflow:auto;">
${err?.message || 'Unknown error'}
        </pre>
        <button onclick="window.location.reload()" style="margin-top:20px;padding:12px 24px;background:#166534;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
          🔄 Refresh Page
        </button>
      </div>
    </div>
  `;
}
