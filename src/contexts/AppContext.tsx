// src/contexts/AppContext.tsx

import { createContext, useState, useEffect, ReactNode, useContext, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'; // updateDoc, deleteDoc をインポート
import { db } from '../lib/firebase';
import { useAuthContext } from './AuthContext';
import { Settings, AnnualData, RecurringPayment, AnnualBudget, Transaction } from '../types';

interface AppContextType {
  settings: Settings | null;
  annualData: AnnualData | null;
  recurringPayments: RecurringPayment[];
  loading: boolean;
  saveSettings: (newSettings: Partial<Settings>) => Promise<void>;
  saveAnnualBudget: (year: string, budgetData: AnnualBudget) => Promise<void>;
  saveRecurringPayments: (payments: RecurringPayment[]) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>; // ★ 追加
  deleteTransaction: (id: string) => Promise<void>; // ★ 追加
  isInitialSetupDone: boolean;
  getCategoryName: (id: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: Settings = {
  initialBalance: 0,
  incomeCategories: [ { id: 'cat_salary', name: '給与' }, { id: 'cat_bonus', name: '賞与' }, ],
  expenseCategories: [
    { id: 'cat_food', name: '食費' }, { id: 'cat_housing', name: '住居費' },
    { id: 'cat_utilities', name: '水道光熱費' }, { id: 'cat_transport', name: '交通費' },
    { id: 'cat_comm', name: '通信費' }, { id: 'cat_ent', name: '交際・娯楽費' },
    { id: 'cat_medical', name: '医療費' }, { id: 'cat_other', name: 'その他' },
  ],
  paydaySettings: { payday: 25, rollover: 'before', }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuthContext();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [annualData, setAnnualData] = useState<AnnualData | null>(null);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialSetupDone, setIsInitialSetupDone] = useState(false);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    if (settings) {
      settings.incomeCategories.forEach(cat => map.set(cat.id, cat.name));
      settings.expenseCategories.forEach(cat => map.set(cat.id, cat.name));
    }
    return map;
  }, [settings]);

  const getCategoryName = useCallback((id: string) => {
    return categoryMap.get(id) || id;
  }, [categoryMap]);

  useEffect(() => {
    if (!currentUser) {
      setSettings(null); setAnnualData(null); setRecurringPayments([]);
      setLoading(false); setIsInitialSetupDone(false);
      return;
    }
    setLoading(true);
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const loadedSettings = { ...defaultSettings, ...(data.settings || {}) };
        setSettings(loadedSettings);
        setAnnualData(data.annualData || {});
        setRecurringPayments(data.recurringPayments || []);
        setIsInitialSetupDone(!!(loadedSettings.paydaySettings?.payday));
      } else {
        setSettings(defaultSettings); setAnnualData({}); setRecurringPayments([]);
        setIsInitialSetupDone(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);
  
  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
      if (!currentUser) return;
      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      const currentData = docSnap.data();
      const currentSettings = currentData?.settings || defaultSettings;
      const updatedSettings = { ...currentSettings, ...newSettings };
      await setDoc(userDocRef, { settings: updatedSettings }, { merge: true });
  }, [currentUser]);
  
  const saveAnnualBudget = useCallback(async (year: string, budgetData: AnnualBudget) => {
      if (!currentUser) return;
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { annualData: { [year]: { budget: budgetData } } }, { merge: true });
  }, [currentUser]);

  const saveRecurringPayments = useCallback(async (payments: RecurringPayment[]) => {
      if (!currentUser) return;
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { recurringPayments: payments }, { merge: true });
  }, [currentUser]);

  // ★★★ここからが修正の核心です★★★
  const updateTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    if (!currentUser) return;
    const transDocRef = doc(db, 'users', currentUser.uid, 'transactions', id);
    await updateDoc(transDocRef, data);
  }, [currentUser]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!currentUser) return;
    const transDocRef = doc(db, 'users', currentUser.uid, 'transactions', id);
    await deleteDoc(transDocRef);
  }, [currentUser]);
  // ★★★ここまでが修正の核心です★★★

  const value = {
    settings, annualData, recurringPayments, loading,
    saveSettings, saveAnnualBudget, saveRecurringPayments,
    updateTransaction, deleteTransaction, // ★追加
    isInitialSetupDone,
    getCategoryName,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContextはAppProvider内で使用する必要があります');
  }
  return context;
};