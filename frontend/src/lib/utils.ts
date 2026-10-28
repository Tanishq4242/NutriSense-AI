import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function prettyDate(value: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options)
}

export function prettyNutrient(value: number | null | undefined, unit = 'g'): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`
}

