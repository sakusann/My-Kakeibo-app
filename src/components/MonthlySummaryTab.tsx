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
import { Transaction, FirestoreTransaction, PaydayCycle, RecurringPayment, AnnualData } from '../types';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line, Legend } from 'recharts';
import { DayPicker, DayContent as DayContentPrimitive, DateFormatter } from "react-day-picker";
import { format, eachDayOfInterval, isSameDay, addDays, isWithinInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
};

// ★★★ここからが修正の核心です★★★
// DayContentコンポーネントを、propsを明示的に受け取るように修正
function DayContent(props: {
    date: Date;
    activeModifiers: Record<string, boolean>;
    transactions: Transaction[];
    recurringPayments: RecurringPayment[];
    annualDataForYear: AnnualData[string] | undefined;
    getCategoryName: (id: string) => string;
}) {
    const { date, activeModifiers, transactions, recurringPayments, annualDataForYear, getCategoryName } = props;

    // サイクル期間外（グレーアウトされた日）の処理
    if (activeModifiers.outside) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">{date.getDate()}</div>;
    }

    const dayTransactions = transactions.filter((t: Transaction) => isSameDay(new Date(t.date), date));
    const dayRecurringPayments = recurringPayments.filter((rp: RecurringPayment) => {
        const calendarMonth = date.getMonth() + 1;
        const calendarYear = date.getFullYear();
        if (rp.isSystemGenerated) {
            if (!rp.id.includes(calendarYear.toString())) return false;
            const budget = annualDataForYear?.budget;
            if (budget) {
                if (rp.title.includes('夏季賞与') && !budget.summerBonusMonths.includes(calendarMonth)) return false;
                if (rp.title.includes('冬季賞与') && !budget.winterBonusMonths.includes(calendarMonth)) return false;
            }
        }
        const paymentDate = new Date(calendarYear, calendarMonth - 1, rp.paymentDay);
        return isSameDay(paymentDate, date);
    });

    return (
        <div className="flex flex-col h-full p-1 text-xs text-left overflow-hidden">
            <div className={cn("font-semibold self-start", activeModifiers.today && "font-bold text-white bg-primary rounded-full px-1.5 py-0.5 w-fit")}>{date.getDate()}</div>
            <div className="flex-grow overflow-y-auto space-y-1 text-xs mt-1">
                {dayRecurringPayments.map((rp: RecurringPayment) => (
                    <div key={`rp-${rp.id}`} className="text-yellow-700 dark:text-yellow-400" title={`${rp.title}: ${formatCurrency(rp.amount)}`}>
                        <p className="truncate font-medium">{getCategoryName(rp.categoryId)}</p>
                        <p className="font-semibold text-right">{formatCurrency(rp.amount)}</p>
                    </div>
                ))}
                {dayTransactions.map((t: Transaction) => (
                    <div key={t.id} className={`${t.type === 'income' ? 'text-green-600' : 'text-destructive'}`} title={`${t.description}: ${formatCurrency(t.amount)}`}>
                        <p className="truncate font-medium">{getCategoryName(t.category)}</p>
                        <p className="font-semibold text-right">{formatCurrency(t.amount)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

const formatCaption: DateFormatter = (date, options) => {
    return format(date, 'yyyy年 M月', { locale: options?.locale });
};

export default function MonthlySummaryTab() {
    const { currentUser } = useAuthContext();
    const { settings, annualData, recurringPayments, getCategoryName } = useAppContext();
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
        if (!currentUser || !cycle) { setLoading(false); return; }
        setLoading(true);
        const fetchTransactions = async () => {
            const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
            const q = query(tCollection, where('date', '>=', Timestamp.fromDate(cycle.start)), where('date', '<=', Timestamp.fromDate(cycle.end)), orderBy('date', 'asc'));
            const querySnapshot = await getDocs(q);
            const fetchedTransactions = querySnapshot.docs.map(doc => {
                const data = doc.data() as FirestoreTransaction;
                const dateObject = data.date && typeof data.date.toDate === 'function' ? data.date.toDate() : new Date(data.date as any);
                return { ...data, id: doc.id, date: dateObject.toISOString().split('T')[0], };
            });
            setTransactions(fetchedTransactions);
            setLoading(false);
        };
        fetchTransactions();
    }, [currentUser, cycle]);

    const balanceChartData = useMemo(() => {
        if (!cycle || !annualData || !settings || !settings.paydaySettings) return [];
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
            const dailyNet = transactions.filter(t => isSameDay(new Date(t.date), day)).reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
            currentBalance += dailyNet;
            return { date: format(day, 'd'), 残高: currentBalance };
        });
    }, [cycle, transactions, annualData, settings]);
    
    if (!settings || !cycle) { return <p>設定を読み込んでいます...</p>; }

    const annualDataForYear = annualData?.[cycle.start.getFullYear().toString()];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={handlePrevCycle}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-xl font-semibold whitespace-nowrap">{formatCycle(cycle)}</h2>
                <Button variant="outline" size="icon" onClick={handleNextCycle}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            
            <Tabs defaultValue="calendar">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="calendar">カレンダー</TabsTrigger>
                    <TabsTrigger value="chart">残高推移</TabsTrigger>
                </TabsList>
                <TabsContent value="calendar">
                    <Card>
                        <CardContent className="p-2">
                            {/* CSS Gridと`display: contents`を使った、堅牢なレイアウト */}
                            <style>{`
                                .rdp-tbody { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
                                .rdp-row { display: contents; }
                            `}</style>
                            <DayPicker
                                locale={ja}
                                weekStartsOn={0}
                                numberOfMonths={2}
                                month={cycle.start}
                                fromMonth={cycle.start}
                                toMonth={cycle.end}
                                showOutsideDays
                                fixedWeeks
                                formatters={{ formatCaption }}
                                modifiers={{
                                    outside: date => !isWithinInterval(date, {start: cycle.start, end: cycle.end})
                                }}
                                classNames={{
                                    root: "w-full",
                                    months: "flex flex-col gap-8", // 縦並び
                                    month: "space-y-4",
                                    caption_label: "text-lg font-medium",
                                    nav_button: "hidden",
                                    table: "w-full border-collapse",
                                    head: "w-full",
                                    head_row: "grid grid-cols-7",
                                    head_cell: "text-muted-foreground text-center font-normal text-sm p-2",
                                    tbody: "rdp-tbody",
                                    row: "rdp-row",
                                    cell: "border rounded-md min-h-[6rem] p-0 m-0",
                                    day: "w-full h-full",
                                }}
                                components={{
                                    // DayPickerから渡されるpropsに、必要なデータを追加してDayContentに渡す
                                    DayContent: (props) => (
                                        <DayContent 
                                            {...props}
                                            transactions={transactions}
                                            recurringPayments={recurringPayments}
                                            annualDataForYear={annualDataForYear}
                                            getCategoryName={getCategoryName}
                                        />
                                    ),
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="chart">
                    <Card><CardHeader><CardTitle>残高推移</CardTitle></CardHeader><CardContent className="h-96"><ResponsiveContainer width="100%" height="100%"><LineChart data={balanceChartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}><XAxis dataKey="date" /><YAxis tickFormatter={(value) => `¥${value/1000}k`} domain={['dataMin', 'dataMax']}/><Tooltip formatter={(value:number) => formatCurrency(value)} /><Legend /><Line type="monotone" dataKey="残高" stroke="#8884d8" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></CardContent></Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}