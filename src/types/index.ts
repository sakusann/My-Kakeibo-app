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
  monthlyIncome: number;
  summerBonus: number;
  winterBonus: number;
  initialBalance: number;
  incomeCategories: Category[];
  expenseCategories: Category[];
  summerBonusMonths: number[];
  winterBonusMonths: number[];
  paydaySettings: PaydaySettings;
}

export interface MonthlyBudget {
  [categoryId: string]: number;
}

export interface AnnualBudget {
  startingBalance: number;
  plannedBalance: number[];
  normalMonthBudget: MonthlyBudget;
  bonusMonthBudget: MonthlyBudget;
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
  otherCategoryDetail?: string;
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
    otherCategoryDetail?: string;
    tags?: string[];
}

export interface RecurringPayment {
    id: string;
    title: string;
    amount: number;
    paymentDay: number; // 1-31
    categoryId: string;
    type: 'income' | 'expense';
}

export interface PaydayCycle {
    start: Date;
    end: Date;
}