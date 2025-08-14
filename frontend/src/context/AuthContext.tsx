import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { User } from '../lib/types';
import { useToast } from '@/hooks/use-toast';

// Define the type for the context value
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const onGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: 'destructive',
        title: 'ログインエラー',
        description: 'Googleログインに失敗しました。後でもう一度お試しください。',
      });
    }
  };

  const onSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-Out Error:", error);
      toast({
        variant: 'destructive',
        title: 'ログアウトエラー',
        description: 'ログアウトに失敗しました。',
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user as User);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    onGoogleSignIn,
    onSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
