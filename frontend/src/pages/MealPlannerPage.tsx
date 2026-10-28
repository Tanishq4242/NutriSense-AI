import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownRight, ArrowRight, Clock3, Save, Sparkles, Utensils } from 'lucide-react'
import { api } from '../lib/api'
import type { MealPlan, Profile } from '../types'
import { Button, Card, EmptyState, ErrorNotice, Field, Input, PageHeading, Select } from '../components/ui'
import { localDateKey, prettyNutrient } from '../lib/utils'

type SavedPlan = { id: string; name: string; created_at: string; plan: MealPlan }

export function MealPlannerPage() {
  const queryClient = useQueryClient()
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [diet, setDiet] = useState('no-preference')
  const [allergies, setAllergies] = useState('')
  const [avoid, setAvoid] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [budget, setBudget] = useState<Profile['budget_preference']>('any')
  const [maxPrep, setMaxPrep] = useState('')
  const [mealCount, setMealCount] = useState(3)
  const [notice, setNotice] = useState('')
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/api/profile') })
  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: () => api.get<{ items: SavedPlan[] }>('/api/meal-plans') })
  useEffect(() => {
    if (!profileQuery.data) return
    setDiet(profileQuery.data.dietary_preference || 'no-preference')
    setAllergies(profileQuery.data.allergies?.join(', ') || '')
    setAvoid(profileQuery.data.foods_to_avoid?.join(', ') || '')
    setCuisine(profileQuery.data.preferred_cuisine || '')
    setBudget(profileQuery.data.budget_preference || 'any')
  }, [profileQuery.data])
  const generateMutation = useMutation({ mutationFn: () => api.post<MealPlan>('/api/meal-plans/generate', { calorie_target: profileQuery.data?.targets?.calories ?? 2000, protein_target: profileQuery.data?.targets?.protein ?? 75, dietary_preference: diet, allergies: split(allergies), foods_to_avoid: split(avoid), preferred_cuisine: cuisine, meal_count: mealCount, budget_preference: budget, max_prep_minutes: maxPrep ? Number(maxPrep) : null }), onSuccess: (result) => { setPlan(result); setNotice('') } })
  const saveMutation = useMutation({ mutationFn: () => api.post<SavedPlan>('/api/meal-plans', { name: `Meal plan · ${new Date().toLocaleDateString()}`, plan }), onSuccess: (saved) => { setNotice(`Saved “${saved.name}”.`); void queryClient.invalidateQueries({ queryKey: ['plans'] }) } })
  const copyMutation = useMutation({ mutationFn: (planId: string) => api.post<{ count: number }>(`/api/meal-plans/${planId}/copy-to-diary`, { date: localDateKey() }), onSuccess: (result) => { setNotice(`Added ${result.count} foods to today’s diary.`); void queryClient.invalidateQueries({ queryKey: ['logs'] }); void queryClient.invalidateQueries({ queryKey: ['daily'] }) } })
  const profile = profileQuery.data

  return <div className="page-stack"><PageHeading eyebrow="Plan around your preferences" title="Meal planner" description="See why an option fits and where a plan differs from your configured targets." />
    {profileQuery.error && <ErrorNotice message={profileQuery.error.message} />}
    <div className="planner-layout"><Card className="planner-controls"><div className="card-heading"><div><p className="eyebrow">Your plan inputs</p><h2>Start with your settings</h2></div><Sparkles size={19} className="planner-spark" /></div><p className="muted planner-note">Target: <strong>{profile?.targets?.calories ?? 2000} kcal</strong> · Protein: <strong>{profile?.targets?.protein ?? 75} g</strong>. Update these in your profile.</p><div className="planner-form"><Field label="Diet style"><Select value={diet} onChange={(event) => setDiet(event.target.value)}><option value="no-preference">No preference</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="eggetarian">Eggetarian</option><option value="pescatarian">Pescatarian</option></Select></Field><Field label="Allergies" hint="Comma separated; candidates with unknown allergen data are excluded"><Input value={allergies} onChange={(event) => setAllergies(event.target.value)} placeholder="e.g. peanuts, milk" /></Field><Field label="Foods to avoid" hint="Comma separated"><Input value={avoid} onChange={(event) => setAvoid(event.target.value)} placeholder="Optional" /></Field><Field label="Preferred cuisine"><Input value={cuisine} onChange={(event) => setCuisine(event.target.value)} placeholder="e.g. Indian" /></Field><Field label="Budget"><Select value={budget} onChange={(event) => setBudget(event.target.value as Profile['budget_preference'])}><option value="any">No preference</option><option value="low">Lower cost</option><option value="moderate">Moderate</option></Select></Field><Field label="Number of meals"><Select value={mealCount} onChange={(event) => setMealCount(Number(event.target.value))}><option value={2}>2 meals</option><option value={3}>3 meals</option><option value={4}>4 meals</option><option value={5}>5 meals</option></Select></Field><Field label="Maximum cooking time"><Select value={maxPrep} onChange={(event) => setMaxPrep(event.target.value)}><option value="">Any time</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></Select></Field><Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}><Sparkles size={16} /> {generateMutation.isPending ? 'Finding eligible options…' : 'Generate plan'}</Button></div>{generateMutation.error && <p className="inline-error">{generateMutation.error.message}</p>}</Card>
    <div className="planner-results">{plan ? <><Card className="plan-summary"><div className="plan-summary-top"><div><p className="eyebrow">Generated plan</p><h2>Your options, with context</h2></div><Button variant="secondary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}><Save size={15} /> Save plan</Button></div><p>{plan.explanation}</p><div className="plan-totals"><div><span>Plan energy</span><strong>{prettyNutrient(plan.total.calories, ' kcal')}</strong><small>{plan.deviation?.calories != null ? `${plan.deviation.calories > 0 ? '+' : ''}${plan.deviation.calories} kcal vs target` : 'Target deviation unavailable'}</small></div><div><span>Plan protein</span><strong>{prettyNutrient(plan.total.protein)}</strong><small>{plan.deviation?.protein != null ? `${plan.deviation.protein > 0 ? '+' : ''}${plan.deviation.protein} g vs target` : 'Target deviation unavailable'}</small></div></div></Card>{plan.meals.length ? plan.meals.map((meal, index) => <Card className="suggestion-card" key={meal.id}><div className="suggestion-index">0{index + 1}</div><div className="suggestion-main"><div className="suggestion-top"><div><span className="suggestion-category">{meal.meal_category}</span><h3>{meal.name}</h3></div><span className="suggestion-score">Fit {meal.score}</span></div><div className="suggestion-nutrients"><span>{prettyNutrient(meal.nutrition.calories, ' kcal')}</span><span>{prettyNutrient(meal.nutrition.protein)} protein</span><span>{prettyNutrient(meal.nutrition.carbohydrates)} carbs</span><span>{prettyNutrient(meal.nutrition.fat)} fat</span></div><p><Sparkles size={14} /> {meal.explanation}</p><small>{meal.source}</small></div></Card>) : <Card><EmptyState title="No options meet these restrictions" body="The current starter recipe set is small and its ingredient/allergen data is incomplete. Try fewer restrictions or configure a broader verified catalog." /></Card>}</> : <Card className="planner-placeholder"><div className="planner-placeholder-icon"><Utensils size={21} /></div><h2>A plan you can inspect</h2><p>Generate a meal plan to see candidates ranked against your remaining calorie and protein targets. Hard dietary and allergy filters always take precedence.</p><div className="planner-placeholder-meta"><span><ArrowDownRight size={15} /> Actual nutrient totals</span><span><Sparkles size={15} /> A reason for each suggestion</span><span><Clock3 size={15} /> Repeat avoidance</span></div></Card>}
    </div></div>
    {notice && <div className="notice notice-success" role="status">{notice}</div>}{saveMutation.error && <ErrorNotice message={saveMutation.error.message} />}{copyMutation.error && <ErrorNotice message={copyMutation.error.message} />}
    <section className="saved-plans-section"><div className="macro-section-heading"><div><p className="eyebrow">Your library</p><h2>Saved meal plans</h2></div></div>{plansQuery.error && <ErrorNotice message={plansQuery.error.message} />}{plansQuery.data?.items.length ? <div className="saved-plan-list">{plansQuery.data.items.map((saved) => <div className="saved-plan-row" key={saved.id}><span className="saved-plan-icon"><Utensils size={17} /></span><div><strong>{saved.name}</strong><small>{saved.plan.meals.length} options · {prettyNutrient(saved.plan.total.calories, ' kcal')} · {new Date(saved.created_at).toLocaleDateString()}</small></div><Button variant="secondary" onClick={() => copyMutation.mutate(saved.id)} disabled={copyMutation.isPending}><ArrowRight size={15} /> Copy to diary</Button></div>)}</div> : <p className="muted">Saved plans will appear here.</p>}</section>
  </div>
}

function split(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean) }

