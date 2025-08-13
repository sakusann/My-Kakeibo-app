"use client";

import type { Transaction } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryIcon } from './category-icon';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
}

export function TransactionTable({ transactions, loading }: TransactionTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>まだ取引がありません。</p>
        <p className="text-sm">「取引を追加」ボタンから最初の取引を記録しましょう。</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日付</TableHead>
            <TableHead>内容</TableHead>
            <TableHead>カテゴリ</TableHead>
            <TableHead className="text-right">金額</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.date}</TableCell>
              <TableCell className="font-medium">{t.description}</TableCell>
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-2 w-fit">
                  <CategoryIcon category={t.category} />
                  {t.category}
                </Badge>
              </TableCell>
              <TableCell className={`text-right font-semibold ${t.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                {t.type === 'income' ? '+' : '-'} ¥{t.amount.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
