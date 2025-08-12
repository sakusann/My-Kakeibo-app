"use client";

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddTransactionDialog } from './add-transaction-dialog';
import { TransactionTable } from './transaction-table';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface TransactionsTabProps {
  userId: string;
}

export function TransactionsTab({ userId }: TransactionsTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {loading ? <Skeleton className="h-8 w-32" /> : `$${income.toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {loading ? <Skeleton className="h-8 w-32" /> : `$${expenses.toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${balance > 0 ? 'text-primary' : balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {loading ? <Skeleton className="h-8 w-32" /> : `$${balance.toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>View and manage your income and expenses.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} variant="accent">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
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
