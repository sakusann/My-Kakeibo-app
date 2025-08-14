// src/components/TransactionsTab.tsx

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';
import AddTransactionDialog from './AddTransactionDialog';
import { Transaction, FirestoreTransaction } from '../types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { Badge } from './ui/badge';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
};

export default function TransactionsTab() {
    const { currentUser } = useAuthContext();
    // ★★★ getCategoryName を取得 ★★★
    const { getCategoryName } = useAppContext();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);
        const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
        const q = query(tCollection, orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
        });

        return () => unsubscribe();
    }, [currentUser]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>取引履歴</CardTitle>
                <Button onClick={() => setAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    取引を追加
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>読み込み中...</p>
                ) : transactions.length === 0 ? (
                    <p>取引履歴がありません。</p>
                ) : (
                    <div className="space-y-4">
                        {transactions.map(t => (
                            <div key={t.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                                <div className="flex items-center gap-4">
                                     <div className="text-center">
                                        <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'M月', { locale: ja })}</p>
                                        <p className="text-lg font-bold">{format(new Date(t.date), 'd', { locale: ja })}</p>
                                     </div>
                                     <div>
                                        <p className="font-semibold">{t.description}</p>
                                        <div className="flex items-center gap-2">
                                            {/* ★★★ getCategoryName を使用 ★★★ */}
                                            <span className="text-sm text-muted-foreground">{getCategoryName(t.category)}</span>
                                            {t.tags && t.tags.map(tag => (
                                                <Badge key={tag} variant="outline">{tag}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'income' ? '+' : '-'}¥{formatCurrency(t.amount)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            <AddTransactionDialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen} />
        </Card>
    );
}