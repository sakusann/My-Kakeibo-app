// src/components/TransactionsTab.tsx

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import AddTransactionDialog from './AddTransactionDialog';
import { Transaction, FirestoreTransaction } from '../types';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';
import { Badge } from './ui/badge';
// ★★★ここからが修正の核心です★★★
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // エイリアスパスを使用
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // エイリアスパスを使用
// ★★★ここまでが修正の核心です★★★
import { useToast } from './ui/use-toast';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
};

export default function TransactionsTab() {
    const { currentUser } = useAuthContext();
    const { getCategoryName, deleteTransaction } = useAppContext();
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    useEffect(() => {
        if (!currentUser) { setLoading(false); return; }
        setLoading(true);
        const tCollection = collection(db, 'users', currentUser.uid, 'transactions');
        const q = query(tCollection, orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedTransactions = querySnapshot.docs.map(doc => {
                const data = doc.data() as FirestoreTransaction;
                const dateObject = data.date && typeof data.date.toDate === 'function' ? data.date.toDate() : new Date(data.date as any);
                return { ...data, id: doc.id, date: dateObject.toISOString().split('T')[0], };
            });
            setTransactions(fetchedTransactions);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleEdit = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsDialogOpen(true);
    };

    const handleDelete = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsAlertOpen(true);
    };
    
    const confirmDelete = async () => {
        if (selectedTransaction) {
            try {
                await deleteTransaction(selectedTransaction.id);
                toast({ title: "成功", description: "取引を削除しました。" });
            } catch (error) {
                toast({ title: "エラー", description: "削除に失敗しました。", variant: "destructive" });
            } finally {
                setIsAlertOpen(false);
                setSelectedTransaction(null);
            }
        }
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            setSelectedTransaction(null);
        }
        setIsDialogOpen(open);
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>取引履歴</CardTitle>
                    <Button onClick={() => { setSelectedTransaction(null); setIsDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        取引を追加
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? ( <p>読み込み中...</p> ) : transactions.length === 0 ? ( <p>取引履歴がありません。</p> ) : (
                        <div className="space-y-2">
                            {transactions.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-2 pr-3 bg-secondary rounded-lg">
                                    <div className="flex items-center gap-4">
                                         <div className="text-center w-12">
                                            <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'M月', { locale: ja })}</p>
                                            <p className="text-lg font-bold">{format(new Date(t.date), 'd', { locale: ja })}</p>
                                         </div>
                                         <div>
                                            <p className="font-semibold">{t.description}</p>
                                            <div className="flex items-center gap-2 flex-wrap mt-1">
                                                <Badge variant="outline">{getCategoryName(t.category)}</Badge>
                                                {t.tags && t.tags.map(tag => ( <Badge key={tag} variant="secondary">{tag}</Badge> ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className={`font-bold text-lg whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                                            {t.type === 'income' ? '+' : '-'}¥{formatCurrency(t.amount)}
                                        </p>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(t)}><Pencil className="mr-2 h-4 w-4" />編集</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(t)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />削除</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            <AddTransactionDialog 
                key={selectedTransaction?.id || 'new'} 
                open={isDialogOpen} 
                onOpenChange={handleDialogClose} 
                transactionToEdit={selectedTransaction} 
            />
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>本当に削除しますか？</AlertDialogTitle><AlertDialogDescription>この操作は元に戻せません。この取引履歴が完全に削除されます。</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>削除する</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}