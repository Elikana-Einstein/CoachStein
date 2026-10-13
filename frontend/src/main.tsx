import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#141b20',
          color: '#e6eee8',
          border: '1px solid #34443b',
          borderRadius: '12px',
          fontSize: '13px',
        },
        success: { iconTheme: { primary: '#9be2c5', secondary: '#142019' } },
        error: { iconTheme: { primary: '#f1aaa0', secondary: '#241716' } },
      }}
    />
  </React.StrictMode>,
);
