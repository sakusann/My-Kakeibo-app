// src/components/MonthlySummaryTab.tsx

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPaydayCycle, formatCycle, getCyclesForYear } from '../lib/dateUtils';
import { Transaction, FirestoreTransaction, PaydayCycle } from '../types';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line, Legend } from 'recharts';
import { Calendar } from './ui/calendar';
import { format, eachDayOfInterval, isSameDay, addDays } from 'date-fns';
// ★★★ここからが修正箇所です★★★
import { ja } from 'date-fns/locale'; // 日本語ロケールをインポート
// ★★★ここまでが修正箇所です★★★

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};

export default function MonthlySummaryTab() {
    const { currentUser } = useAuthContext();
    const { settings, annualData, recurringPayments } = useAppContext();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const [currentDate, setCurrentDate] = useState(new Date());

    const cycle = useMemo<PaydayCycle | null>(() => {
        if (!settings) return null;
        return getPaydayCycle(currentDate, settings.paydaySettings);
    }, [currentDate, settings]);
    
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
    
    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setCurrentDate(date);
        }
    }

    useEffect(() => {
        if (!currentUser || !cycle) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const fetchTransactions = async () => {
            const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
            const q = query(tCollection, 
                where('date', '>=', Timestamp.fromDate(cycle.start)),
                where('date', '<=', Timestamp.fromDate(cycle.end)),
                orderBy('date', 'asc')
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
            setLoading(false);
        };
        fetchTransactions();
    }, [currentUser, cycle]);

    const balanceChartData = useMemo(() => {
        if (!cycle || !annualData || !settings) return [];
        const year = cycle.start.getFullYear().toString();
        const yearData = annualData[year];
        if (!yearData) return [];
        
        const cyclesInYear = getCyclesForYear(parseInt(year, 10), settings.paydaySettings);
        const cycleIndex = cyclesInYear.findIndex(c => isSameDay(c.start, cycle.start));
        
        let startingBalance = yearData.budget.startingBalance;
        if (cycleIndex > 0) {
             const prevMonthIndex = cycle.start.getMonth() === 0 ? 11 : cycle.start.getMonth() - 1;
             startingBalance = yearData.budget.plannedBalance[prevMonthIndex] ?? yearData.budget.startingBalance;
        }

        const days = eachDayOfInterval({ start: cycle.start, end: cycle.end });
        let currentBalance = startingBalance;
        
        return days.map(day => {
            const dailyNet = transactions
                .filter(t => isSameDay(new Date(t.date), day))
                .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
            currentBalance += dailyNet;
            return {
                date: format(day, 'd'),
                残高: currentBalance
            };
        });
    }, [cycle, transactions, annualData, settings]);
    
    const dailySummaries = useMemo(() => {
        const summaryMap = new Map<string, { income: number, expense: number }>();
        transactions.forEach(t => {
            const day = t.date;
            const existing = summaryMap.get(day) || { income: 0, expense: 0 };
            if (t.type === 'income') existing.income += t.amount;
            else existing.expense += t.amount;
            summaryMap.set(day, existing);
        });
        return summaryMap;
    }, [transactions]);
    
    const calendarModifiers = useMemo(() => {
        const mods: Record<string, any> = {};
        
        recurringPayments.forEach(rp => {
            const paymentDateInCycle = new Date(cycle.start.getFullYear(), cycle.start.getMonth(), rp.paymentDay);
            if(paymentDateInCycle < cycle.start) {
                paymentDateInCycle.setMonth(paymentDateInCycle.getMonth() + 1);
            }
            if (paymentDateInCycle >= cycle.start && paymentDateInCycle <= cycle.end) {
                mods[format(paymentDateInCycle, 'yyyy-MM-dd')] = { recurring: true };
            }
        });
        
        dailySummaries.forEach((summary, dateStr) => {
            mods[dateStr] = { ...mods[dateStr], income: summary.income > 0, expense: summary.expense > 0 };
        });

        return mods;
    }, [dailySummaries, recurringPayments, cycle]);

    if (!settings || !cycle) {
        return <p>設定を読み込んでいます...</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={handlePrevCycle}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-xl font-semibold whitespace-nowrap">{formatCycle(cycle)}</h2>
                <Button variant="outline" size="icon" onClick={handleNextCycle}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>残高推移</CardTitle></CardHeader>
                    <CardContent className="h-80">
                         <ResponsiveContainer width="100%" height="100%"><LineChart data={balanceChartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}><XAxis dataKey="date" /><YAxis tickFormatter={(value) => `¥${value/1000}k`} domain={['dataMin', 'dataMax']}/><Tooltip formatter={(value:number) => formatCurrency(value)} /><Legend /><Line type="monotone" dataKey="残高" stroke="#8884d8" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>カレンダー</CardTitle></CardHeader>
                    <CardContent className="flex justify-center">
                       {/* ★★★ここからが修正箇所です★★★ */}
                       <Calendar
                            locale={ja}
                            weekStartsOn={0}
                            month={currentDate}
                            onMonthChange={setCurrentDate}
                            onDayClick={handleDateSelect}
                            selected={currentDate}
                            modifiers={calendarModifiers}
                            modifiersClassNames={{
                                recurring: 'bg-yellow-200 dark:bg-yellow-800 rounded-full',
                                income: 'border-2 border-green-500 rounded-full',
                                expense: 'border-2 border-red-500 rounded-full',
                            }}
                        />
                       {/* ★★★ここまでが修正箇所です★★★ */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}