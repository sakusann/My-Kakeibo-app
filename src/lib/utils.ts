// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// shadcn-ui が生成した、クラス名を結合するためのユーティリティ関数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ★★★ここからが、消えてしまっていたID生成ロジックです★★★

// 汎用的な短いランダムIDを生成するプライベート関数
const generateRandomId = () => Math.random().toString(36).substring(2, 9);

// カテゴリ専用のIDジェネレータ（'cat_'という接頭辞がつく）
export const generateCategoryId = () => `cat_${generateRandomId()}`;

// 定期支払いなど、他の用途のIDジェネレータ（'id_'という接頭辞がつく）
export const generateId = () => `id_${generateRandomId()}`;
// ★★★ここまで★★★