import { format, endOfDay, addDays, lastDayOfMonth } from 'date-fns';
import ja from 'date-fns/locale/ja';
import { PaydaySettings, PaydayCycle } from '../types';

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const adjustForWeekend = (date: Date, rollover: 'before' | 'after'): Date => {
  let adjustedDate = new Date(date);
  if (!isWeekend(adjustedDate)) return adjustedDate;
  const direction = rollover === 'before' ? -1 : 1;
  do {
      adjustedDate = addDays(adjustedDate, direction);
  } while (isWeekend(adjustedDate));
  return adjustedDate;
};

const getPaydayDateForMonth = (dateInMonth: Date, settings: PaydaySettings): Date => {
    const year = dateInMonth.getFullYear();
    const month = dateInMonth.getMonth();
    const lastDay = lastDayOfMonth(dateInMonth).getDate();
    const day = Math.min(settings.payday, lastDay);
    const paydayDate = new Date(year, month, day);
    return adjustForWeekend(paydayDate, settings.rollover);
}

export function getPaydayCycle(targetDate: Date, settings: PaydaySettings): PaydayCycle {
  const thisMonthPayday = getPaydayDateForMonth(targetDate, settings);
  let startDate: Date;

  if (targetDate.getTime() >= thisMonthPayday.getTime()) {
    startDate = thisMonthPayday;
  } else {
    const dateInPrevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    startDate = getPaydayDateForMonth(dateInPrevMonth, settings);
  }

  const dateInNextMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
  const nextPayday = getPaydayDateForMonth(dateInNextMonth, settings);
  const endDate = addDays(nextPayday, -1);

  const cleanStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  return { start: cleanStartDate, end: endOfDay(endDate) };
}

export function formatCycle(cycle: PaydayCycle): string {
    return `${format(cycle.start, 'M月d日', { locale: ja })}〜${format(cycle.end, 'M月d日', { locale: ja })}`;
}

export function getCyclesForYear(year: number, settings: PaydaySettings): PaydayCycle[] {
    const cycles: PaydayCycle[] = [];
    if (!settings?.paydaySettings) return [];
    let currentDate = new Date(year, 0, 1);
    for (let i = 0; i < 13; i++) {
        const cycle = getPaydayCycle(currentDate, settings);
        if (cycle.start.getFullYear() === year) {
            cycles.push(cycle);
        }
        currentDate = addDays(cycle.end, 2);
    }
    const uniqueCyclesMap = new Map<string, PaydayCycle>();
    cycles.forEach(c => uniqueCyclesMap.set(c.start.toISOString(), c));
    return Array.from(uniqueCyclesMap.values())
        .sort((a,b) => a.start.getTime() - b.start.getTime())
        .slice(0, 12);
}