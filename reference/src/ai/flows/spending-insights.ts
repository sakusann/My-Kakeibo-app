// This file is machine-generated - edit with care!

'use server';

/**
 * @fileOverview Provides AI-powered insights on user spending, including budget overruns and personalized recommendations.
 *
 * - `getSpendingInsights` -  A function that generates spending insights based on transaction data.
 * - `SpendingInsightsInput` - The input type for the `getSpendingInsights` function.
 * - `SpendingInsightsOutput` - The return type for the `getSpendingInsights` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionSchema = z.object({
  date: z.string().describe('The date of the transaction (YYYY-MM-DD).'),
  category: z.string().describe('The category of the transaction (e.g., Groceries, Rent, Entertainment).'),
  amount: z.number().describe('The amount of the transaction.'),
  description: z.string().optional().describe('Optional description of the transaction.'),
});

const SpendingInsightsInputSchema = z.object({
  transactions: z.array(TransactionSchema).describe('An array of transactions.'),
  monthlyBudget: z.number().describe('The user\u2019s total monthly budget.'),
});

export type SpendingInsightsInput = z.infer<typeof SpendingInsightsInputSchema>;

const SpendingInsightsOutputSchema = z.object({
  summary: z.string().describe('A summary of the user\u2019s spending habits.'),
  budgetOverruns: z.array(z.string()).describe('Specific categories where the user exceeded their budget.'),
  recommendations: z.array(z.string()).describe('Personalized recommendations for improving financial health.'),
});

export type SpendingInsightsOutput = z.infer<typeof SpendingInsightsOutputSchema>;

export async function getSpendingInsights(input: SpendingInsightsInput): Promise<SpendingInsightsOutput> {
  return spendingInsightsFlow(input);
}

const spendingInsightsPrompt = ai.definePrompt({
  name: 'spendingInsightsPrompt',
  input: {schema: SpendingInsightsInputSchema},
  output: {schema: SpendingInsightsOutputSchema},
  prompt: `You are a personal finance advisor. Analyze the user's spending habits and provide insights and recommendations.

Here are the user's transactions:
{{#each transactions}}
- Date: {{date}}, Category: {{category}}, Amount: {{amount}}, Description: {{description}}
{{/each}}

User's monthly budget: {{monthlyBudget}}

Analyze the transactions and identify any budget overruns. Provide personalized recommendations for improving their financial health, considering their spending habits and budget.

Focus on actionable advice and specific areas where they can adjust their spending.

Respond in a format suitable for display in a user interface.`,
});

const spendingInsightsFlow = ai.defineFlow(
  {
    name: 'spendingInsightsFlow',
    inputSchema: SpendingInsightsInputSchema,
    outputSchema: SpendingInsightsOutputSchema,
  },
  async input => {
    const {output} = await spendingInsightsPrompt(input);
    return output!;
  }
);
