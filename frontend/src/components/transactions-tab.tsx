"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddTransactionDialog } from './add-transaction-dialog';
import { TransactionTable } from './transaction-table';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { useAppContext } from '../context/AppContext.tsx';

interface TransactionsTabProps {
  userId: string;
}

export function TransactionsTab({ userId }: TransactionsTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { settings, annualData } = useAppContext();

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const q = query(collection(db, `users/${userId}/transactions`), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userTransactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        userTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(userTransactions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const { income, expenses } = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expenses += t.amount;
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  const balance = income - expenses;

  const categorySummary = useMemo(() => {
    if (!settings || !annualData || transactions.length === 0) {
      return [];
    }

    const currentMonth = new Date().getMonth(); // 0-indexed
    const currentYear = new Date().getFullYear();
    const currentAnnualData = annualData[currentYear];

    if (!currentAnnualData || !currentAnnualData.budget) {
      return []; // No annual budget data for current year
    }

    const isBonusMonth = settings.summerBonusMonths.includes(currentMonth + 1) || settings.winterBonusMonths.includes(currentMonth + 1);
    const monthlyBudget = isBonusMonth ? currentAnnualData.budget.bonusMonthBudget : currentAnnualData.budget.normalMonthBudget;

    const expensesByMonthAndCategory: Record<string, Record<string, number>> = {};

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const transactionDate = new Date(t.date);
        const monthKey = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`;

        if (!expensesByMonthAndCategory[monthKey]) {
          expensesByMonthAndCategory[monthKey] = {};
        }
        expensesByMonthAndCategory[monthKey][t.category] = (expensesByMonthAndCategory[monthKey][t.category] || 0) + t.amount;
      }
    });

    const currentMonthKey = `${currentYear}-${currentMonth}`;
    const currentMonthExpenses = expensesByMonthAndCategory[currentMonthKey] || {};

    const summary = settings.expenseCategories.map(category => {
      const budgeted = monthlyBudget[category.id] || 0;
      const actual = currentMonthExpenses[category.name] || 0;
      const remaining = budgeted - actual;
      return {
        categoryName: category.name,
        budgeted,
        actual,
        remaining,
      };
    });

    return summary;
  }, [transactions, settings, annualData]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>総収入</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {loading ? <Skeleton className="h-8 w-32" /> : `¥${income.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>総支出</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? <Skeleton className="h-8 w-32" /> : `¥${expenses.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>残高</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {loading ? <Skeleton className="h-8 w-32" /> : `¥${balance.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {settings && annualData && categorySummary.length > 0 && ( // categorySummary.length > 0 を追加
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>今月のカテゴリ別予算と支出</CardTitle>
            <CardDescription>{new Date().getFullYear()}年 {new Date().getMonth() + 1}月</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">予算</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支出</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">残り/超過</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categorySummary.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.categoryName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥{item.budgeted.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥{item.actual.toLocaleString()}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${item.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ¥{item.remaining.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>最近の取引</CardTitle>
            <CardDescription>収入と支出の一覧です。</CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} variant="accent">
            <PlusCircle className="mr-2 h-4 w-4" /> 取引を追加
          </Button>
        </CardHeader>
        <CardContent>
          <TransactionTable transactions={transactions} loading={loading} />
        </CardContent>
      </Card>
      <AddTransactionDialog userId={userId} isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}