// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-bg-card)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--card-radius)',
              boxShadow: 'var(--elevation-3)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
            },
            success: {
              iconTheme: { primary: 'var(--color-primary)', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: 'var(--color-error)', secondary: '#fff' },
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
