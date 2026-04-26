// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// shadcn-ui が生成した、クラス名を結合するためのユーティリティ関数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ★★★ここからが、消えてしまっていたID生成ロジックです★★★

// カテゴリ専用のIDジェネレータ（'cat_'という接頭辞がつく）
export const generateCategoryId = () => `cat_${crypto.randomUUID().slice(0, 8)}`;

// 定期支払いなど、他の用途のIDジェネレータ（'id_'という接頭辞がつく）
export const generateId = () => `id_${crypto.randomUUID().slice(0, 8)}`;
// ★★★ここまで★★★