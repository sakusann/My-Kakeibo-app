// src/lib/dateUtils.ts

import { format, endOfDay, addDays, lastDayOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { PaydaySettings, PaydayCycle } from '../types';

// 週末かどうかを判定するヘルパー関数 (変更なし)
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

// 週末だった場合に日付を調整するヘルパー関数 (変更なし)
const adjustForWeekend = (date: Date, rollover: 'before' | 'after'): Date => {
  let adjustedDate = new Date(date);
  if (!isWeekend(adjustedDate)) return adjustedDate;

  const direction = rollover === 'before' ? -1 : 1;
  do {
      adjustedDate = addDays(adjustedDate, direction);
  } while (isWeekend(adjustedDate));
  return adjustedDate;
};

// 指定された月の中での、正しい給料日の日付を取得する関数 (変更なし)
const getPaydayDateForMonth = (dateInMonth: Date, settings: PaydaySettings): Date => {
    const year = dateInMonth.getFullYear();
    const month = dateInMonth.getMonth();
    const lastDay = lastDayOfMonth(dateInMonth).getDate();
    const day = Math.min(settings.payday, lastDay);
    const paydayDate = new Date(year, month, day);
    return adjustForWeekend(paydayDate, settings.rollover);
}

// ★★★ここからが、バグを完全に修正した新しいロジックです★★★
export function getPaydayCycle(targetDate: Date, settings: PaydaySettings): PaydayCycle {
  // 1. 基準日が含まれる月の、正式な給料日を取得する
  const thisMonthPayday = getPaydayDateForMonth(targetDate, settings);

  let startDate: Date;

  // 2. 基準日がその月の給料日以降かどうかで、サイクルの開始日を決定する
  if (targetDate.getTime() >= thisMonthPayday.getTime()) {
    // 基準日が給料日以降なら、今月の給料日がサイクルの開始日
    startDate = thisMonthPayday;
  } else {
    // 基準日が給料日より前なら、先月の給料日がサイクルの開始日
    // 【修正点】addDays(-20)のような不安定な方法をやめ、確実に先月の日付を取得する
    const dateInPrevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    startDate = getPaydayDateForMonth(dateInPrevMonth, settings);
  }

  // 3. 次の月の給料日を確実に取得し、その前日をサイクルの終了日とする
  // 【修正点】addDays(35)のような不安定な方法をやめる
  const dateInNextMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
  const nextPayday = getPaydayDateForMonth(dateInNextMonth, settings);
  const endDate = addDays(nextPayday, -1);

  // 4. 時刻をリセットして、日付のみの純粋なサイクルを返す
  const cleanStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  return { start: cleanStartDate, end: endOfDay(endDate) };
}
// ★★★ここまでが修正の核心です★★★


export function formatCycle(cycle: PaydayCycle): string {
    return `${format(cycle.start, 'M月d日', { locale: ja })}〜${format(cycle.end, 'M月d日', { locale: ja })}`;
}

export function getCyclesForYear(year: number, settings: PaydaySettings): PaydayCycle[] {
    const cycles: PaydayCycle[] = [];
    if (!settings?.paydaySettings) return [];

    // 1月1日から開始して12回サイクルを計算する、より安定したロジックに変更
    let currentDate = new Date(year, 0, 1);
    
    for (let i = 0; i < 13; i++) { // 13回計算して重複を除去
        const cycle = getPaydayCycle(currentDate, settings);
        if (cycle.start.getFullYear() === year) {
            cycles.push(cycle);
        }
        currentDate = addDays(cycle.end, 2);
    }
    
    // 重複するサイクルを削除して12ヶ月分に整形
    const uniqueCyclesMap = new Map<string, PaydayCycle>();
    cycles.forEach(c => uniqueCyclesMap.set(c.start.toISOString(), c));
    
    return Array.from(uniqueCyclesMap.values())
        .sort((a,b) => a.start.getTime() - b.start.getTime())
        .slice(0, 12);
}