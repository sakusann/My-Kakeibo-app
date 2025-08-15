// src/components/DashboardTab.tsx

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPaydayCycle, formatCycle } from '../lib/dateUtils';
import { Transaction, FirestoreTransaction, PaydayCycle } from '../types';
import { Progress } from "@/components/ui/progress";
import { addDays, isWithinInterval } from 'date-fns'; // isWithinInterval をインポート

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
};

const BudgetItem = ({ label, budget, actual }: { label: string, budget: number, actual: number }) => {
    const remaining = budget - actual;
    const progress = budget > 0 ? (actual / budget) * 100 : 0;
    const isOverBudget = remaining < 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium">{label}</span>
                <span className={`text-sm font-semibold ${isOverBudget ? 'text-destructive' : ''}`}>
                    {isOverBudget ? `${formatCurrency(Math.abs(remaining))} 超過` : `残り ${formatCurrency(remaining)}`}
                </span>
            </div>
            <Progress value={progress} className="h-2" indicatorClassName={isOverBudget ? 'bg-destructive' : 'bg-primary'} />
            <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                <span>{formatCurrency(actual)}</span>
                <span>{formatCurrency(budget)}</span>
            </div>
        </div>
    );
};

export default function DashboardTab() {
    const { currentUser } = useAuthContext();
    const { settings, annualData } = useAppContext();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const cycle = useMemo<PaydayCycle | null>(() => {
        if (!settings || !settings.paydaySettings) return null;
        return getPaydayCycle(currentDate, settings.paydaySettings);
    }, [currentDate, settings]);
    
    const handlePrevCycle = useCallback(() => { if (cycle) { setCurrentDate(addDays(cycle.start, -2)); } }, [cycle]);
    const handleNextCycle = useCallback(() => { if (cycle) { setCurrentDate(addDays(cycle.end, 2)); } }, [cycle]);
    
    useEffect(() => {
        if (!currentUser || !cycle) { setLoading(false); return; };
        setLoading(true);
        const fetchTransactions = async () => {
            try {
                const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
                const q = query(tCollection, where('date', '>=', Timestamp.fromDate(cycle.start)), where('date', '<=', Timestamp.fromDate(cycle.end)));
                const querySnapshot = await getDocs(q);
                const fetchedTransactions = querySnapshot.docs.map(doc => {
                    const data = doc.data() as FirestoreTransaction;
                    const dateObject = data.date && typeof data.date.toDate === 'function' ? data.date.toDate() : new Date(data.date as any);
                    return { ...data, id: doc.id, date: dateObject.toISOString().split('T')[0], };
                });
                setTransactions(fetchedTransactions);
            } catch (error) { console.error("Error fetching transactions:", error); setTransactions([]);
            } finally { setLoading(false); }
        };
        fetchTransactions();
    }, [currentUser, cycle]);

    const summary = useMemo(() => {
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { totalIncome, totalExpense, net: totalIncome - totalExpense };
    }, [transactions]);
    
    const budgetSummary = useMemo(() => {
        if (!settings || !annualData || !cycle) return null;
        const currentYear = cycle.start.getFullYear();
        const yearData = annualData[currentYear.toString()];
        if (!yearData || !yearData.budget) return null;
        
        // ★★★ここからが収入予実計算の修正箇所です★★★
        let plannedIncome = yearData.budget.monthlyIncome; // まず月収を基本とする
        
        // 夏季賞与のチェック
        yearData.budget.summerBonusMonths.forEach(month => {
            const bonusDate = new Date(currentYear, month - 1, yearData.budget.summerBonusPayday);
            if (isWithinInterval(bonusDate, { start: cycle.start, end: cycle.end })) {
                plannedIncome += yearData.budget.summerBonus;
            }
        });

        // 冬季賞与のチェック
        yearData.budget.winterBonusMonths.forEach(month => {
            const bonusDate = new Date(currentYear, month - 1, yearData.budget.winterBonusPayday);
            if (isWithinInterval(bonusDate, { start: cycle.start, end: cycle.end })) {
                plannedIncome += yearData.budget.winterBonus;
            }
        });
        // ★★★ここまでが収入予実計算の修正箇所です★★★

        const isBonusCycle = yearData.budget.summerBonusMonths.some(m => isWithinInterval(new Date(currentYear, m - 1, yearData.budget.summerBonusPayday), { start: cycle.start, end: cycle.end })) ||
                             yearData.budget.winterBonusMonths.some(m => isWithinInterval(new Date(currentYear, m - 1, yearData.budget.winterBonusPayday), { start: cycle.start, end: cycle.end }));
        
        const budgetById = isBonusCycle ? yearData.budget.bonusMonthBudget : yearData.budget.normalMonthBudget;
        const plannedExpense = Object.values(budgetById).reduce((sum, val) => sum + val, 0);
        const expenseDetails = settings.expenseCategories.map(cat => {
            const budget = budgetById[cat.id] || 0;
            const actual = transactions.filter(t => t.type === 'expense' && t.category === cat.id).reduce((sum, t) => sum + t.amount, 0);
            return { name: cat.name, budget, actual };
        }).filter(d => d.budget > 0 || d.actual > 0);

        return {
            plannedIncome, actualIncome: summary.totalIncome,
            plannedExpense, actualExpense: summary.totalExpense,
            expenseDetails
        };
    }, [settings, annualData, cycle, transactions, summary]);

    if (!settings || !cycle) { return <p>設定を読み込んでいます...</p>; }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={handlePrevCycle}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-xl font-semibold whitespace-nowrap">{cycle ? formatCycle(cycle) : '日付を計算中...'}</h2>
                <Button variant="outline" size="icon" onClick={handleNextCycle}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card><CardHeader><CardTitle>収入</CardTitle></CardHeader><CardContent className="space-y-2"><div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">実績</span><span className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</span></div><div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">予算</span><span className="text-lg">{formatCurrency(budgetSummary?.plannedIncome || 0)}</span></div></CardContent></Card>
                <Card><CardHeader><CardTitle>支出</CardTitle></CardHeader><CardContent className="space-y-2"><div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">実績</span><span className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpense)}</span></div><div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">予算</span><span className="text-lg">{formatCurrency(budgetSummary?.plannedExpense || 0)}</span></div></CardContent></Card>
            </div>
            <Card>
                <CardHeader><CardTitle>カテゴリ別 支出予実</CardTitle><CardDescription>設定された予算と実際の支出を比較します。</CardDescription></CardHeader>
                <CardContent className="space-y-4">{loading ? <p>取引データを読み込み中...</p> : budgetSummary && budgetSummary.expenseDetails.length > 0 ? ( budgetSummary.expenseDetails.map(item => ( <BudgetItem key={item.name} label={item.name} budget={item.budget} actual={item.actual} /> )) ) : <p>表示する予算または取引データがありません。</p>}</CardContent>
            </Card>
        </div>
    );
}