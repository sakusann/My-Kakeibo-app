import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthForm } from '../components/auth-form';

const LoginScreen = () => {
  const { onGoogleSignIn } = useAuth();

  return (
    <AuthForm onGoogleSignIn={onGoogleSignIn} />
  );
};

export default LoginScreen;