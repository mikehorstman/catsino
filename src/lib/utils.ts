import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer coin amount as a grouped string, e.g. 12500 -> "12,500". */
export function formatCoins(amount: number): string {
  return new Intl.NumberFormat("en-US").format(Math.trunc(amount));
}

/** Format a multiplier for display, e.g. 2 -> "2x", 1.5 -> "1.5x". */
export function formatMultiplier(multiplier: number): string {
  const rounded = Math.round(multiplier * 100) / 100;
  return `${rounded}x`;
}

/** Short relative date used in history rows. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
