"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { getFunctions, httpsCallable } from "firebase/functions"; 

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight } from "lucide-react";

const formSchema = z.object({
  description: z.string().min(3, "3文字以上入力してください。"),
});

export function CategorizeToolTab() {
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<{ description: string }>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: { description: string }) => {
    setLoading(true);
    setError(null);
    setCategory(null);

    try {
      const functions = getFunctions();
      const getSmartCategoryFunc = httpsCallable(functions, 'getSmartCategory');

      const response = await getSmartCategoryFunc({ description: data.description });
      const suggestedCategory = (response.data as { category?: unknown })?.category;
      
      if (typeof suggestedCategory === 'string' && suggestedCategory) {
        setCategory(suggestedCategory);
      } else {
        setError("カテゴリを特定できませんでした。");
      }
    } catch (err) {
      console.error("AIカテゴリ分類関数の呼び出しエラー:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AIカテゴリ分類ツール</CardTitle>
        <CardDescription>
          取引の内容を入力して、AIがどのように分類するか試せます。
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
                  <FormLabel>取引の内容</FormLabel>
                  <FormControl>
                    <Input placeholder="例：「給料」や「スーパーでの食料品」" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading}>
              {loading ? "分析中..." : "分類する"}
            </Button>
          </form>
        </Form>

        {(category || error) && (
          <div className="mt-6 flex items-center justify-center rounded-lg border p-6">
            {category && !error && (
              <div className="flex items-center gap-4 text-lg">
                <span className="text-muted-foreground">分類結果:</span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <Badge className="text-lg">{category}</Badge>
              </div>
            )}
            {error && <p className="text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}