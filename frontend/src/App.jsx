import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppContextProvider } from './context/AppContext';
import LoginScreen from './screens/LoginScreen';
import { KakeiboApp } from './components/kakeibo-app';
import { Toaster } from './components/ui/toaster';

function AppContent() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>; // Or a proper loading spinner
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <AppContextProvider>
      <KakeiboApp user={currentUser} onSignOut={() => { /* Logout handled by AuthProvider */ }} />
    </AppContextProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

export default App;