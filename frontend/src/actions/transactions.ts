import { categorizeTransaction } from "../ai/flows/categorize-transaction";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function getSmartCategory(description: string, userId: string): Promise<{ category?: string; error?: string }> {
  if (!description?.trim()) {
    return { error: "Description cannot be empty." };
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      return { error: "User settings not found." };
    }

    const userData = userDocSnap.data();
    const geminiApiKey = userData?.geminiApiKey; // Assuming API key is stored in user doc
    const expenseCategories = userData?.settings?.expenseCategories || [];

    if (!geminiApiKey) {
      return { error: "AI function not ready. Please set up Gemini API key in settings." };
    }
    if (expenseCategories.length === 0) {
      return { error: "No expense categories defined. Please set them up in settings." };
    }

    const result = await categorizeTransaction({
      transactionDescription: description,
      expenseCategories,
      geminiApiKey,
    });

    return result;
  } catch (error) {
    console.error("Error getting smart category:", error);
    return { error: "Could not determine category." };
  }
}
