import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowRight, Check, Search, Star, Utensils } from 'lucide-react'
import { api } from '../lib/api'
import { localDateKey, prettyNutrient } from '../lib/utils'
import type { Food, FoodLog } from '../types'
import { Button, Card, EmptyState, ErrorNotice, Field, Input, PageHeading, Select } from '../components/ui'

type Favorite = { id: string; reference_id: string; favorite_type: 'food' | 'recipe' }
const customSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100),
  category: z.string().max(60),
  calories: nutrientString(),
  protein: nutrientString(),
  carbohydrates: nutrientString(),
  fat: nutrientString(),
  fiber: nutrientString(),
}).refine((value) => Object.values(value).slice(2).some((item) => item !== ''), { message: 'Enter at least one value from a reliable label or source.', path: ['calories'] })

function nutrientString() {
  return z.string().refine((input) => input === '' || (Number(input) >= 0 && Number(input) <= 10000), 'Enter a non-negative numeric value.')
}

type CustomValues = z.infer<typeof customSchema>

export function FoodsPage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [meal, setMeal] = useState<FoodLog['meal_category']>('snacks')
  const [notice, setNotice] = useState('')
  const queryClient = useQueryClient()
  const foodsQuery = useQuery({ queryKey: ['foods', query], queryFn: () => api.get<{ items: Food[]; query: string }>(`/api/foods/search?q=${encodeURIComponent(query)}&limit=30`), enabled: query.trim().length >= 2, retry: false })
  const favoritesQuery = useQuery({ queryKey: ['favorites', 'food'], queryFn: async () => {
    const { items } = await api.get<{ items: Favorite[] }>('/api/favorites?favorite_type=food')
    return Promise.all(items.map(async (favorite) => {
      try { return { ...favorite, food: await api.get<Food>(`/api/foods/${encodeURIComponent(favorite.reference_id)}`) } }
      catch { return { ...favorite, food: null } }
    }))
  } })
  const addMutation = useMutation({ mutationFn: () => api.post('/api/food-logs', { food_id: selected?.id, quantity_g: grams, meal_category: meal, date: localDateKey() }), onSuccess: () => { setNotice(`${selected?.name} added to your ${meal} diary.`); void queryClient.invalidateQueries({ queryKey: ['logs'] }); void queryClient.invalidateQueries({ queryKey: ['daily'] }); void queryClient.invalidateQueries({ queryKey: ['weekly'] }) } })
  const favoriteMutation = useMutation({ mutationFn: (favoriteId?: string) => favoriteId ? api.delete(`/api/favorites/${favoriteId}`) : api.post('/api/favorites', { reference_id: selected?.id, favorite_type: 'food' }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', 'food'] }) })
  const customMutation = useMutation({ mutationFn: (value: CustomValues) => api.post<Food>('/api/foods/custom', {
    name: value.name,
    category: value.category || 'Custom',
    nutrients: { calories: numberOrNull(value.calories), protein: numberOrNull(value.protein), carbohydrates: numberOrNull(value.carbohydrates), fat: numberOrNull(value.fat), fiber: numberOrNull(value.fiber) },
  }), onSuccess: async (food) => { await queryClient.invalidateQueries({ queryKey: ['foods'] }); setQuery(food.name); setSelected(food); setGrams(100); setNotice('Custom food saved to your private catalog.') } })
  const results = foodsQuery.data?.items ?? []
  const selectedFavorite = favoritesQuery.data?.find((item) => item.reference_id === selected?.id)
  const addFood = (food: Food) => { setSelected(food); setNotice(''); setGrams(food.reference_quantity || 100) }

  return <div className="page-stack"><PageHeading eyebrow="Food data with a source" title="Find a food" description="Search sourced food records or add a value from a reliable label. Choose a gram quantity to log it." />
    <Card className="food-search-card"><form className="search-bar" onSubmit={(event) => event.preventDefault()}><Search size={19} /><Input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null) }} placeholder="Try “idli” or “rice”" aria-label="Search foods" /><span>Search as you type</span></form><div className="search-meta"><span>FoodData Central references</span><span>Quantities entered in grams</span><span>Private custom foods</span></div></Card>
    {favoritesQuery.error && <ErrorNotice message={favoritesQuery.error.message} />}
    {favoritesQuery.data?.length ? <section className="favorites-section"><div className="macro-section-heading"><div><p className="eyebrow">Your collection</p><h2>Favorite foods</h2></div></div><div className="favorite-list">{favoritesQuery.data.map((favorite) => <div className="favorite-row" key={favorite.id}>{favorite.food ? <button className="favorite-row-main" onClick={() => addFood(favorite.food!)}><strong>{favorite.food.name}</strong><small>{prettyNutrient(favorite.food.nutrients.calories, ' kcal')} per 100 g</small></button> : <span className="favorite-row-main"><strong>Saved food unavailable</strong><small>The catalog record may have been removed.</small></span>}<button className="icon-button danger-icon" aria-label={`Remove favorite ${favorite.food?.name ?? favorite.reference_id}`} onClick={() => favoriteMutation.mutate(favorite.id)} disabled={favoriteMutation.isPending}><Star size={15} fill="currentColor" /></button></div>)}</div></section> : null}
    {foodsQuery.error && <ErrorNotice message={foodsQuery.error.message} />}
    {query.trim().length < 2 ? <Card className="catalog-intro"><div className="catalog-icon"><Utensils size={19} /></div><div><h2>Start with a food name</h2><p>The bundled reference catalog contains a small number of sourced records. Configure a USDA FoodData Central key on the backend for broader search. Missing nutrients remain blank rather than being shown as zero.</p></div></Card> : foodsQuery.isLoading ? <div className="loading-row">Searching reference foods…</div> : results.length === 0 ? <Card><EmptyState title="No matching food found" body="Try a broader search term. If the FoodData Central key is not configured, only the small local catalog is searchable." /></Card> : <div className="food-results">{results.map((food) => <button key={food.id} type="button" className={`food-result ${selected?.id === food.id ? 'food-result-selected' : ''}`} onClick={() => addFood(food)}><span className="food-result-icon"><Utensils size={17} /></span><span className="food-result-main"><strong>{food.name}</strong><small>{food.category} · {food.data_quality}</small></span><span className="food-result-kcal">{prettyNutrient(food.nutrients.calories, ' kcal')}<small>per 100 g</small></span><span className="food-check">{selected?.id === food.id ? <Check size={17} /> : <ArrowRight size={16} />}</span></button>)}</div>}
    <details className="custom-food-details"><summary>Add a custom food <span>Use values from a package label or trusted source</span></summary><CustomFoodForm onSave={(value) => customMutation.mutateAsync(value)} pending={customMutation.isPending} error={customMutation.error?.message} /></details>
    {selected && <Card className="food-add-panel"><div className="food-add-title"><div><p className="eyebrow">Selected food record</p><h2>{selected.name}</h2><span>{selected.source} · {selected.source_id}</span></div><div className="food-title-actions"><button className="favorite-button" onClick={() => favoriteMutation.mutate(selectedFavorite?.id)} disabled={favoriteMutation.isPending} aria-label={selectedFavorite ? 'Remove from favorites' : 'Save to favorites'}><Star size={15} fill={selectedFavorite ? 'currentColor' : 'none'} /> {selectedFavorite ? 'Saved' : 'Save favorite'}</button><button className="text-link" onClick={() => setSelected(null)}>Change</button></div></div><div className="food-nutrient-strip">{[{ label: 'Energy', value: selected.nutrients.calories, unit: ' kcal' }, { label: 'Protein', value: selected.nutrients.protein, unit: ' g' }, { label: 'Carbs', value: selected.nutrients.carbohydrates, unit: ' g' }, { label: 'Fat', value: selected.nutrients.fat, unit: ' g' }, { label: 'Fiber', value: selected.nutrients.fiber, unit: ' g' }].map((n) => <div key={n.label}><span>{n.label}</span><strong>{prettyNutrient(n.value, n.unit)}</strong></div>)}</div><div className="food-add-form"><Field label="Quantity" hint={`Reference values are per ${selected.reference_quantity} g`}><div className="quantity-input"><Input type="number" min="0.1" max="5000" step="1" value={grams} onChange={(event) => setGrams(Number(event.target.value))} /><span>g</span></div></Field><Field label="Meal"><Select value={meal} onChange={(event) => setMeal(event.target.value as FoodLog['meal_category'])}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="snacks">Snacks</option><option value="dinner">Dinner</option></Select></Field><Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || grams <= 0}>{addMutation.isPending ? 'Adding…' : 'Add to diary'} <ArrowRight size={15} /></Button></div>{addMutation.error && <p className="inline-error">{addMutation.error.message}</p>}{favoriteMutation.error && <p className="inline-error">{favoriteMutation.error.message}</p>}{notice && <div className="notice notice-success" role="status">{notice} <Link to="/diary">Open diary</Link></div>}<p className="data-quality-note">Reference values vary by preparation and portion. The log saves a snapshot of these values.</p></Card>}
  </div>
}

function CustomFoodForm({ onSave, pending, error }: { onSave: (value: CustomValues) => Promise<unknown>; pending: boolean; error?: string }) {
  const form = useForm<CustomValues>({ resolver: zodResolver(customSchema), defaultValues: { name: '', category: '', calories: '', protein: '', carbohydrates: '', fat: '', fiber: '' } })
  return <form className="custom-food-form" onSubmit={form.handleSubmit(async (values) => { await onSave(values); form.reset() })}>
    <div className="custom-food-fields"><Field label="Food name" error={form.formState.errors.name?.message}><Input {...form.register('name')} placeholder="e.g. Homemade paneer" /></Field><Field label="Category"><Input {...form.register('category')} placeholder="e.g. Dairy" /></Field>{[{ key: 'calories' as const, label: 'Energy · kcal' }, { key: 'protein' as const, label: 'Protein · g' }, { key: 'carbohydrates' as const, label: 'Carbs · g' }, { key: 'fat' as const, label: 'Fat · g' }, { key: 'fiber' as const, label: 'Fiber · g' }].map(({ key, label }) => <Field key={key} label={label} error={form.formState.errors[key]?.message}><Input inputMode="decimal" placeholder="Optional" {...form.register(key)} /></Field>)}</div>{form.formState.errors.calories?.message && <p className="field-error">{form.formState.errors.calories.message}</p>}{error && <ErrorNotice message={error} />}<div className="custom-food-footer"><small>Saved privately to your account, per 100 g. Missing nutrients stay blank.</small><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save custom food'} <Check size={14} /></Button></div>
  </form>
}

function numberOrNull(value: string): number | null { return value.trim() === '' ? null : Number(value) }

