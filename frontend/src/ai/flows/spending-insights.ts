import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';

interface GetSpendingInsightsInput {
  transactions: Transaction[];
  monthlyBudget: number;
  userId: string;
}

type InsightsData = {
  summary: string;
  budgetOverruns: string[];
  recommendations: string[];
} | null;

export async function getSpendingInsights(
  input: GetSpendingInsightsInput
): Promise<InsightsData | { error: string }> {
  const { transactions, monthlyBudget, userId } = input;

  if (transactions.length < 3) {
    return { error: "You need at least 3 transactions to generate insights." };
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      return { error: "User settings not found." };
    }

    const userData = userDocSnap.data();
    const geminiApiKey = userData?.geminiApiKey; // Assuming API key is stored in user doc

    if (!geminiApiKey) {
      return { error: "AI function not ready. Please set up Gemini API key in settings." };
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const formattedTransactions = transactions.map(t => ({
      date: t.date.substring(0, 10),
      category: t.category,
      amount: t.amount,
      description: t.description,
    }));

    const prompt = `あなたは経験豊富なファイナンシャルプランナーです。以下の日本のユーザーの家計簿データと月間予算を見て、支出のパターンを分析し、改善のための具体的なアドバイスをフレンドリーな口調で提供してください.\n\n# 家計簿データ\n${JSON.stringify(formattedTransactions)}\n\n# 月間予算\n${monthlyBudget}円\n\n# 指示\n1. 全体をレビューし、まず何か一つポジティブな点を褒めてください.\n2. 次に、支出が特に多い月や、改善できそうな点を客観的に指摘してください.\n3. 最後に、貯蓄を増やすための、具体的で実行可能な改善案を3つ提案してください.\n4. 出力はJSON形式でお願いします。JSONの構造は以下の通りです.\n{\n  "summary": "全体的な要約とポジティブな点",\n  "budgetOverruns": ["予算オーバーのカテゴリや月"],\n  "recommendations": ["具体的な改善案1", "具体的な改善案2", "具体的な改善案3"]\n}\n`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
      const parsedResult = JSON.parse(responseText);
      // Basic validation to ensure it matches InsightsData structure
      if (parsedResult.summary && Array.isArray(parsedResult.budgetOverruns) && Array.isArray(parsedResult.recommendations)) {
        return parsedResult as InsightsData;
      } else {
        console.error("AI response did not match expected structure:", responseText);
        return { error: "AIからの応答形式が不正です。" };
      }
    } catch (jsonError) {
      console.error("Failed to parse AI response as JSON:", responseText, jsonError);
      return { error: "AIからの応答を解析できませんでした。" };
    }
  } catch (error) {
    console.error("AI insight generation error:", error);
    return { error: "AIによる洞察生成に失敗しました。" };
  }
}