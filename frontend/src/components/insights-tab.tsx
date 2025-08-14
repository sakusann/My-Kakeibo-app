"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
// import { getSpendingInsights } from "@/ai/flows/spending-insights"; // AI機能が不要になったためコメントアウト
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, ListChecks, Target, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface InsightsTabProps {
  userId: string;
}

type InsightsData = {
  summary: string;
  budgetOverruns: string[];
  recommendations: string[];
} | null;

export function InsightsTab({ userId }: InsightsTabProps) {
  const { settings } = useAppContext();
  const [insights, setInsights] = useState(null as InsightsData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (settings?.monthlyIncome) {
      setBudget(String(settings.monthlyIncome));
    }
  }, [settings]);

  const handleGenerateInsights = async () => {
    setLoading(true);
    setError(null);
    setInsights(null);

    const monthlyBudget = parseFloat(budget);
    if (isNaN(monthlyBudget) || monthlyBudget <= 0) {
      setError("有効な正の数値を予算に入力してください。");
      setLoading(false);
      return;
    }
    
    try {
      const transactionsQuery = query(collection(db, `users/${userId}/transactions`));
      const querySnapshot = await getDocs(transactionsQuery);
      const transactions: Transaction[] = querySnapshot.docs.map(doc => (
        { id: doc.id, ...doc.data() } as Transaction
      ));

      if (transactions.length < 3) {
        setError("分析には最低3件の取引データが必要です。");
        setLoading(false);
        return;
      }

      // AI機能が不要になったため、ダミーの分析結果を返す
      const result: InsightsData = {
        summary: "AI分析機能は現在無効です。これはダミーの分析結果です。",
        budgetOverruns: ["ダミーカテゴリAが予算を少し超えています。", "ダミーカテゴリBが大幅に予算を超過しています。"],
        recommendations: ["ダミーの改善提案1。", "ダミーの改善提案2。"],
      };
      setInsights(result);
    } catch (e) {
      console.error(e);
      setError("分析中にエラーが発生しました。もう一度お試しください。");
      toast({
        variant: "destructive",
        title: "分析失敗",
        description: "AIサービスへの接続に失敗しました。",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AIによる支出分析</CardTitle>
        <CardDescription>
          月間予算を入力すると、AIがあなたの支出傾向を分析し、パーソナライズされたアドバイスを提供します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-auto flex-grow">
            <Label htmlFor="budget">月間予算（円）</Label>
            <Input
              id="budget"
              type="number"
              value={budget}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBudget(e.target.value)}
              placeholder="例: 200000"
            />
          </div>
          <Button onClick={handleGenerateInsights} disabled={loading} variant="accent" className="w-full sm:w-auto">
            {loading ? "分析中..." : "分析を実行"}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        
        {insights && (
          <div className="space-y-6 pt-4">
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>概要</AlertTitle>
              <AlertDescription>{insights.summary}</AlertDescription>
            </Alert>
            
            {insights.budgetOverruns.length > 0 && (
              <Alert>
                <Target className="h-4 w-4" />
                <AlertTitle>予算超過</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {insights.budgetOverruns.map((item: string, index: number) => <li key={index}>{item}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {insights.recommendations.length > 0 && (
              <Alert>
                <ListChecks className="h-4 w-4" />
                <AlertTitle>改善提案</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {insights.recommendations.map((item: string, index: number) => <li key={index}>{item}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}