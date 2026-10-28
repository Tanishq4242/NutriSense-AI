import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { localDateKey, prettyDate, prettyNutrient } from '../lib/utils'
import type { DailySummary, FoodLog } from '../types'
import { Button, Card, EmptyState, ErrorNotice, Input, PageHeading, Select } from '../components/ui'

const mealNames: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' }

export function DiaryPage() {
  const [dateKey, setDateKey] = useState(localDateKey())
  const [editing, setEditing] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(100)
  const [mealCategory, setMealCategory] = useState<FoodLog['meal_category']>('snacks')
  const queryClient = useQueryClient()
  const logsQuery = useQuery({ queryKey: ['logs', dateKey], queryFn: () => api.get<{ items: FoodLog[]; date: string }>(`/api/food-logs?date=${dateKey}`) })
  const dailyQuery = useQuery({ queryKey: ['daily', dateKey], queryFn: () => api.get<DailySummary>(`/api/analytics/daily?date=${dateKey}`) })
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['logs', dateKey] }); void queryClient.invalidateQueries({ queryKey: ['daily', dateKey] }); void queryClient.invalidateQueries({ queryKey: ['weekly'] }) }
  const editMutation = useMutation({ mutationFn: ({ id, grams, meal }: { id: string; grams: number; meal: string }) => api.put(`/api/food-logs/${id}`, { quantity_g: grams, meal_category: meal }), onSuccess: () => { setEditing(null); invalidate() } })
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.delete(`/api/food-logs/${id}`), onSuccess: invalidate })
  const copyMutation = useMutation({ mutationFn: (sourceDate: string) => api.post<{ count: number }>('/api/food-logs/copy', { source_date: sourceDate, target_date: dateKey }), onSuccess: invalidate })
  const items = logsQuery.data?.items ?? []
  const grouped = Object.entries(mealNames).map(([key, label]) => [key, label, items.filter((item) => item.meal_category === key)] as const)

  return <div className="page-stack"><PageHeading eyebrow="A clear record, not a perfect one" title="Food diary" description="Review, edit, and organize what you’ve logged." action={<Link to="/foods" className="button button-primary"><Plus size={16} /> Add food</Link>} />
    <div className="diary-date-row"><label className="date-control"><span>Diary date</span><Input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} /></label><div className="day-summary"><span>{prettyDate(dateKey, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span><strong>{Math.round(dailyQuery.data?.totals.calories ?? 0).toLocaleString()} <small>kcal</small></strong><span>{dailyQuery.data?.logged_entry_count ?? 0} entries</span></div></div>
    {(logsQuery.error || dailyQuery.error) && <ErrorNotice message="Your diary could not be loaded. Check the backend connection and try again." />}
    {items.length === 0 && !logsQuery.isLoading ? <Card><EmptyState title="Nothing logged for this day" body="Search the food catalog to add a meal. You can also copy another day’s entries." action={<><Link to="/foods" className="button button-primary"><Plus size={15} /> Search foods</Link><button className="subtle-link copy-action" onClick={() => { const source = window.prompt('Copy entries from which date? (YYYY-MM-DD)'); if (source) copyMutation.mutate(source) }}><Copy size={14} /> Copy a previous day</button></>} /></Card> : <div className="diary-meals">{grouped.map(([key, label, entries]) => <Card className="diary-meal-card" key={key}><div className="diary-meal-heading"><div className="diary-meal-name"><span className={`meal-dot meal-dot-${key}`} /> <h2>{label}</h2><small>{entries.length} {entries.length === 1 ? 'item' : 'items'}</small></div><div className="diary-meal-total"><span>Meal total</span><strong>{Math.round(dailyQuery.data?.meal_totals[key]?.calories ?? 0)} <small>kcal</small></strong></div></div>{entries.length ? <div className="diary-entry-list">{entries.map((entry) => <div key={entry.id} className="diary-entry"><div className="diary-entry-info"><strong>{entry.food_name}</strong><span>{entry.quantity_g} g · {prettyNutrient(entry.nutrition_snapshot.calories, ' kcal')} · {prettyNutrient(entry.nutrition_snapshot.protein)} protein</span><small>{entry.source || 'Source unavailable'} · {entry.data_quality || 'quality not specified'}</small></div>{editing === entry.id ? <div className="entry-edit"><Input type="number" min="0.1" max="5000" step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} aria-label="Quantity in grams" /><Select value={mealCategory} onChange={(event) => setMealCategory(event.target.value as FoodLog['meal_category'])}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="snacks">Snacks</option><option value="dinner">Dinner</option></Select><Button onClick={() => editMutation.mutate({ id: entry.id, grams: quantity, meal: mealCategory })}>Save</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div> : <div className="entry-actions"><button className="icon-button" title="Edit entry" aria-label={`Edit ${entry.food_name}`} onClick={() => { setQuantity(entry.quantity_g); setMealCategory(entry.meal_category); setEditing(entry.id) }}><Pencil size={15} /></button><button className="icon-button danger-icon" title="Delete entry" aria-label={`Delete ${entry.food_name}`} onClick={() => { if (window.confirm(`Remove ${entry.food_name} from this diary?`)) deleteMutation.mutate(entry.id) }}><Trash2 size={15} /></button></div>}</div>)}</div> : <div className="meal-empty">No food logged for {label.toLowerCase()}. <Link to="/foods">Add something <ArrowRight size={13} /></Link></div>}</Card>)}</div>}
    {(editMutation.error || deleteMutation.error || copyMutation.error) && <ErrorNotice message={(editMutation.error || deleteMutation.error || copyMutation.error)?.message ?? 'Action failed.'} />}
    {copyMutation.isSuccess && <div className="notice notice-success" role="status">Copied {copyMutation.data.count} food entries into {dateKey}.</div>}
    <p className="page-disclaimer">Nutrient values are snapshots from the named catalog source and may not match your exact preparation.</p>
  </div>
}

