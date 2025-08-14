import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';

// Define types based on schemas and usage
interface Category {
  id: string;
  name: string;
}

export interface Settings {
  monthlyIncome: number;
  summerBonus: number;
  winterBonus: number;
  initialBalance: number;
  incomeCategories: Category[];
  expenseCategories: Category[];
  summerBonusMonths: number[];
  winterBonusMonths: number[];
}

export interface AnnualBudget {
    year: number;
    startingBalance: number;
    normalMonthBudget: Record<string, number>;
    bonusMonthBudget: Record<string, number>;
    plannedBalance: number[];
}

export interface AnnualDataItem {
    budget: AnnualBudget;
    transactions: Transaction[];
    actualBalances: { month: number; balance: number }[];
}

export type AnnualData = Record<string, AnnualDataItem>;

interface AppData {
  settings: Settings | null;
  annualData: AnnualData;
}

interface AppContextType {
  settings: Settings | null;
  annualData: AnnualData;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  saveSettings: (newSettings: Settings) => Promise<void>;
  saveAnnualData: (year: number, data: AnnualDataItem) => Promise<void>;
  saveTransaction: (transaction: Transaction, year: number) => Promise<void>;
  deleteTransaction: (transactionId: string, year: number) => Promise<void>;
  updateActualBalance: (year: number, monthIndex: number, balance: number | null) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider = ({ children }: AppContextProviderProps) => {
  const { currentUser } = useAuth();
  const [appData, setAppData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
    }
    return 'light';
  });

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
      setLoading(false);
      return;
    }

    setLoading(true);

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppData(docSnap.data() as AppData);
      } else {
        const initialData: AppData = {
          settings: null, // Let SetupDialog handle the creation
          annualData: {},
        };
        setDoc(userDocRef, initialData).then(() => {
            setAppData(initialData);
        });
      } 
      setLoading(false);
    }, (error) => {
      console.error("Firestore data fetch failed:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const saveSettings = useCallback(async (newSettings: Settings) => {
    if (!currentUser) throw new Error("User not authenticated.");
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, { settings: newSettings }, { merge: true });
  }, [currentUser]);
  
  const saveAnnualData = useCallback(async (year: number, data: AnnualDataItem) => {
    if (!currentUser) throw new Error("User not authenticated.");
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, {
      [`annualData.${year}`]: data
    });
  }, [currentUser]);

  // The following methods seem to be unused in the current UI, but are kept for potential future use.
  const saveTransaction = useCallback(async (transaction: Transaction, year: number) => {}, [currentUser, appData]);
  const deleteTransaction = useCallback(async (transactionId: string, year: number) => {}, [currentUser, appData]);
  const updateActualBalance = useCallback(async (year: number, monthIndex: number, balance: number | null) => {}, [currentUser, appData]);

  const value: AppContextType = {
    settings: appData?.settings || null,
    annualData: appData?.annualData || {},
    loading,
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