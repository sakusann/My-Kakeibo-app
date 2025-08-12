import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface CategorizeTransactionInput {
  transactionDescription: string;
  expenseCategories: { id: string; name: string }[];
  geminiApiKey: string;
}

interface CategorizeTransactionOutput {
  category?: 'income' | 'expense';
  error?: string;
}

export async function categorizeTransaction(
  input: CategorizeTransactionInput
): Promise<CategorizeTransactionOutput> {
  const { transactionDescription, expenseCategories, geminiApiKey } = input;

  if (!transactionDescription) {
    return { error: "Description cannot be empty." };
  }
  if (!geminiApiKey) {
    return { error: "AI function not ready. Please check API key." };
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `取引内容：「${transactionDescription}」。以下の支出カテゴリリストから最も適切なものを1つだけ選び、そのIDを返してください.\n\nカテゴリリスト（nameとid）:\n${JSON.stringify(expenseCategories.map(({ id, name }) => ({ id, name })))} \n\n必ず指定されたカテゴリIDの中から選んでください。他の言葉は不要です。出力は{"categoryId": "ID"}のJSON形式でお願いします。`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/{.*}/);

    if (jsonMatch) {
        const suggestedId = JSON.parse(jsonMatch[0]).categoryId;
        if (suggestedId && expenseCategories.some(c => c.id === suggestedId)) {
          return { category: 'expense' }; // Assuming smart category is always expense
        } else {
          return { error: "AI could not find a suitable category." };
        }
    } else {
       return { error: "Invalid response format from AI." };
    }
  } catch (error) {
    console.error("AI categorization error:", error);
    return { error: "Failed to categorize transaction with AI." };
  }
}