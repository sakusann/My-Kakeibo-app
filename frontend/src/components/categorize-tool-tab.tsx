"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { getSmartCategory } from "@/actions/transactions";

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

  const onSubmit = async (data: { description: string }) => {
    setLoading(true);
    setError(null);
    setCategory(null);
    const result = await getSmartCategory(data.description);
    if (result.category) {
      setCategory(result.category);
    } else {
      setError(result.error || "An unknown error occurred.");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Categorization Tool</CardTitle>
        <CardDescription>
          Enter a transaction description to see how AI categorizes it as income or an expense.
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

        {(category || error) && (
          <div className="mt-6 flex items-center justify-center rounded-lg border p-6">
            {category && (
              <div className="flex items-center gap-4 text-lg">
                <span className="text-muted-foreground">Type:</span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <Badge className="text-lg" variant={category === 'income' ? 'default' : 'destructive'}>{category}</Badge>
              </div>
            )}
            {error && <p className="text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
