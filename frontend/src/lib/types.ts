import { User as FirebaseUser } from "firebase/auth";

export type User = FirebaseUser;

export type Transaction = {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  date: string; // YYYY-MM-DD format
  description: string;
  amount: number;
  category: string;
};

export const TransactionCategories = {
  income: [
    'Salary',
    'Freelance',
    'Investment',
    'Gift',
    'Other Income',
  ],
  expense: [
    'Food & Groceries',
    'Housing',
    'Transportation',
    'Utilities',
    'Healthcare',
    'Entertainment',
    'Shopping',
    'Education',
    'Other Expense',
  ],
};
