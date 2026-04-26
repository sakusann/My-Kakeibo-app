// src/lib/formatUtils.ts

/**
 * 数値を日本円フォーマット（カンマ区切り）で表示する
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP').format(amount);
};
