export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  date: string; // Stored as YYYY-MM-DD string
  category: string;
  amount: number;
  description: string;
}

export const TransactionCategories = {
  income: [
    'Salary', 
    'Freelance', 
    'Investment', 
    'Gift',
    'Other'
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
    'Other',
  ],
};
