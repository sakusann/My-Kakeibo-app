import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

export const AppContextProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState(null); // APIキーを管理するstate
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!currentUser) {
      setAppData(null);
      setGeminiApiKey(null); // ログアウト時にキーをクリア
      setLoading(false);
      return;
    }

    setLoading(true);

    // ★ APIキーをFirestoreから取得する非同期関数
    const fetchApiKey = async () => {
      try {
        const keyDocRef = doc(db, 'secrets', 'apiKeys');
        const keyDocSnap = await getDoc(keyDocRef);
        if (keyDocSnap.exists()) {
          setGeminiApiKey(keyDocSnap.data().geminiApiKey);
        } else {
          console.error("APIキーが見つかりません！Firestoreの'secrets/apiKeys'ドキュメントを確認してください。");
        }
      } catch (error) {
        console.error("APIキーの取得に失敗しました:", error);
      }
    };

    fetchApiKey(); // ログイン時にAPIキーを取得

    // ユーザーデータのリアルタイム購読
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppData(docSnap.data());
      } else {
        setAppData({ settings: null, annualData: {} });
      } setLoading(false);
    }, (error) => {
      console.error("Firestoreのデータ取得に失敗:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

// AppContext.jsx の中の saveSettings 関数
  const saveSettings = useCallback(async (newSettings) => {
    if (!currentUser) throw new Error("ユーザーが認証されていません。");
    const userDocRef = doc(db, 'users', currentUser.uid);
    // newSettingsオブジェクトをそのまま保存
    await setDoc(userDocRef, { settings: newSettings }, { merge: true });
  }, [currentUser]);
  
  const saveAnnualData = useCallback(async (year, data) => {
    if (!currentUser) throw new Error("ユーザーが認証されていません。");
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, {
      annualData: { [year]: data }
    }, { merge: true });
  }, [currentUser]);

  const saveTransaction = useCallback(async (transaction, year) => {
    if (!currentUser) throw new Error("ユーザーが認証されていません。");
    const userDocRef = doc(db, 'users', currentUser.uid);
    const currentTransactions = appData.annualData?.[year]?.transactions ?? [];
    const isEditing = currentTransactions.some(tx => tx.id === transaction.id);
    let newTransactions;
    if (isEditing) {
      newTransactions = currentTransactions.map(tx => tx.id === transaction.id ? transaction : tx);
    } else {
      newTransactions = [...currentTransactions, transaction];
    }
    newTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    await updateDoc(userDocRef, {
      [`annualData.${year}.transactions`]: newTransactions
    });
  }, [currentUser, appData]);

  const deleteTransaction = useCallback(async (transactionId, year) => {
    if (!currentUser) throw new Error("ユーザーが認証されていません。");
    const userDocRef = doc(db, 'users', currentUser.uid);
    const currentTransactions = appData.annualData?.[year]?.transactions ?? [];
    if (!currentTransactions) return;
    const newTransactions = currentTransactions.filter(tx => tx.id !== transactionId);
    await updateDoc(userDocRef, {
      [`annualData.${year}.transactions`]: newTransactions
    });
  }, [currentUser, appData]);
  
  const updateActualBalance = useCallback(async (year, monthIndex, balance) => {
    if (!currentUser) throw new Error("ユーザーが認証されていません。");
    const userDocRef = doc(db, 'users', currentUser.uid);
    const currentBalances = appData.annualData?.[year]?.actualBalances ?? [];
    const newBalances = currentBalances.filter(b => b.month !== monthIndex);
    if (balance !== null && balance !== '') {
        newBalances.push({ month: monthIndex, balance: Number(balance) });
    }
    await updateDoc(userDocRef, {
      [`annualData.${year}.actualBalances`]: newBalances
    });
  }, [currentUser, appData]);

  // Contextで提供する値
  const value = {
    settings: appData?.settings || null,
    annualData: appData?.annualData || {},
    loading,
    geminiApiKey, // ★追加
    theme,
    toggleTheme,
    saveSettings,
    saveAnnualData,
    saveTransaction,
    deleteTransaction,
    updateActualBalance,
  };

  return (
    <AppContext.Provider value={value}>
      {!loading && children}
    </AppContext.Provider>
  );
};