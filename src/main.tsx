import React from 'react';
import ReactDOM from 'react-dom/client';
// Fonts are bundled with the app: nothing is fetched from the internet at runtime.
import '@fontsource-variable/google-sans-flex/standard.css';
import '@fontsource/google-sans-code/latin-400.css';
import '@fontsource/google-sans-code/latin-500.css';
import './styles/app.css';
import { App } from './ui/App';
import { StoreProvider } from './ui/store';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>
);
