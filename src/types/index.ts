// src/types/index.ts

import { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  name: string;
}

export interface PaydaySettings {
  payday: number;
  rollover: 'before' | 'after';
}

export interface Settings {
  initialBalance: number;
  incomeCategories: Category[];
  expenseCategories: Category[];
  paydaySettings?: PaydaySettings;
}

export interface MonthlyBudget {
  [categoryId: string]: number;
}

export interface AnnualBudget {
  startingBalance: number;
  plannedBalance: number[];
  normalMonthBudget: MonthlyBudget;
  bonusMonthBudget: MonthlyBudget;
  monthlyIncome: number;
  summerBonus: number;
  winterBonus: number;
  summerBonusMonths: number[];
  winterBonusMonths: number[];
  summerBonusPayday: number;
  winterBonusPayday: number;
}

export interface AnnualData {
  [year: string]: {
    budget: AnnualBudget;
  };
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  date: string; // "yyyy-MM-dd"
  description: string;
  amount: number;
  category: string;
  tags?: string[];
}

export interface FirestoreTransaction {
    id: string;
    userId: string;
    type: 'income' | 'expense';
    date: Timestamp;
    description: string;
    amount: number;
    category: string;
    tags?: string[];
}

export interface RecurringPayment {
    id: string;
    title: string;
    amount: number;
    paymentDay: number;
    categoryId: string;
    type: 'income' | 'expense';
    isSystemGenerated?: boolean; // ★ システムが自動生成した収入かどうかのフラグ
}

export interface PaydayCycle {
    start: Date;
    end: Date;
}