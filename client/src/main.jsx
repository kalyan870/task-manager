import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  root.render(
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <section className="max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-gray-900">TaskFlow setup needed</h1>
        <p className="mt-3 text-gray-600">Add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to the client environment, and configure the server Clerk secret and Neon database URL before signing in.</p>
      </section>
    </main>,
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={publishableKey}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster position="top-right" />
          </AuthProvider>
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>,
  );
}
