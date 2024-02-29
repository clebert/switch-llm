import 'tailwindcss/tailwind.css';
import * as React from 'react';
import { App } from './components/app.js';
import { createRoot } from 'react-dom/client';

declare global {
  interface Window {
    webkit: { messageHandlers: { selectModel: { postMessage: (message: null) => void } } };
    setModelPath: (value: string) => void;
  }
}

createRoot(document.querySelector(`main#app`)!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
