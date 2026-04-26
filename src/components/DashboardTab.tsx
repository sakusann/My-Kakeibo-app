// src/components/DashboardTab.tsx

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPaydayCycle, formatCycle } from '../lib/dateUtils';
import { Transaction, FirestoreTransaction, PaydayCycle } from '../types';
import { Progress } from "@/components/ui/progress";
import { addDays, isWithinInterval, format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { formatCurrency } from '../lib/formatUtils';
import { useIsDesktop } from '../hooks/useIsDesktop';

const PRIMARY = '#3347B0';
const INCOME_COLOR = '#1E9E6B';
const EXPENSE_COLOR = '#E05535';
const INCOME_LIGHT = '#EDFAF3';
const EXPENSE_LIGHT = '#FEF2EF';

const CATEGORY_EMOJI: Record<string, string> = {
  cat_food: '🍱', cat_housing: '🏠', cat_utilities: '💡',
  cat_transport: '🚃', cat_comm: '📱', cat_ent: '🎬',
  cat_medical: '💊', cat_other: '📦',
  cat_salary: '💴', cat_bonus: '🎁',
};
const getCatEmoji = (id: string) => CATEGORY_EMOJI[id] ?? '📦';

const BudgetItem = ({ label, budget, actual }: { label: string; budget: number; actual: number }) => {
  const remaining = budget - actual;
  const progress = budget > 0 ? (actual / budget) * 100 : 0;
  const isOverBudget = remaining < 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: isOverBudget ? EXPENSE_COLOR : undefined }}>
          {isOverBudget ? `${formatCurrency(Math.abs(remaining))} 超過` : `残り ${formatCurrency(remaining)}`}
        </span>
      </div>
      <Progress
        value={progress}
        style={{ height: 6 }}
        indicatorClassName={isOverBudget ? 'bg-destructive' : 'bg-primary'}
      />
      <div className="flex justify-between items-baseline text-xs text-muted-foreground">
        <span>{formatCurrency(actual)}</span>
        <span>{formatCurrency(budget)}</span>
      </div>
    </div>
  );
};

interface DashboardTabProps {
  onNavigateToTransactions?: () => void;
}

export default function DashboardTab({ onNavigateToTransactions }: DashboardTabProps) {
  const { currentUser } = useAuthContext();
  const { settings, annualData, recurringPayments } = useAppContext();
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
          where('date', '<=', Timestamp.fromDate(cycle.end))
        );
        const querySnapshot = await getDocs(q);
        if (cancelled) return;
        const fetched = querySnapshot.docs.map(doc => {
          const data = doc.data() as FirestoreTransaction;
          const dateObj = data.date && typeof data.date.toDate === 'function'
            ? data.date.toDate() : new Date(data.date as any);
          return { ...data, id: doc.id, date: dateObj.toISOString().split('T')[0] };
        });
        setTransactions(fetched);
      } catch (error) {
        if (!cancelled) { console.error('Error fetching transactions:', error); setTransactions([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTransactions();
    return () => { cancelled = true; };
  }, [currentUser, cycle]);

  const cycleRecurring = useMemo(() => {
    if (!cycle) return [];
    return recurringPayments.filter(rp => {
      if (rp.isSystemGenerated) return false;
      let y = cycle.start.getFullYear();
      let m = cycle.start.getMonth();
      const ey = cycle.end.getFullYear();
      const em = cycle.end.getMonth();
      while (y < ey || (y === ey && m <= em)) {
        if (isWithinInterval(new Date(y, m, rp.paymentDay), { start: cycle.start, end: cycle.end })) return true;
        m++;
        if (m > 11) { m = 0; y++; }
      }
      return false;
    });
  }, [cycle, recurringPayments]);

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

    let plannedIncome = yearData.budget.monthlyIncome;
    yearData.budget.summerBonusMonths.forEach(month => {
      const bonusDate = new Date(currentYear, month - 1, yearData.budget.summerBonusPayday);
      if (isWithinInterval(bonusDate, { start: cycle.start, end: cycle.end })) plannedIncome += yearData.budget.summerBonus;
    });
    yearData.budget.winterBonusMonths.forEach(month => {
      const bonusDate = new Date(currentYear, month - 1, yearData.budget.winterBonusPayday);
      if (isWithinInterval(bonusDate, { start: cycle.start, end: cycle.end })) plannedIncome += yearData.budget.winterBonus;
    });

    const isBonusCycle =
      yearData.budget.summerBonusMonths.some(m => isWithinInterval(new Date(currentYear, m - 1, yearData.budget.summerBonusPayday), { start: cycle.start, end: cycle.end })) ||
      yearData.budget.winterBonusMonths.some(m => isWithinInterval(new Date(currentYear, m - 1, yearData.budget.winterBonusPayday), { start: cycle.start, end: cycle.end }));

    const budgetById = isBonusCycle ? yearData.budget.bonusMonthBudget : yearData.budget.normalMonthBudget;
    const cycleRecurringExpense = cycleRecurring.filter(rp => rp.type === 'expense');
    const cycleRecurringIncome = cycleRecurring.filter(rp => rp.type === 'income');
    plannedIncome += cycleRecurringIncome.reduce((sum, rp) => sum + rp.amount, 0);

    const recurringExpenseByCategory: Record<string, number> = {};
    cycleRecurringExpense.forEach(rp => {
      recurringExpenseByCategory[rp.categoryId] = (recurringExpenseByCategory[rp.categoryId] || 0) + rp.amount;
    });
    const plannedExpense =
      Object.values(budgetById).reduce((sum, val) => sum + val, 0) +
      cycleRecurringExpense.reduce((sum, rp) => sum + rp.amount, 0);

    const expenseDetails = settings.expenseCategories.map(cat => {
      const budget = (budgetById[cat.id] || 0) + (recurringExpenseByCategory[cat.id] || 0);
      const actual = transactions.filter(t => t.type === 'expense' && t.category === cat.id).reduce((sum, t) => sum + t.amount, 0);
      return { name: cat.name, budget, actual };
    }).filter(d => d.budget > 0 || d.actual > 0);

    return { plannedIncome, actualIncome: summary.totalIncome, plannedExpense, actualExpense: summary.totalExpense, expenseDetails };
  }, [settings, annualData, cycle, transactions, summary, cycleRecurring]);

  const recentTransactions = useMemo(() =>
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [transactions]
  );

  if (!settings || !cycle) return <p>設定を読み込んでいます...</p>;

  const { totalIncome, totalExpense, net } = summary;
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  const heroCard = (
    <div style={{
      background: `linear-gradient(140deg, ${PRIMARY} 0%, ${PRIMARY}C0 100%)`,
      borderRadius: 18,
      padding: '24px 24px 22px',
      color: '#fff',
      boxShadow: `0 10px 36px ${PRIMARY}44`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, opacity: 0.72 }}>{formatCycle(cycle)}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handlePrevCycle} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={handleNextCycle} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
        {net >= 0 ? '+' : ''}{formatCurrency(net)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: '収入', value: formatCurrency(totalIncome) },
          { label: '支出', value: formatCurrency(totalExpense) },
          { label: '貯蓄率', value: `${savingsRate}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, opacity: 0.72, marginBottom: 4, letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const budgetCard = (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: 14, fontWeight: 700 }}>カテゴリ別予算</CardTitle>
        <CardDescription>設定された予算と実際の支出を比較します。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : budgetSummary && budgetSummary.expenseDetails.length > 0 ? (
          budgetSummary.expenseDetails.map(item => (
            <BudgetItem key={item.name} label={item.name} budget={item.budget} actual={item.actual} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">表示する予算または取引データがありません。</p>
        )}
      </CardContent>
    </Card>
  );

  const recentCard = (
    <Card>
      <CardHeader style={{ paddingBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CardTitle style={{ fontSize: 14, fontWeight: 700 }}>最近の取引</CardTitle>
          {onNavigateToTransactions && (
            <button
              onClick={onNavigateToTransactions}
              style={{ fontSize: 12, color: PRIMARY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              すべて見る →
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent style={{ paddingTop: 0 }}>
        {loading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : recentTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">取引がありません。</p>
        ) : (
          <div>
            {recentTransactions.map((txn, i) => {
              const isIncome = txn.type === 'income';
              const catName = settings.expenseCategories.find(c => c.id === txn.category)?.name
                ?? settings.incomeCategories.find(c => c.id === txn.category)?.name
                ?? txn.category;
              const dateLabel = (() => {
                try { return format(parseISO(txn.date), 'M/d', { locale: ja }); } catch { return txn.date; }
              })();
              return (
                <div
                  key={txn.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 0',
                    borderBottom: i < recentTransactions.length - 1 ? '1px solid #F3F4F6' : 'none',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                    background: isIncome ? INCOME_LIGHT : EXPENSE_LIGHT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    {getCatEmoji(txn.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, background: '#F3F4F6', color: '#6B7280', borderRadius: 6, padding: '1px 6px' }}>{catName}</span>
                      <span style={{ fontSize: 11, color: '#A0A7B4' }}>{dateLabel}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isIncome ? INCOME_COLOR : EXPENSE_COLOR, flexShrink: 0 }}>
                    {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isDesktop) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
        gridTemplateRows: 'auto 1fr',
        gridTemplateAreas: '"hero hero" "budget recent"',
        gap: 16,
      }}>
        <div style={{ gridArea: 'hero' }}>{heroCard}</div>
        <div style={{ gridArea: 'budget' }}>{budgetCard}</div>
        <div style={{ gridArea: 'recent' }}>{recentCard}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {heroCard}
      {budgetCard}
      {recentCard}
    </div>
  );
}
