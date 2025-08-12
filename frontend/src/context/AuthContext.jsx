import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/config'; // 以前作成したconfigファイルをインポート
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

// 1. Contextオブジェクトを作成
const AuthContext = createContext();

// 2. 他のコンポーネントでContextを簡単に使えるようにするためのカスタムフック
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Contextの機能を提供するプロバイダーコンポーネント
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // 認証状態を確認中かどうかのフラグ

  // ログイン・サインアップ・ログアウト関数を定義
  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  // 最初に一度だけ実行し、Firebaseの認証状態の変更を監視する
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false); // 確認が完了したらローディングを解除
    });

    return unsubscribe; // コンポーネントが不要になったら監視を解除
  }, []);

  // Contextで提供する値
  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
  };

  // ローディング中でなければ、子コンポーネントを表示
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};