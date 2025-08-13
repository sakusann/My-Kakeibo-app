import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from './ui/skeleton';

interface InsightsTabProps {
  userId: string;
}

export function InsightsTab({ userId }: InsightsTabProps) {
  const [budget, setBudget] = useState('20000');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrun, setOverrun] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        const q = query(collection(db, `users/${userId}/transactions`));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTransactions(data);
      } catch (e) {
        setError('取引データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // 月次合計
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  useEffect(() => {
    setOverrun(totalExpenses > parseFloat(budget));
  }, [totalExpenses, budget]);

  // AI Studio連携用プロンプト生成
  const handleAiStudioExport = async () => {
    const prompt = `# 家計簿データ分析レポート作成依頼\n\n## 依頼内容\n以下の家計簿データ（JSON形式）を詳細に分析し、プロのファイナンシャルアドバイザーとして包括的なレポートを作成してください。\n\n## 対象データ\n\`\`\`json\n${JSON.stringify(transactions, null, 2)}\n\`\`\``;
    try {
      await navigator.clipboard.writeText(prompt);
      alert('プロンプトをクリップボードにコピーしました。Google AI Studioで貼り付けてください。');
      window.open('https://aistudio.google.com/chat', '_blank');
    } catch (e) {
      alert('クリップボードへのコピーに失敗しました。');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>月間支出インサイト</CardTitle>
        <CardDescription>月間予算と支出の状況を確認できます。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-auto flex-grow">
            <Label htmlFor="budget">月間予算 (円)</Label>
            <Input
              id="budget"
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="例: 20000"
            />
          </div>
        </div>
        <div>
          {loading ? (
            <div>
              <span>今月の支出合計: </span>
              <Skeleton className="h-6 w-24" />
            </div>
          ) : (
            <p>今月の支出合計: <b>{`${totalExpenses.toLocaleString()} 円`}</b></p>
          )}
          {overrun && (
            <Alert variant="destructive">
              <AlertTitle>予算オーバー</AlertTitle>
              <AlertDescription>今月の支出が予算を超えています！</AlertDescription>
            </Alert>
          )}
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button onClick={handleAiStudioExport} variant="secondary">
          Google AI Studio用プロンプト生成
        </Button>
      </CardContent>
    </Card>
  );
}
