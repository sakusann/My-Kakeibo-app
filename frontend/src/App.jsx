import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppContextProvider } from './context/AppContext'; // ★インポート

// Layouts
import AppLayout from './layouts/AppLayout';

// Screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MonthlyTrackerScreen from './screens/MonthlyTrackerScreen';
import AnnualSummaryScreen from './screens/AnnualSummaryScreen';
import SettingsScreen from './screens/SettingsScreen';


const RequireAuth = () => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  // 認証済みの場合、子コンポーネントがAppコンテキストを使えるように囲む
  return (
    <AppContextProvider>
      <AppLayout />
    </AppContextProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/" element={<RequireAuth />}>
            <Route path="monthly" element={<MonthlyTrackerScreen />} />
            <Route path="summary" element={<AnnualSummaryScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route index element={<Navigate to="/monthly" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;