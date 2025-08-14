// src/components/DashboardTab.tsx

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPaydayCycle, formatCycle } from '../lib/dateUtils'; // getPaydayCycleを直接インポート
import { Transaction, FirestoreTransaction, PaydayCycle } from '../types';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import { addDays } from 'date-fns';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};

export default function DashboardTab() {
    const { currentUser } = useAuthContext();
    const { settings, annualData } = useAppContext();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // ★★★ここからが修正の核心です★★★
    // 1. 日付の状態をコンポーネント内で直接管理する
    const [currentDate, setCurrentDate] = useState(new Date());

    // 2. 現在の日付に基づいて、給料日サイクルをuseMemoで計算する
    const cycle = useMemo<PaydayCycle | null>(() => {
        if (!settings) return null;
        return getPaydayCycle(currentDate, settings.paydaySettings);
    }, [currentDate, settings]);

    // 3. 矢印ボタンが直接日付の状態を更新するハンドラ関数
    const handlePrevCycle = useCallback(() => {
        if (cycle) {
            setCurrentDate(addDays(cycle.start, -2));
        }
    }, [cycle]);

    const handleNextCycle = useCallback(() => {
        if (cycle) {
            setCurrentDate(addDays(cycle.end, 2));
        }
    }, [cycle]);
    // ★★★ここまでが修正の核心です★★★

    useEffect(() => {
        if (!currentUser || !cycle) {
            setLoading(false);
            return;
        };
        setLoading(true);
        const fetchTransactions = async () => {
            try {
                const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
                const q = query(tCollection, 
                    where('date', '>=', Timestamp.fromDate(cycle.start)),
                    where('date', '<=', Timestamp.fromDate(cycle.end))
                );
                const querySnapshot = await getDocs(q);
                const fetchedTransactions = querySnapshot.docs.map(doc => {
                    const data = doc.data() as FirestoreTransaction;
                    const dateObject = data.date && typeof data.date.toDate === 'function'
                        ? data.date.toDate()
                        : new Date(data.date as any);
                    return {
                        ...data,
                        id: doc.id,
                        date: dateObject.toISOString().split('T')[0],
                    };
                });
                setTransactions(fetchedTransactions);
            } catch (error) {
                console.error("Error fetching transactions:", error);
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [currentUser, cycle]);

    const summary = useMemo(() => {
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { totalIncome, totalExpense, net: totalIncome - totalExpense };
    }, [transactions]);

    const budgetData = useMemo(() => {
        if (!settings || !annualData || !cycle) return [];

        const currentYear = cycle.start.getFullYear().toString();
        const currentMonth = cycle.start.getMonth() + 1;
        
        const yearData = annualData[currentYear];
        // ★★★ 年間データや予算が存在しない場合に早期リターンするガード節を強化 ★★★
        if (!yearData || !yearData.budget) {
            console.warn(`年間データが見つかりません: ${currentYear}年`);
            return [];
        }

        const isBonusMonth = settings.summerBonusMonths.includes(currentMonth) || settings.winterBonusMonths.includes(currentMonth);
        const currentBudgetById = isBonusMonth ? yearData.budget.bonusMonthBudget : yearData.budget.normalMonthBudget;
        
        return settings.expenseCategories.map(cat => {
            const budget = currentBudgetById[cat.id] || 0;
            const actual = transactions
                .filter(t => t.type === 'expense' && t.category === cat.id)
                .reduce((sum, t) => sum + t.amount, 0);
            return {
                name: cat.name,
                予算: budget,
                実績: actual,
                残り: budget - actual,
            };
        }).filter(d => d.予算 > 0 || d.実績 > 0);
    }, [settings, annualData, transactions, cycle]);

    if (!settings) {
        return <p>設定を読み込んでいます...</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
                {/* ★★★ ハンドラ関数をボタンに紐付け ★★★ */}
                <Button variant="outline" size="icon" onClick={handlePrevCycle}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-xl font-semibold whitespace-nowrap">{cycle ? formatCycle(cycle) : '日付を計算中...'}</h2>
                <Button variant="outline" size="icon" onClick={handleNextCycle}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardHeader><CardTitle>収入</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>支出</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpense)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>収支</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(summary.net)}</p></CardContent></Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle>カテゴリ別 予実</CardTitle></CardHeader>
                <CardContent>
                    {loading ? <p>取引データを読み込み中...</p> : budgetData.length > 0 ? (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%"><BarChart data={budgetData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}><XAxis dataKey="name" /><YAxis tickFormatter={(value) => `¥${value/1000}k`} /><Tooltip formatter={(value:number) => formatCurrency(value)} /><Legend /><Bar dataKey="予算" fill="#8884d8" /><Bar dataKey="実績" fill="#82ca9d" /></BarChart></ResponsiveContainer>
                        </div>
                    ) : <p>表示する予算または取引データがありません。年間設定で予算が登録されているか確認してください。</p>}
                </CardContent>
            </Card>
        </div>
    );
}