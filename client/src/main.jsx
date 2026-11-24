import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const root = ReactDOM.createRoot(document.getElementById('root'));

if (!publishableKey) {
  root.render(<main className="min-h-screen grid place-items-center p-6 text-center"><p>Authentication setup is incomplete. Configure the Clerk publishable key for this deployment.</p></main>);
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/login">
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster position="top-right" />
          </AuthProvider>
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>
  );
}
