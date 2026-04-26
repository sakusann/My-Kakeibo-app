// src/components/TransactionsTab.tsx

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import AddTransactionDialog from './AddTransactionDialog';
import { Transaction, FirestoreTransaction } from '../types';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';
import { useToast } from './ui/use-toast';
import { formatCurrency } from '../lib/formatUtils';

const INCOME_COLOR  = '#1E9E6B';
const EXPENSE_COLOR = '#E05535';
const INCOME_LIGHT  = '#EDFAF3';
const EXPENSE_LIGHT = '#FEF2EF';

const CATEGORY_EMOJI: Record<string, string> = {
  cat_food: '🍱', cat_housing: '🏠', cat_utilities: '💡',
  cat_transport: '🚃', cat_comm: '📱', cat_ent: '🎬',
  cat_medical: '💊', cat_other: '📦',
  cat_salary: '💴', cat_bonus: '🎁',
};
const getCatEmoji = (id: string) => CATEGORY_EMOJI[id] ?? '📦';

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'];
const dateLabelFull = (ds: string) => {
  const d = new Date(ds + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日（${DOW_JA[d.getDay()]}）`;
};

interface TransactionsTabProps {
  onEdit: (t: Transaction) => void;
}

export default function TransactionsTab({ onEdit }: TransactionsTabProps) {
  const { currentUser } = useAuthContext();
  const { settings, getCategoryName, deleteTransaction } = useAppContext();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
    const q = query(tCollection, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(doc => {
        const data = doc.data() as FirestoreTransaction;
        const dateObj = data.date && typeof data.date.toDate === 'function'
          ? data.date.toDate() : new Date(data.date as any);
        return { ...data, id: doc.id, date: dateObj.toISOString().split('T')[0] };
      });
      setTransactions(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleDelete = (t: Transaction) => { setSelectedTransaction(t); setIsAlertOpen(true); };
  const confirmDelete = async () => {
    if (!selectedTransaction) return;
    try {
      await deleteTransaction(selectedTransaction.id);
      toast({ title: '成功', description: '取引を削除しました。' });
    } catch {
      toast({ title: 'エラー', description: '削除に失敗しました。', variant: 'destructive' });
    } finally {
      setIsAlertOpen(false);
      setSelectedTransaction(null);
    }
  };

  // Date grouping
  const grouped = transactions.reduce((acc, t) => {
    (acc[t.date] = acc[t.date] || []).push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 14px rgba(0,0,0,.055)', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#A0A7B4', fontSize: 14 }}>読み込み中...</p>
        ) : transactions.length === 0 ? (
          <p style={{ padding: 24, color: '#A0A7B4', fontSize: 14 }}>取引履歴がありません。</p>
        ) : (
          dates.map((date) => {
            const group = grouped[date];
            const dayIncome  = group.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const dayExpense = group.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const dayNet = dayIncome - dayExpense;
            return (
              <div key={date}>
                {/* Date group header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px 6px',
                  background: '#F7F6F3',
                  borderBottom: '1px solid #EAECF0',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', letterSpacing: '0.02em' }}>
                    {dateLabelFull(date)}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: dayNet >= 0 ? INCOME_COLOR : EXPENSE_COLOR }}>
                    {dayNet >= 0 ? '+' : ''}{formatCurrency(dayNet)}
                  </span>
                </div>

                {/* Transactions in this date */}
                {group.map((txn, i) => {
                  const isIncome = txn.type === 'income';
                  const catName = getCategoryName(txn.category);
                  const tags = txn.tags ?? [];
                  return (
                    <div
                      key={txn.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 16px',
                        borderBottom: i < group.length - 1 ? '1px solid #F3F4F6' : 'none',
                        transition: 'background 0.1s',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                        background: isIncome ? INCOME_LIGHT : EXPENSE_LIGHT,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                      }}>
                        {getCatEmoji(txn.category)}
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {txn.description}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, background: '#F3F4F6', color: '#6B7280', borderRadius: 6, padding: '1px 7px' }}>
                            {catName}
                          </span>
                          {tags.map(tag => (
                            <span key={tag} style={{ fontSize: 11, fontWeight: 500, background: '#EEF2FF', color: '#3347B0', borderRadius: 6, padding: '1px 7px' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Amount */}
                      <div style={{ fontSize: 14, fontWeight: 700, color: isIncome ? INCOME_COLOR : EXPENSE_COLOR, flexShrink: 0 }}>
                        {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                      </div>

                      {/* Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MoreHorizontal size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(txn)}>
                            <Pencil className="mr-2 h-4 w-4" />編集
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(txn)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>この操作は元に戻せません。この取引履歴が完全に削除されます。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
