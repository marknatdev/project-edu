const DAY_MS = 86_400_000;

/** One shared day boundary for Thai competition planning, even abroad. */
export function thailandToday(now = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

function dayNumber(isoDate: string): number {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new Error('วันที่ไม่ถูกต้อง');
  }
  return date.getTime() / DAY_MS;
}

export function daysUntil(target: string, now = new Date()): number {
  return dayNumber(target) - dayNumber(thailandToday(now));
}

/** Repeated planning season, NOT a published registration deadline. */
export function approximateWindow(months: { startMonth: number; endMonth: number }, now = new Date()) {
  const { startMonth, endMonth } = months;
  if (![startMonth, endMonth].every((m) => Number.isInteger(m) && m >= 1 && m <= 12) || endMonth < startMonth) {
    throw new Error('ช่วงเดือนต้องอยู่ในปีเดียวกัน');
  }
  const today = thailandToday(now);
  let year = Number(today.slice(0, 4));
  const endFor = (y: number) => new Date(Date.UTC(y, endMonth, 0)).toISOString().slice(0, 10);
  if (today > endFor(year)) year++;
  const start = `${year}-${String(startMonth).padStart(2, '0')}-01`;
  const end = endFor(year);
  const phase = today < start ? 'upcoming' : 'within';
  return { start, end, phase, days: daysUntil(phase === 'upcoming' ? start : end, now) };
}
