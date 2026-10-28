import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Droplets, Flame, Plus, Sparkles, Target } from 'lucide-react'
import { api } from '../lib/api'
import { localDateKey, prettyDate, prettyNutrient } from '../lib/utils'
import type { DailySummary, FoodLog, Profile, WeeklySummary } from '../types'
import { Button, Card, EmptyState, ErrorNotice, Input, PageHeading, ProgressBar } from '../components/ui'

const meals = [
  { key: 'breakfast', label: 'Breakfast', emoji: '☀' },
  { key: 'lunch', label: 'Lunch', emoji: '◒' },
  { key: 'snacks', label: 'Snacks', emoji: '✳' },
  { key: 'dinner', label: 'Dinner', emoji: '☾' },
]

export function DashboardPage() {
  const [dateKey, setDateKey] = useState(localDateKey())
  const [waterAmount, setWaterAmount] = useState(250)
  const queryClient = useQueryClient()
  const dailyQuery = useQuery({ queryKey: ['daily', dateKey], queryFn: () => api.get<DailySummary>(`/api/analytics/daily?date=${dateKey}`) })
  const weekQuery = useQuery({ queryKey: ['weekly', dateKey], queryFn: () => api.get<WeeklySummary>(`/api/analytics/weekly?start_date=${weekStart(dateKey)}`) })
  const waterQuery = useQuery({ queryKey: ['water', dateKey], queryFn: () => api.get<{ total_ml: number; goal_ml: number; items: { id: string; quantity_ml: number }[] }>(`/api/water-logs?date=${dateKey}`) })
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/api/profile') })
  const waterMutation = useMutation({ mutationFn: () => api.post('/api/water-logs', { date: dateKey, quantity_ml: waterAmount }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['water', dateKey] }) })
  const removeWaterMutation = useMutation({ mutationFn: (id: string) => api.delete(`/api/water-logs/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['water', dateKey] }) })
  const data = dailyQuery.data
  const target = data?.targets?.calories ?? profileQuery.data?.targets?.calories ?? 2000
  const consumed = data?.totals?.calories ?? 0
  const percent = target ? consumed / target * 100 : 0
  const water = waterQuery.data?.total_ml ?? 0
  const waterGoal = waterQuery.data?.goal_ml ?? 2000

  return <div className="page-stack"><PageHeading eyebrow="Your nutrition, in context" title="Good morning" description="A gentle check-in on your food and hydration for the day." action={<label className="date-control"><span>Viewing</span><Input aria-label="Choose dashboard date" type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} /></label>} />
    {(dailyQuery.error || weekQuery.error || waterQuery.error || profileQuery.error) && <ErrorNotice message="Some dashboard information could not be loaded. Check the backend connection and try again." />}
    <section className="dashboard-grid"><Card className="calorie-card"><div className="card-heading"><div><p className="eyebrow">Daily energy</p><h2>Calories, without the guesswork</h2></div><span className="soft-icon"><Flame size={18} /></span></div><div className="calorie-content"><div className="calorie-number"><strong>{Math.round(consumed).toLocaleString()}</strong><span>kcal logged</span></div><div className="calorie-target"><div><span>Personal target</span><strong>{target.toLocaleString()} <small>kcal</small></strong></div><span className="target-badge"><Target size={14} /> {Math.round(percent)}%</span></div></div><ProgressBar value={percent} /><div className="calorie-footer"><span>{data?.has_logs ? `${data.logged_entry_count} ${data.logged_entry_count === 1 ? 'entry' : 'entries'} logged` : 'No food logged for this date yet'}</span><span className={data && data.calories_remaining < 0 ? 'negative-value' : ''}>{data ? `${Math.round(Math.abs(data.calories_remaining)).toLocaleString()} kcal ${data.calories_remaining < 0 ? 'over target' : 'remaining'}` : '—'}</span></div></Card>
    <Card className="weekly-card"><div className="card-heading"><div><p className="eyebrow">This week</p><h2>Your recent rhythm</h2></div><Link to="/analytics" className="icon-link" aria-label="View analytics"><ArrowRight size={17} /></Link></div><div className="weekly-stats"><div><span>Logged days</span><strong>{weekQuery.data?.logged_days ?? '—'}<small> / 7</small></strong></div><div><span>Avg. logged energy</span><strong>{weekQuery.data?.average_calories == null ? '—' : Math.round(weekQuery.data.average_calories).toLocaleString()}<small>{weekQuery.data?.average_calories == null ? '' : ' kcal'}</small></strong></div><div><span>Avg. protein</span><strong>{weekQuery.data?.average_protein == null ? '—' : Math.round(weekQuery.data.average_protein)}<small>{weekQuery.data?.average_protein == null ? '' : ' g'}</small></strong></div></div><div className="week-dots">{weekQuery.data?.days.map((day) => <div key={day.date} title={`${prettyDate(day.date)}${day.has_logs ? ` · ${Math.round(day.calories ?? 0)} kcal` : ' · no logs'}`} className={`week-dot ${day.has_logs ? 'week-dot-on' : ''}`}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</span><i /></div>)}</div><Link to="/analytics" className="subtle-link">Explore your weekly data <ArrowRight size={14} /></Link></Card></section>

    <section className="macro-row"><div className="macro-section-heading"><div><p className="eyebrow">Nutrition snapshot</p><h2>More than a calorie count</h2></div><Link to="/analytics" className="subtle-link">View trends <ArrowRight size={14} /></Link></div><div className="macro-cards">{[{ label: 'Protein', value: data?.totals.protein, target: data?.targets.protein, color: 'green' as const, icon: <Activity size={17} /> }, { label: 'Carbohydrates', value: data?.totals.carbohydrates, target: data?.targets.carbohydrates, color: 'blue' as const, icon: <ArrowUpRight size={17} /> }, { label: 'Fat', value: data?.totals.fat, target: data?.targets.fat, color: 'amber' as const, icon: <ArrowDownRight size={17} /> }, { label: 'Fiber', value: data?.totals.fiber, target: data?.targets.fiber, color: 'green' as const, icon: <Sparkles size={17} /> }].map((macro) => <Card className="macro-card" key={macro.label}><div className="macro-card-top"><span>{macro.label}</span><span className={`macro-mini-icon ${macro.color}`}>{macro.icon}</span></div><strong>{prettyNutrient(macro.value)}</strong><div className="macro-progress-line"><ProgressBar value={macro.target && macro.value != null ? Number(macro.value) / Number(macro.target) * 100 : 0} color={macro.color} /><small>{macro.target == null ? 'Target not set' : `of ${prettyNutrient(macro.target)} target`}</small></div></Card>)}</div></section>

    <section className="lower-grid"><Card className="meals-card"><div className="card-heading"><div><p className="eyebrow">Meal log</p><h2>Today’s meals</h2></div><Link to="/diary" className="subtle-link">Open diary <ArrowRight size={14} /></Link></div>{data?.has_logs ? <div className="meal-list">{meals.map(({ key, label, emoji }) => { const entries = data.meals[key] ?? []; const calories = data.meal_totals[key]?.calories ?? 0; return <div className="meal-row" key={key}><span className="meal-emoji">{emoji}</span><div className="meal-row-main"><strong>{label}</strong><span>{entries.length ? entries.slice(0, 2).map((entry: FoodLog) => entry.food_name).join(', ') : 'Nothing logged yet'}</span></div><span className="meal-row-calories">{entries.length ? `${Math.round(calories ?? 0)} kcal` : '—'}</span><Link to="/diary" className="meal-add" aria-label={`View ${label}`}><Plus size={16} /></Link></div>})}</div> : <EmptyState title="Your day is a blank page" body="Start by adding a meal to your diary. Your dashboard will update as you log." action={<Link to="/foods" className="button button-secondary">Search foods <ArrowRight size={15} /></Link>} />}</Card>
    <Card className="hydration-card"><div className="card-heading"><div><p className="eyebrow">Hydration</p><h2>A sip at a time</h2></div><span className="water-icon"><Droplets size={18} /></span></div><div className="water-total"><strong>{(water / 1000).toFixed(1)}</strong><span>litres logged</span><small>of {(waterGoal / 1000).toFixed(1)} L personal goal</small></div><ProgressBar value={waterGoal ? water / waterGoal * 100 : 0} color="blue" /><div className="water-controls"><Input aria-label="Water amount in millilitres" type="number" min="1" max="5000" step="50" value={waterAmount} onChange={(event) => setWaterAmount(Number(event.target.value))} /><span>ml</span><Button onClick={() => waterMutation.mutate()} disabled={waterMutation.isPending || waterAmount <= 0}><Plus size={15} /> Add water</Button></div>{(waterMutation.error || removeWaterMutation.error) && <p className="inline-error">{waterMutation.error?.message || removeWaterMutation.error?.message}</p>}<div className="water-entry-list">{waterQuery.data?.items.slice(-3).map((entry) => <span className="water-entry-chip" key={entry.id}>{entry.quantity_ml} ml<button aria-label={`Undo ${entry.quantity_ml} ml water entry`} onClick={() => removeWaterMutation.mutate(entry.id)}>×</button></span>)}</div><small className="fine-print">Your goal is personal and can be changed in settings.</small></Card></section>
    <div className="quick-actions"><span>Ready for what’s next?</span><Link to="/foods"><SearchIcon /> Log food</Link><Link to="/meal-planner"><Sparkles size={15} /> Plan a meal</Link><Link to="/analytics"><Activity size={15} /> Review patterns</Link></div>
    <p className="page-disclaimer">Nutrition information is for general tracking only. It is not medical advice.</p>
  </div>
}

function weekStart(dateValue: string): string {
  const date = new Date(`${dateValue}T12:00:00`)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return localDateKey(date)
}

function SearchIcon() { return <ArrowRight size={15} /> }

