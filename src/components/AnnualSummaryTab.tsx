// src/components/AnnualSummaryTab.tsx

import React, { useMemo, useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction, FirestoreTransaction } from '../types';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line, Legend } from 'recharts';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};

export default function AnnualSummaryTab() {
    const { currentUser } = useAuthContext();
    const { annualData } = useAppContext();
    const [year, setYear] = useState(new Date().getFullYear());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);
        const fetchTransactions = async () => {
            const startOfYear = Timestamp.fromDate(new Date(year, 0, 1));
            const endOfYear = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59));
            
            const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
            const q = query(tCollection, 
                where('date', '>=', startOfYear),
                where('date', '<=', endOfYear),
                orderBy('date', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const fetchedTransactions = querySnapshot.docs.map(doc => {
                const data = doc.data() as FirestoreTransaction;
                // ★★★ここからが修正箇所です★★★
                const dateObject = data.date && typeof data.date.toDate === 'function'
                    ? data.date.toDate()
                    : new Date(data.date as any);
                // ★★★ここまでが修正箇所です★★★
                return {
                    ...data,
                    id: doc.id,
                    date: dateObject.toISOString().split('T')[0],
                };
            });
            setTransactions(fetchedTransactions);
            setLoading(false);
        };
        fetchTransactions();
    }, [currentUser, year]);

    const chartData = useMemo(() => {
        const yearData = annualData?.[year.toString()];
        if (!yearData) return [];

        let actualBalance = yearData.budget.startingBalance;
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const monthlyNet = transactions
                .filter(t => new Date(t.date).getMonth() === i)
                .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
            
            actualBalance += monthlyNet;
            
            return {
                month: `${month}月`,
                計画残高: yearData.budget.plannedBalance[i] || 0,
                実績残高: actualBalance,
            };
        });
        
        return monthlyData;
    }, [annualData, year, transactions]);

    const goToNextYear = () => setYear(y => y + 1);
    const goToPreviousYear = () => setYear(y => y - 1);

    return (
        <Card>
            <CardHeader>
                 <div className="flex items-center justify-center gap-4">
                    <Button variant="outline" size="icon" onClick={goToPreviousYear}><ChevronLeft className="h-4 w-4" /></Button>
                    <CardTitle className="text-xl font-semibold whitespace-nowrap">{year}年 サマリー</CardTitle>
                    <Button variant="outline" size="icon" onClick={goToNextYear}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </CardHeader>
            <CardContent className="h-96">
                {loading ? <p>読込中...</p> : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => `¥${value / 10000}万`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="計画残高" stroke="#8884d8" strokeDasharray="5 5" />
                            <Line type="monotone" dataKey="実績残高" stroke="#82ca9d" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <p>{year}年のデータがありません。設定画面から年間設定を行ってください。</p>
                )}
            </CardContent>
        </Card>
    );
}