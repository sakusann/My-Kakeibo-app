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
import { formatCurrency } from '../lib/formatUtils';
import { useIsDesktop } from '../hooks/useIsDesktop';
import AnnualBalanceChart from './charts/AnnualBalanceChart';

const INCOME_COLOR       = '#1E9E6B';
const EXPENSE_COLOR      = '#E05535';
const INCOME_LIGHT       = '#EDFAF3';
const EXPENSE_LIGHT      = '#FEF2EF';
const BORDER             = '#EAECF0';
const MUTED              = '#A0A7B4';

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

export default function AnnualSummaryTab() {
  const { currentUser } = useAuthContext();
  const { annualData } = useAppContext();
  const [year, setYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setLoading(true);
    const fetchTransactions = async () => {
      try {
        const startOfYear = Timestamp.fromDate(new Date(year, 0, 1));
        const endOfYear   = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59));
        const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
        const q = query(tCollection, where('date', '>=', startOfYear), where('date', '<=', endOfYear), orderBy('date', 'asc'));
        const snap = await getDocs(q);
        if (cancelled) return;
        setTransactions(snap.docs.map(doc => {
          const data = doc.data() as FirestoreTransaction;
          const dateObj = data.date && typeof data.date.toDate === 'function'
            ? data.date.toDate() : new Date(data.date as any);
          return { ...data, id: doc.id, date: dateObj.toISOString().split('T')[0] };
        }));
      } catch (error) {
        if (!cancelled) { console.error('年間取引データの取得エラー:', error); setTransactions([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTransactions();
    return () => { cancelled = true; };
  }, [currentUser, year]);

  // 月別収支データ（テーブル用）
  const monthlyData = useMemo(() =>
    MONTH_LABELS.map((label, i) => {
      const monthTxns = transactions.filter(t => new Date(t.date).getMonth() === i);
      const income  = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { label, income, expense };
    }),
  [transactions]);

  // 計画 vs 実績チャートデータ
  const chartData = useMemo(() => {
    const yearData = annualData?.[year.toString()];
    if (!yearData) return [];
    let actualBalance = yearData.budget.startingBalance;
    return MONTH_LABELS.map((label, i) => {
      const monthlyNet = transactions
        .filter(t => new Date(t.date).getMonth() === i)
        .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
      actualBalance += monthlyNet;
      return { month: label, planned: yearData.budget.plannedBalance[i] || 0, actual: actualBalance };
    });
  }, [annualData, year, transactions]);

  // 累計サマリー（データがある月まで）
  const cumulative = useMemo(() => {
    const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const latestMonth  = Math.max(...transactions.map(t => new Date(t.date).getMonth() + 1), 0);
    return { totalIncome, totalExpense, latestMonth };
  }, [transactions]);

  const periodLabel = cumulative.latestMonth > 0 ? `1〜${cumulative.latestMonth}月` : `${year}年`;

  const yearNav = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
      <Button variant="outline" size="icon" onClick={() => setYear(y => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
      <span style={{ fontSize: 17, fontWeight: 700 }}>{year}年 サマリー</span>
      <Button variant="outline" size="icon" onClick={() => setYear(y => y + 1)}><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );

  // 累計カード2枚（常時表示）
  const summaryCards = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
      <div style={{ background: INCOME_LIGHT, borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: INCOME_COLOR, letterSpacing: '0.05em', marginBottom: 4 }}>累計収入（{periodLabel}）</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: INCOME_COLOR, letterSpacing: '-0.02em' }}>{formatCurrency(cumulative.totalIncome)}</div>
      </div>
      <div style={{ background: EXPENSE_LIGHT, borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: EXPENSE_COLOR, letterSpacing: '0.05em', marginBottom: 4 }}>累計支出（{periodLabel}）</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: EXPENSE_COLOR, letterSpacing: '-0.02em' }}>{formatCurrency(cumulative.totalExpense)}</div>
      </div>
    </div>
  );

  // 計画vs実績チャートカード
  const chartCard = (
    <Card>
      <CardHeader style={{ paddingBottom: 8 }}>
        <CardTitle style={{ fontSize: 14, fontWeight: 700 }}>計画 vs 実績残高</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p style={{ color: MUTED, fontSize: 13 }}>読み込み中...</p>
        ) : chartData.length > 0 ? (
          <AnnualBalanceChart data={chartData} height={280} />
        ) : (
          <p style={{ color: MUTED, fontSize: 13 }}>{year}年のデータがありません。設定画面から年間設定を行ってください。</p>
        )}
      </CardContent>
    </Card>
  );

  // 月別実績テーブルカード
  const tableCard = (
    <Card>
      <CardHeader style={{ paddingBottom: 8 }}>
        <CardTitle style={{ fontSize: 14, fontWeight: 700 }}>月別実績</CardTitle>
      </CardHeader>
      <CardContent style={{ padding: '0 0 8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['月', '収入', '支出'].map(h => (
                <th key={h} style={{ padding: '8px 16px', textAlign: h === '月' ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlyData.map(({ label, income, expense }, i) => {
              const hasData = income > 0 || expense > 0;
              return (
                <tr
                  key={label}
                  style={{
                    borderBottom: i < 11 ? `1px solid ${BORDER}` : 'none',
                    opacity: hasData ? 1 : 0.4,
                  }}
                >
                  <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 500 }}>{label}</td>
                  <td style={{ padding: '9px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: hasData ? INCOME_COLOR : MUTED }}>
                    {income > 0 ? formatCurrency(income) : '—'}
                  </td>
                  <td style={{ padding: '9px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: hasData ? EXPENSE_COLOR : MUTED }}>
                    {expense > 0 ? formatCurrency(expense) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  return (
    <div>
      {yearNav}
      {summaryCards}

      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
          {chartCard}
          {tableCard}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {chartCard}
          {tableCard}
        </div>
      )}
    </div>
  );
}
