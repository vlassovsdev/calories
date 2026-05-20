import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDate(str: string): Date {
  return parseISO(str)
}

export function formatDisplayDate(str: string): string {
  return format(parseISO(str), 'dd MMM yyyy')
}

export function today(): string {
  return formatDate(new Date())
}

export function roundNum(n: number): number {
  return Math.round(n)
}
