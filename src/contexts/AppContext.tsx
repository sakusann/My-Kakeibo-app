// src/contexts/AppContext.tsx

import { createContext, useState, useEffect, ReactNode, useContext, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from './AuthContext';
import { Settings, AnnualData, RecurringPayment, AnnualBudget, Category } from '../types';

interface AppContextType {
  settings: Settings | null;
  annualData: AnnualData | null;
  recurringPayments: RecurringPayment[];
  loading: boolean;
  saveSettings: (newSettings: Partial<Settings>) => Promise<void>;
  saveAnnualBudget: (year: string, budgetData: AnnualBudget) => Promise<void>;
  saveRecurringPayments: (payments: RecurringPayment[]) => Promise<void>;
  isInitialSetupDone: boolean;
  getCategoryName: (id: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: Settings = {
  monthlyIncome: 0,
  summerBonus: 0,
  winterBonus: 0,
  initialBalance: 0,
  incomeCategories: [ { id: 'cat_salary', name: '給与' }, { id: 'cat_bonus', name: '賞与' }, ],
  expenseCategories: [
    { id: 'cat_food', name: '食費' }, { id: 'cat_housing', name: '住居費' },
    { id: 'cat_utilities', name: '水道光熱費' }, { id: 'cat_transport', name: '交通費' },
    { id: 'cat_comm', name: '通信費' }, { id: 'cat_ent', name: '交際・娯楽費' },
    { id: 'cat_medical', name: '医療費' }, { id: 'cat_other', name: 'その他' },
  ],
  summerBonusMonths: [7],
  winterBonusMonths: [12],
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
        setIsInitialSetupDone(!!(loadedSettings.monthlyIncome > 0 && loadedSettings.paydaySettings?.payday > 0));
      } else {
        setSettings(defaultSettings); setAnnualData({}); setRecurringPayments([]);
        setIsInitialSetupDone(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);
  
  // ★★★ここからが今回の修正の核心です★★★
  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
      if (!currentUser) return;
      const userDocRef = doc(db, 'users', currentUser.uid);

      // 1. 現在の最新の設定情報を取得
      const currentSettings = settings || defaultSettings;

      // 2. 最新情報に、今回の変更(newSettings)をマージ（結合）する
      const updatedSettings = { ...currentSettings, ...newSettings };

      // 3. マージ済みの完全なオブジェクトで、Firestoreを安全に上書きする
      await setDoc(userDocRef, { 
          settings: updatedSettings 
      }, { merge: true }); // merge:trueはannualDataなど他のトップレベルフィールドを保護する

  }, [currentUser, settings]); // settingsを依存配列に追加
  
  const saveAnnualBudget = useCallback(async (year: string, budgetData: AnnualBudget) => {
      if (!currentUser) return;
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
          annualData: { [year]: { budget: budgetData } }
      }, { merge: true });
  }, [currentUser]);

  const saveRecurringPayments = useCallback(async (payments: RecurringPayment[]) => {
      if (!currentUser) return;
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { recurringPayments: payments }, { merge: true });
  }, [currentUser]);
  // ★★★ここまでが修正の核心です★★★

  const value = {
    settings, annualData, recurringPayments, loading,
    saveSettings, saveAnnualBudget, saveRecurringPayments,
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