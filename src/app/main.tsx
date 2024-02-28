import 'tailwindcss/tailwind.css';
import * as React from 'react';
import { App } from './components/app.js';
import { createRoot } from 'react-dom/client';

createRoot(document.querySelector(`main#app`)!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
