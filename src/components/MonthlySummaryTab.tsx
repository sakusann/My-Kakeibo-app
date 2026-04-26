// src/components/MonthlySummaryTab.tsx

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPaydayCycle, formatCycle } from '../lib/dateUtils';
import { Transaction, FirestoreTransaction, PaydayCycle, RecurringPayment, AnnualData } from '../types';
import { DayPicker, DateFormatter } from 'react-day-picker';
import { format, eachDayOfInterval, isSameDay, addDays, isWithinInterval, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../lib/formatUtils';
import { useIsDesktop } from '../hooks/useIsDesktop';
import BalanceTrendChart from './charts/BalanceTrendChart';

const INCOME_COLOR  = '#1E9E6B';
const EXPENSE_COLOR = '#E05535';
const BORDER        = '#EAECF0';

// DayContent: カレンダーの各セル — 変更なし
function DayContent(props: {
  date: Date;
  activeModifiers: Record<string, boolean>;
  transactions: Transaction[];
  recurringPayments: RecurringPayment[];
  annualDataForYear: AnnualData[string] | undefined;
  getCategoryName: (id: string) => string;
}) {
  const { date, activeModifiers, transactions, recurringPayments, annualDataForYear, getCategoryName } = props;
  if (activeModifiers.outside) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">{date.getDate()}</div>;
  }
  const dayTransactions = transactions.filter((t: Transaction) => isSameDay(parseISO(t.date), date));
  const dayRecurringPayments = recurringPayments.filter((rp: RecurringPayment) => {
    const calendarMonth = date.getMonth() + 1;
    const calendarYear  = date.getFullYear();
    if (rp.isSystemGenerated) {
      if (!rp.id.includes(calendarYear.toString())) return false;
      const budget = annualDataForYear?.budget;
      if (budget) {
        if (rp.title.includes('夏季賞与') && !budget.summerBonusMonths.includes(calendarMonth)) return false;
        if (rp.title.includes('冬季賞与') && !budget.winterBonusMonths.includes(calendarMonth)) return false;
      }
    }
    return isSameDay(new Date(calendarYear, calendarMonth - 1, rp.paymentDay), date);
  });
  return (
    <div className="flex flex-col h-full p-1 text-xs text-left overflow-hidden">
      <div className={cn('font-semibold self-start', activeModifiers.today && 'font-bold text-white bg-primary rounded-full px-1.5 py-0.5 w-fit')}>{date.getDate()}</div>
      <div className="flex-grow overflow-y-auto space-y-1 text-xs mt-1">
        {dayRecurringPayments.map((rp: RecurringPayment) => (
          <div key={`rp-${rp.id}`} className={rp.type === 'income' ? 'text-green-600' : 'text-orange-600'} title={`[定期] ${rp.title}: ${formatCurrency(rp.amount)}`}>
            <p className="truncate font-medium">{getCategoryName(rp.categoryId)}</p>
            <p className="font-semibold text-right">{rp.type === 'income' ? '+' : '-'}{formatCurrency(rp.amount)}</p>
          </div>
        ))}
        {dayTransactions.map((t: Transaction) => (
          <div key={t.id} className={t.type === 'income' ? 'text-green-600' : 'text-destructive'} title={`${t.description}: ${formatCurrency(t.amount)}`}>
            <p className="truncate font-medium">{getCategoryName(t.category)}</p>
            <p className="font-semibold text-right">{formatCurrency(t.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const formatCaption: DateFormatter = (date, options) =>
  format(date, 'yyyy年 M月', { locale: options?.locale });

export default function MonthlySummaryTab() {
  const { currentUser } = useAuthContext();
  const { settings, annualData, recurringPayments, getCategoryName } = useAppContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const isDesktop = useIsDesktop();

  const cycle = useMemo<PaydayCycle | null>(() => {
    if (!settings || !settings.paydaySettings) return null;
    return getPaydayCycle(currentDate, settings.paydaySettings);
  }, [currentDate, settings]);

  const handlePrevCycle = useCallback(() => { if (cycle) setCurrentDate(addDays(cycle.start, -2)); }, [cycle]);
  const handleNextCycle = useCallback(() => { if (cycle) setCurrentDate(addDays(cycle.end, 2)); }, [cycle]);

  useEffect(() => {
    if (!currentUser || !cycle) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const fetchTransactions = async () => {
      try {
        const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
        const q = query(
          tCollection,
          where('date', '>=', Timestamp.fromDate(cycle.start)),
          where('date', '<=', Timestamp.fromDate(cycle.end)),
          orderBy('date', 'asc')
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setTransactions(snap.docs.map(doc => {
          const data = doc.data() as FirestoreTransaction;
          const dateObj = data.date && typeof data.date.toDate === 'function'
            ? data.date.toDate() : new Date(data.date as any);
          return { ...data, id: doc.id, date: dateObj.toISOString().split('T')[0] };
        }));
      } catch (error) {
        if (!cancelled) { console.error('取引データの取得エラー:', error); setTransactions([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTransactions();
    return () => { cancelled = true; };
  }, [currentUser, cycle]);

  const balanceChartData = useMemo(() => {
    if (!cycle || !annualData || !settings || !settings.paydaySettings) return [];
    const year = cycle.start.getFullYear().toString();
    const yearData = annualData[year];
    if (!yearData) return [];
    const startingBalance = yearData.budget.startingBalance;
    const days = eachDayOfInterval({ start: cycle.start, end: cycle.end });
    let currentBalance = startingBalance;
    return days.map(day => {
      const calendarMonth = day.getMonth() + 1;
      const calendarYear  = day.getFullYear();
      const txNet = transactions
        .filter(t => isSameDay(parseISO(t.date), day))
        .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
      const recurringNet = recurringPayments
        .filter(rp => {
          if (rp.isSystemGenerated) {
            if (!rp.id.includes(calendarYear.toString())) return false;
            if (yearData.budget) {
              if (rp.title.includes('夏季賞与') && !yearData.budget.summerBonusMonths.includes(calendarMonth)) return false;
              if (rp.title.includes('冬季賞与') && !yearData.budget.winterBonusMonths.includes(calendarMonth)) return false;
            }
          }
          return isSameDay(new Date(calendarYear, calendarMonth - 1, rp.paymentDay), day);
        })
        .reduce((acc, rp) => acc + (rp.type === 'income' ? rp.amount : -rp.amount), 0);
      currentBalance += txNet + recurringNet;
      return { date: format(day, 'M/d'), balance: currentBalance };
    });
  }, [cycle, transactions, annualData, settings, recurringPayments]);

  const cycleSummary = useMemo(() => {
    const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [transactions]);

  if (!settings || !cycle) return <p>設定を読み込んでいます...</p>;

  const annualDataForYear = annualData?.[cycle.start.getFullYear().toString()];

  const cycleNav = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
      <Button variant="outline" size="icon" onClick={handlePrevCycle}><ChevronLeft className="h-4 w-4" /></Button>
      <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCycle(cycle)}</span>
      <Button variant="outline" size="icon" onClick={handleNextCycle}><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );

  const calendarCard = (
    <Card>
      <CardContent className="p-2">
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
          modifiers={{ outside: date => !isWithinInterval(date, { start: cycle.start, end: cycle.end }) }}
          classNames={{
            root: 'w-full',
            months: 'flex flex-col gap-8',
            month: 'space-y-4',
            caption_label: 'text-lg font-medium',
            nav_button: 'hidden',
            table: 'w-full border-collapse',
            head: 'w-full',
            head_row: 'grid grid-cols-7',
            head_cell: 'text-muted-foreground text-center font-normal text-sm p-2',
            tbody: 'rdp-tbody',
            row: 'rdp-row',
            cell: 'border rounded-md min-h-[6rem] p-0 m-0',
            day: 'w-full h-full',
          }}
          components={{
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
  );

  const chartAndSummary = (
    <Card>
      <CardHeader style={{ paddingBottom: 8 }}>
        <CardTitle style={{ fontSize: 14, fontWeight: 700 }}>残高推移</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p style={{ color: '#A0A7B4', fontSize: 13 }}>読み込み中...</p>
        ) : (
          <BalanceTrendChart data={balanceChartData} height={220} />
        )}

        {/* サイクル内収支サマリー */}
        <div style={{ background: '#F7F6F3', borderRadius: 10, padding: 14, marginTop: 16, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#A0A7B4', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 2 }}>収入</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: INCOME_COLOR }}>{formatCurrency(cycleSummary.income)}</div>
          </div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#A0A7B4', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 2 }}>支出</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: EXPENSE_COLOR }}>{formatCurrency(cycleSummary.expense)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /* ── Desktop: 2カラム（カレンダー | チャート+サマリー） ── */
  if (isDesktop) {
    return (
      <div>
        {cycleNav}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
          {calendarCard}
          {chartAndSummary}
        </div>
      </div>
    );
  }

  /* ── Mobile: Tabs（カレンダー | 残高推移）── */
  return (
    <div>
      {cycleNav}
      <Tabs defaultValue="calendar">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar">カレンダー</TabsTrigger>
          <TabsTrigger value="chart">残高推移</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">{calendarCard}</TabsContent>
        <TabsContent value="chart">{chartAndSummary}</TabsContent>
      </Tabs>
    </div>
  );
}
