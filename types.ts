
export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Settings {
  monthlyIncome: number;
  initialBalance: number;
  expenseCategories: ExpenseCategory[];
  bonusMonths: number[]; // 1-12
}

export interface Budget {
  [categoryId: string]: number;
}

export interface AnnualBudget {
  year: number;
  startingBalance: number;
  normalMonthBudget: Budget;
  bonusMonthBudget: Budget;
  plannedBalance: number[]; // 12 months
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  amount: number;
  categoryId?: string; // Only for expenses
  description: string;
}

export interface AnnualData {
  budget: AnnualBudget;
  transactions: Transaction[];
  actualBalances: (number | null)[]; // 12 months
}

export interface AppState {
  settings: Settings | null;
  annualData: { [year: number]: AnnualData };
}

export interface AppContextType extends AppState {
  saveSettings: (settings: Settings) => void;
  saveAnnualData: (year: number, data: AnnualData) => void;
  addTransaction: (year: number, transaction: Transaction) => void;
  updateActualBalance: (year: number, month: number, balance: number | null) => void;
}
