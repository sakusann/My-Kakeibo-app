import React from 'react';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import KakeiboApp from './components/KakeiboApp';
import AuthScreen from './components/AuthScreen';
import { Toaster } from "./components/ui/toaster";

function AppContent() {
  const { currentUser, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return currentUser ? <KakeiboApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
        <Toaster />
      </AppProvider>
    </AuthProvider>
  );
}