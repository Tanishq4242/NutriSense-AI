import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }>(function Button({ className, variant = 'primary', ...props }, ref) {
  return <button ref={ref} className={cn('button', `button-${variant}`, className)} {...props} />
})

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('input', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn('input select', className)} {...props} />
})

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('card', className)}>{children}</section>
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted heading-copy">{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>
}

export function ErrorNotice({ message }: { message: string }) {
  return <div className="notice notice-error" role="alert">{message}</div>
}

export function LoadingState({ label }: { label: string }) {
  return <div className="full-screen-loading" role="status"><span className="loader-dot" />{label}</div>
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-mark">✳</span><h3>{title}</h3><p>{body}</p>{action}</div>
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}</label>
}

export function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: ReactNode }) {
  return <Card className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong>{sub && <small>{sub}</small>}</Card>
}

export function ProgressBar({ value, color = 'green' }: { value: number; color?: 'green' | 'blue' | 'amber' }) {
  const normalized = Math.min(100, Math.max(0, value))
  return <div className="progress-track" role="progressbar" aria-valuenow={Math.round(normalized)} aria-valuemin={0} aria-valuemax={100}><div className={`progress-fill progress-${color}`} style={{ width: `${normalized}%` }} /></div>
}

