import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a date to Mongolia time (UTC+8).
 */
export function toMongoliaTime(date: string | Date): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getTime() + (8 - (-d.getTimezoneOffset() / 60)) * 60 * 60 * 1000);
}

/**
 * Format date in Mongolian style.
 * Dates from the API are already in Mongolia time (UTC+8) stored as naive timestamps,
 * so we use them directly without timezone conversion.
 * "short" → "3-р сар 17"
 * "full"  → "2026 оны 3-р сарын 17"
 * "time"  → "3-р сар 17, 14:30"
 */
export function formatDate(date: string | Date, style: "short" | "full" | "time" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const monthStr = `${month}-р сар`;

  if (style === "full") {
    return `${year} оны ${monthStr}ын ${day}`;
  }
  if (style === "time") {
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${monthStr} ${day}, ${h}:${m}`;
  }
  return `${monthStr} ${day}`;
}

/**
 * Format date as relative time in Mongolian: "5 минутын өмнө", "2 цагийн өмнө", etc.
 * Falls back to absolute format after 24 hours.
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 0) return formatDate(date, "time");
  if (diffMin < 1) return "Яг одоо";
  if (diffMin < 60) return `${diffMin} минутын өмнө`;
  if (diffHour < 24) return `${diffHour} цагийн өмнө`;

  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 1) return "Өчигдөр";
  if (diffDays < 7) return `${diffDays} өдрийн өмнө`;

  return formatDate(date, "time");
}

/**
 * Format date for chart axis: "3/17"
 */
export function formatChartDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}
