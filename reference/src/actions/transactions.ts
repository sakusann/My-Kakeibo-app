"use server";

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";

export async function getSmartCategory(description: string): Promise<{ category?: string; error?: string }> {
  if (!description?.trim()) {
    return { error: "Description cannot be empty." };
  }

  try {
    const result = await categorizeTransaction({ transactionDescription: description });
    // The AI flow returns one of: "Income", "Expenses", or "Savings".
    // We map "Expenses" to "expense" and "Income" to "income" for our transaction type.
    const category = result.category.toLowerCase();
    if (category === 'expenses' || category === 'expense') {
        return { category: 'expense' };
    }
    if (category === 'income') {
        return { category: 'income' };
    }
    return { category: 'expense' }; // Default to expense for "Savings" or others.
  } catch (error) {
    console.error("Error getting smart category:", error);
    return { error: "Could not determine category." };
  }
}
