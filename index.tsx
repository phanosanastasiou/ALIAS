import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.error("Failed to render app:", e);
    rootElement.innerHTML = `
      <div style="color: #ff5555; background: #222; padding: 20px; font-family: monospace; height: 100vh;">
        <h3>App Crashed</h3>
        <p>Check the console for details.</p>
        <pre>${e instanceof Error ? e.message : String(e)}</pre>
      </div>
    `;
  }
}
