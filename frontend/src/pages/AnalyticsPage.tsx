import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react'
import { api } from '../lib/api'
import { localDateKey, prettyDate } from '../lib/utils'
import type { WeeklySummary } from '../types'
import { Card, EmptyState, ErrorNotice, PageHeading, Stat } from '../components/ui'

function monday(date: Date) { const clone = new Date(date); clone.setDate(clone.getDate() - ((clone.getDay() + 6) % 7)); return localDateKey(clone) }

export function AnalyticsPage() {
  const [start, setStart] = useState(monday(new Date()))
  const query = useQuery({ queryKey: ['weekly', start], queryFn: () => api.get<WeeklySummary>(`/api/analytics/weekly?start_date=${start}`) })
  const insightsQuery = useQuery({ queryKey: ['insights', start], queryFn: () => api.get<{ method: string; insights: { id: string; title: string; detail: string; basis: string }[]; disclaimer: string }>(`/api/insights/weekly?start_date=${start}`) })
  const days = query.data?.days ?? []
  const chart = days.map((day) => ({ day: prettyDate(day.date, { weekday: 'short' }), calories: day.calories, protein: day.protein, tracked: day.has_logs }))
  const move = (amount: number) => { const date = new Date(`${start}T12:00:00`); date.setDate(date.getDate() + amount * 7); setStart(localDateKey(date)) }
  const hasLogs = (query.data?.logged_days ?? 0) > 0
  return <div className="page-stack"><PageHeading eyebrow="Your records, over time" title="Nutrition analytics" description="Review trends from days you logged. Missing days stay missing instead of being counted as zero." action={<div className="week-selector"><button className="icon-button" onClick={() => move(-1)} aria-label="Previous week"><ArrowLeft size={16} /></button><span><CalendarDays size={15} /> Week of {prettyDate(start, { month: 'short', day: 'numeric' })}</span><button className="icon-button" onClick={() => move(1)} aria-label="Next week"><ArrowRight size={16} /></button></div>} />
    {query.error && <ErrorNotice message={query.error.message} />}
    {insightsQuery.error && <ErrorNotice message={insightsQuery.error.message} />}
    <div className="analytics-stats"><Stat label="Days with logs" value={`${query.data?.logged_days ?? '—'} / 7`} sub="This selected week" icon={<CalendarDays size={17} />} /><Stat label="Average logged calories" value={query.data?.average_calories == null ? '—' : `${Math.round(query.data.average_calories).toLocaleString()} kcal`} sub="Logged days only" icon={<span>◒</span>} /><Stat label="Average recorded protein" value={query.data?.average_protein == null ? '—' : `${Math.round(query.data.average_protein)} g`} sub="Missing values excluded" icon={<span>✳</span>} /></div>
    {insightsQuery.data?.insights.map((insight) => <Card className="insight-card" key={insight.id}><div className="insight-glyph">✳</div><div><p className="eyebrow">Personalized tracking insight · {insightsQuery.data?.method}</p><h2>{insight.title}</h2><p>{insight.detail}</p><small>Based on: {insight.basis}</small></div></Card>)}
    {!hasLogs && !query.isLoading ? <Card><EmptyState title="Your analytics start with a food log" body="Log a few meals and come back to see daily patterns. Unlogged days are kept distinct from days with zero recorded intake." /></Card> : <><Card className="chart-card"><div className="card-heading"><div><p className="eyebrow">Energy</p><h2>Calories logged each day</h2></div><span className="chart-unit">kcal</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 14, right: 10, left: -12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ece7" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#7b837a', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#7b837a', fontSize: 12 }} /><Tooltip formatter={(value) => [value == null ? 'No data' : `${value} kcal`, 'Calories']} contentStyle={{ borderRadius: 12, borderColor: '#e5e9e2', fontSize: 12 }} /><Bar dataKey="calories" name="Calories" fill="#64816a" radius={[7, 7, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div><p className="chart-caption">Only recorded days are included. A blank column means no food log was saved for that date.</p></Card><Card className="chart-card"><div className="card-heading"><div><p className="eyebrow">Protein</p><h2>Recorded protein by day</h2></div><span className="chart-unit">grams</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ top: 14, right: 10, left: -12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ece7" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#7b837a', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#7b837a', fontSize: 12 }} /><Tooltip formatter={(value) => [value == null ? 'No data' : `${value} g`, 'Protein']} contentStyle={{ borderRadius: 12, borderColor: '#e5e9e2', fontSize: 12 }} /><Bar dataKey="protein" name="Protein" fill="#7ca4a3" radius={[7, 7, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div><p className="chart-caption">Protein is summed from available snapshots; missing nutrient values are left blank.</p></Card></>}
    <div className="notice notice-info">These charts summarize logged records, not confirmed total consumption. Use your food log and source labels when reviewing nutrient values.</div>
  </div>
}


