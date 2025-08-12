"use client";

import { useState, useEffect } from "react";
import { getSpendingInsights } from "@/ai/flows/spending-insights";
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, ListChecks, Target, AlertCircle } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
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
  const [insights, setInsights] = useState<InsightsData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState("2000");
  const { toast } = useToast();

  const handleGenerateInsights = async () => {
    setLoading(true);
    setError(null);
    setInsights(null);

    const monthlyBudget = parseFloat(budget);
    if (isNaN(monthlyBudget) || monthlyBudget <= 0) {
      setError("Please enter a valid positive number for your budget.");
      setLoading(false);
      return;
    }
    
    try {
      const transactionsQuery = query(collection(db, `users/${userId}/transactions`));
      const querySnapshot = await getDocs(transactionsQuery);
      const transactions: Transaction[] = querySnapshot.docs.map(doc => doc.data() as Transaction);

      if (transactions.length < 3) {
        setError("You need at least 3 transactions to generate insights.");
        setLoading(false);
        return;
      }

      const input = {
        transactions: transactions.map(t => ({
          date: t.date.substring(0, 10),
          category: t.category,
          amount: t.amount,
          description: t.description,
        })),
        monthlyBudget,
      };

      const result = await getSpendingInsights(input);
      setInsights(result);
    } catch (e) {
      console.error(e);
      setError("An error occurred while generating insights. Please try again.");
      toast({
        variant: "destructive",
        title: "Insight Generation Failed",
        description: "Could not connect to the AI service.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Insights</CardTitle>
        <CardDescription>
          Enter your monthly budget and let AI analyze your spending habits to provide personalized advice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-auto flex-grow">
            <Label htmlFor="budget">Your Monthly Budget ($)</Label>
            <Input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g., 2000"
            />
          </div>
          <Button onClick={handleGenerateInsights} disabled={loading} variant="accent" className="w-full sm:w-auto">
            {loading ? "Analyzing..." : "Generate Insights"}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
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
              <AlertTitle>Summary</AlertTitle>
              <AlertDescription>{insights.summary}</AlertDescription>
            </Alert>
            
            {insights.budgetOverruns.length > 0 && (
              <Alert>
                <Target className="h-4 w-4" />
                <AlertTitle>Budget Overruns</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {insights.budgetOverruns.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {insights.recommendations.length > 0 && (
              <Alert>
                <ListChecks className="h-4 w-4" />
                <AlertTitle>Recommendations</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {insights.recommendations.map((item, index) => <li key={index}>{item}</li>)}
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
