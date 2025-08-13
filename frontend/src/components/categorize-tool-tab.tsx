"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
// ▼▼▼ Firebase Functionsのライブラリをインポート ▼▼▼
import { getFunctions, httpsCallable } from "firebase/functions"; 
// ▼▼▼ このファイルはもう不要なので削除 ▼▼▼
// import { getSmartCategory } from "@/actions/transactions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight } from "lucide-react";

const formSchema = z.object({
  description: z.string().min(3, "Please enter at least 3 characters."),
});

export function CategorizeToolTab() {
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<{ description: string }>({
    resolver: zodResolver(formSchema),
  });

  // ▼▼▼ onSubmit関数の中身をCloud Function呼び出しに書き換え ▼▼▼
  const onSubmit = async (data: { description: string }) => {
    setLoading(true);
    setError(null);
    setCategory(null);

    try {
      // 1. Cloud Functionを初期化
      const functions = getFunctions();
      const getSmartCategoryFunc = httpsCallable(functions, 'getSmartCategory');

      // 2. Cloud Functionを呼び出し、結果を受け取る
      const response = await getSmartCategoryFunc({ description: data.description });
      const suggestedCategory = response.data.category as string;
      
      // 3. 結果をStateにセット
      if (suggestedCategory) {
        setCategory(suggestedCategory);
      } else {
        setError("Could not determine a category.");
      }
    } catch (err) {
      console.error("Error calling smart category function:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Categorization Tool</CardTitle>
        <CardDescription>
          Enter a transaction description to see how AI categorizes it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 'Monthly salary' or 'Groceries from Walmart'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? "Analyzing..." : "Categorize"}
            </Button>
          </form>
        </Form>

        {/* 結果表示エリアはロジックを少し変更 */}
        {(category || error) && (
          <div className="mt-6 flex items-center justify-center rounded-lg border p-6">
            {loading && <p>Analyzing...</p>}
            {!loading && category && (
              <div className="flex items-center gap-4 text-lg">
                <span className="text-muted-foreground">Category:</span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                {/* Badgeの表示ロジックはカテゴリ名に応じて変更が必要かもしれません */}
                <Badge className="text-lg">{category}</Badge>
              </div>
            )}
            {!loading && error && <p className="text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}