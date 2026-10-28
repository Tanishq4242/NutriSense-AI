import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Leaf } from 'lucide-react'
import { api } from '../lib/api'
import type { Profile } from '../types'
import { Button, Card, ErrorNotice, Field, Input, Select } from '../components/ui'

const schema = z.object({
  display_name: z.string().trim().min(1, 'Your name is required.').max(80),
  age: z.string().refine((value) => !value || (Number(value) >= 13 && Number(value) <= 120), 'Enter an age from 13 to 120.'),
  height_cm: z.string().refine((value) => !value || Number(value) > 0, 'Enter a positive height.'),
  weight_kg: z.string().refine((value) => !value || Number(value) > 0, 'Enter a positive weight.'),
  measurement_system: z.enum(['metric', 'imperial']),
  dietary_preference: z.enum(['no-preference', 'vegetarian', 'vegan', 'eggetarian', 'pescatarian']),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very-active']),
  goal: z.enum(['maintain', 'lose', 'gain', 'recomposition', 'general']),
  allergies: z.string(),
  foods_to_avoid: z.string(),
  preferred_cuisine: z.string().max(80),
  budget_preference: z.enum(['any', 'low', 'moderate']),
  calorie_target: z.string().refine((value) => !value || (Number(value) > 0 && Number(value) <= 10000), 'Use a target under 10,000 kcal.'),
  protein_target: z.string().refine((value) => !value || (Number(value) >= 0 && Number(value) <= 500), 'Use a target under 500 g.'),
  water_goal_ml: z.string().refine((value) => !value || (Number(value) >= 250 && Number(value) <= 10000), 'Choose a goal from 250 to 10,000 ml.'),
}).superRefine((values, context) => {
  const heightCm = Number(values.height_cm) * (values.measurement_system === 'imperial' ? 2.54 : 1)
  const weightKg = Number(values.weight_kg) / (values.measurement_system === 'imperial' ? 2.20462 : 1)
  if (values.height_cm && heightCm > 260) context.addIssue({ code: 'custom', path: ['height_cm'], message: 'Height must be 260 cm or less.' })
  if (values.weight_kg && weightKg > 500) context.addIssue({ code: 'custom', path: ['weight_kg'], message: 'Weight must be 500 kg or less.' })
})
type FormValues = z.infer<typeof schema>

const defaults: FormValues = { display_name: '', age: '', height_cm: '', weight_kg: '', measurement_system: 'metric', dietary_preference: 'no-preference', activity_level: 'moderate', goal: 'general', allergies: '', foods_to_avoid: '', preferred_cuisine: '', budget_preference: 'any', calorie_target: '', protein_target: '', water_goal_ml: '2000' }
const list = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

export function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/api/profile') })
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })
  const measurementSystem = form.watch('measurement_system')
  const changeMeasurementSystem = (next: FormValues['measurement_system']) => {
    if (next !== measurementSystem) {
      const height = form.getValues('height_cm')
      const weight = form.getValues('weight_kg')
      if (height) form.setValue('height_cm', String(Number((Number(height) * (next === 'imperial' ? 1 / 2.54 : 2.54)).toFixed(1))))
      if (weight) form.setValue('weight_kg', String(Number((Number(weight) * (next === 'imperial' ? 2.20462 : 1 / 2.20462)).toFixed(1))))
    }
    form.setValue('measurement_system', next)
  }
  useEffect(() => {
    const profile = profileQuery.data
    if (!profile) return
    form.reset({ ...defaults, display_name: profile.display_name || '', age: profile.age == null ? '' : String(profile.age), height_cm: profile.height_cm == null ? '' : String(profile.measurement_system === 'imperial' ? Number((profile.height_cm / 2.54).toFixed(1)) : profile.height_cm), weight_kg: profile.weight_kg == null ? '' : String(profile.measurement_system === 'imperial' ? Number((profile.weight_kg * 2.20462).toFixed(1)) : profile.weight_kg), measurement_system: profile.measurement_system || 'metric', dietary_preference: (profile.dietary_preference as FormValues['dietary_preference']) || 'no-preference', activity_level: (profile.activity_level as FormValues['activity_level']) || 'moderate', goal: (profile.goal as FormValues['goal']) || 'general', allergies: profile.allergies?.join(', ') || '', foods_to_avoid: profile.foods_to_avoid?.join(', ') || '', preferred_cuisine: profile.preferred_cuisine || '', budget_preference: profile.budget_preference || 'any', calorie_target: profile.targets?.calories ? String(profile.targets.calories) : '', protein_target: profile.targets?.protein ? String(profile.targets.protein) : '', water_goal_ml: String(profile.water_goal_ml || 2000) })
    if (profile.onboarding_complete) navigate('/dashboard', { replace: true })
  }, [profileQuery.data, form, navigate])
  const saveMutation = useMutation({ mutationFn: (values: FormValues) => api.put('/api/profile', {
    display_name: values.display_name,
    age: values.age ? Number(values.age) : null,
    height_cm: values.height_cm ? Number(values.height_cm) * (values.measurement_system === 'imperial' ? 2.54 : 1) : null,
    weight_kg: values.weight_kg ? Number(values.weight_kg) / (values.measurement_system === 'imperial' ? 2.20462 : 1) : null,
    measurement_system: values.measurement_system,
    dietary_preference: values.dietary_preference,
    activity_level: values.activity_level,
    goal: values.goal,
    allergies: list(values.allergies),
    foods_to_avoid: list(values.foods_to_avoid),
    preferred_cuisine: values.preferred_cuisine,
    budget_preference: values.budget_preference,
    calorie_target: values.calorie_target ? Number(values.calorie_target) : null,
    protein_target: values.protein_target ? Number(values.protein_target) : null,
    water_goal_ml: Number(values.water_goal_ml || 2000),
    onboarding_complete: true,
  }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['profile'] }); navigate('/dashboard', { replace: true }) } })
  const submit = form.handleSubmit(async (values) => { setError(''); try { await saveMutation.mutateAsync(values) } catch (err) { setError(err instanceof Error ? err.message : 'Could not save your profile.') } })

  return <main className="onboarding-page"><header className="onboarding-header"><button onClick={() => navigate(-1)} className="back-link"><ArrowLeft size={15} /> Back</button><span className="landing-brand"><span className="brand-mark"><Leaf size={18} /></span>nutrisense<span className="brand-dot">.</span></span><span className="step-label">A few details · Step 1 of 1</span></header><div className="onboarding-wrap"><div className="onboarding-intro"><p className="eyebrow">Make it yours</p><h1>What would be useful<br />for us to know?</h1><p>These details help personalize targets and meal ideas. You can skip nonessential fields or change everything later.</p></div>{profileQuery.error && <ErrorNotice message={profileQuery.error.message} />}{error && <ErrorNotice message={error} />}<Card className="onboarding-card"><form onSubmit={submit} className="profile-form"><div className="form-section"><div><h2>About you</h2><p>Your basic profile and measurement preferences.</p></div><div className="form-grid"><Field label="Display name" error={form.formState.errors.display_name?.message}><Input placeholder="Your name" {...form.register('display_name')} /></Field><Field label="Age (optional)" error={form.formState.errors.age?.message}><Input inputMode="numeric" placeholder="Years" {...form.register('age')} /></Field><Field label={measurementSystem === 'imperial' ? "Height in inches (optional)" : "Height in centimetres (optional)"} error={form.formState.errors.height_cm?.message}><Input inputMode="decimal" placeholder={measurementSystem === 'imperial' ? "e.g. 67" : "e.g. 170"} {...form.register('height_cm')} /></Field><Field label={measurementSystem === 'imperial' ? "Weight in pounds (optional)" : "Weight in kilograms (optional)"} error={form.formState.errors.weight_kg?.message}><Input inputMode="decimal" placeholder={measurementSystem === 'imperial' ? "e.g. 150" : "e.g. 68"} {...form.register('weight_kg')} /></Field><Field label="Measurement units"><Select value={measurementSystem} onChange={(event) => changeMeasurementSystem(event.target.value as FormValues['measurement_system'])}><option value="metric">Metric · cm, kg</option><option value="imperial">Imperial · in, lb</option></Select></Field></div></div><div className="form-section"><div><h2>Preferences</h2><p>Use these to filter meal suggestions.</p></div><div className="form-grid"><Field label="Dietary preference"><Select {...form.register('dietary_preference')}><option value="no-preference">No preference</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="eggetarian">Eggetarian</option><option value="pescatarian">Pescatarian</option></Select></Field><Field label="Foods you’re allergic to" hint="Separate items with commas"><Input placeholder="e.g. peanuts, milk" {...form.register('allergies')} /></Field><Field label="Foods to avoid" hint="Separate items with commas"><Input placeholder="Optional" {...form.register('foods_to_avoid')} /></Field><Field label="Preferred cuisine"><Input placeholder="e.g. South Indian" {...form.register('preferred_cuisine')} /></Field><Field label="Budget preference"><Select {...form.register('budget_preference')}><option value="any">No budget preference</option><option value="low">Lower cost</option><option value="moderate">Moderate</option></Select></Field><Field label="Activity level"><Select {...form.register('activity_level')}><option value="sedentary">Mostly sitting</option><option value="light">Light activity</option><option value="moderate">Moderate activity</option><option value="active">Active</option><option value="very-active">Very active</option></Select></Field><Field label="Nutrition goal"><Select {...form.register('goal')}><option value="general">General tracking</option><option value="maintain">Maintain</option><option value="lose">Weight loss</option><option value="gain">Muscle gain</option><option value="recomposition">Body recomposition</option></Select></Field></div></div><div className="form-section"><div><h2>Your tracking targets</h2><p>Optional personal targets. These are not medical recommendations.</p></div><div className="form-grid"><Field label="Daily calorie target" error={form.formState.errors.calorie_target?.message}><div className="quantity-input"><Input inputMode="numeric" placeholder="e.g. 2000" {...form.register('calorie_target')} /><span>kcal</span></div></Field><Field label="Daily protein target" error={form.formState.errors.protein_target?.message}><div className="quantity-input"><Input inputMode="numeric" placeholder="e.g. 75" {...form.register('protein_target')} /><span>g</span></div></Field><Field label="Water tracking goal" error={form.formState.errors.water_goal_ml?.message}><div className="quantity-input"><Input inputMode="numeric" {...form.register('water_goal_ml')} /><span>ml</span></div></Field></div></div><div className="onboarding-actions"><span>Optional fields can be left blank.</span><Button type="submit" disabled={saveMutation.isPending || profileQuery.isLoading}>{saveMutation.isPending ? 'Saving…' : 'Save and continue'} <ArrowRight size={16} /></Button></div></form></Card><p className="page-disclaimer">Your goals are for tracking only. For personalized nutrition advice, consult a qualified professional.</p></div></main>
}

