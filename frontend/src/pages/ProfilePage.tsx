import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Save } from 'lucide-react'
import { api } from '../lib/api'
import type { Profile } from '../types'
import { Button, Card, ErrorNotice, Field, Input, PageHeading, Select } from '../components/ui'

const schema = z.object({
  display_name: z.string().trim().min(1, 'Name is required.').max(80),
  measurement_system: z.enum(['metric', 'imperial']),
  age: z.string().refine((value) => !value || (+value >= 13 && +value <= 120), 'Age must be from 13 to 120.'),
  height_cm: z.string().refine((value) => !value || +value > 0, 'Height must be a positive number.'),
  weight_kg: z.string().refine((value) => !value || +value > 0, 'Weight must be a positive number.'),
  dietary_preference: z.enum(['no-preference', 'vegetarian', 'vegan', 'eggetarian', 'pescatarian']),
  allergies: z.string(), foods_to_avoid: z.string(), preferred_cuisine: z.string().max(80),
  budget_preference: z.enum(['any', 'low', 'moderate']),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very-active']),
  goal: z.enum(['maintain', 'lose', 'gain', 'recomposition', 'general']),
  calories: z.string().refine((value) => !value || (+value > 0 && +value <= 10000), 'Calorie target must be under 10,000.'),
  protein: z.string().refine((value) => !value || (+value >= 0 && +value <= 500), 'Protein target must be under 500 g.'),
  water_goal_ml: z.string().refine((value) => +value >= 250 && +value <= 10000, 'Water goal must be 250–10,000 ml.'),
}).superRefine((values, context) => {
  const heightCm = Number(values.height_cm) * (values.measurement_system === 'imperial' ? 2.54 : 1)
  const weightKg = Number(values.weight_kg) / (values.measurement_system === 'imperial' ? 2.20462 : 1)
  if (values.height_cm && heightCm > 260) context.addIssue({ code: 'custom', path: ['height_cm'], message: 'Height must be 260 cm or less.' })
  if (values.weight_kg && weightKg > 500) context.addIssue({ code: 'custom', path: ['weight_kg'], message: 'Weight must be 500 kg or less.' })
})
type Values = z.infer<typeof schema>
const blank: Values = { display_name: '', measurement_system: 'metric', age: '', height_cm: '', weight_kg: '', dietary_preference: 'no-preference', allergies: '', foods_to_avoid: '', preferred_cuisine: '', budget_preference: 'any', activity_level: 'moderate', goal: 'general', calories: '2000', protein: '75', water_goal_ml: '2000' }
const list = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

function profilePayload(values: Values) {
  return {
    display_name: values.display_name, age: values.age ? Number(values.age) : null, height_cm: values.height_cm ? Number(values.height_cm) * (values.measurement_system === 'imperial' ? 2.54 : 1) : null, weight_kg: values.weight_kg ? Number(values.weight_kg) / (values.measurement_system === 'imperial' ? 2.20462 : 1) : null,
    measurement_system: values.measurement_system, dietary_preference: values.dietary_preference, allergies: list(values.allergies), foods_to_avoid: list(values.foods_to_avoid), preferred_cuisine: values.preferred_cuisine, budget_preference: values.budget_preference,
    activity_level: values.activity_level, goal: values.goal, calorie_target: values.calories ? Number(values.calories) : null, protein_target: values.protein ? Number(values.protein) : null,
    water_goal_ml: Number(values.water_goal_ml), onboarding_complete: true,
  }
}

export function ProfilePage() {
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState('')
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/api/profile') })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: blank })
  const measurementSystem = form.watch('measurement_system')
  const changeMeasurementSystem = (next: Values['measurement_system']) => {
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
    form.reset({ ...blank, display_name: profile.display_name || '', measurement_system: profile.measurement_system || 'metric', age: profile.age == null ? '' : String(profile.age), height_cm: profile.height_cm == null ? '' : String(profile.measurement_system === 'imperial' ? Number((profile.height_cm / 2.54).toFixed(1)) : profile.height_cm), weight_kg: profile.weight_kg == null ? '' : String(profile.measurement_system === 'imperial' ? Number((profile.weight_kg * 2.20462).toFixed(1)) : profile.weight_kg), dietary_preference: (profile.dietary_preference as Values['dietary_preference']) || 'no-preference', allergies: profile.allergies?.join(', ') || '', foods_to_avoid: profile.foods_to_avoid?.join(', ') || '', preferred_cuisine: profile.preferred_cuisine || '', budget_preference: profile.budget_preference || 'any', activity_level: (profile.activity_level as Values['activity_level']) || 'moderate', goal: (profile.goal as Values['goal']) || 'general', calories: String(profile.targets?.calories ?? 2000), protein: String(profile.targets?.protein ?? 75), water_goal_ml: String(profile.water_goal_ml ?? 2000) })
  }, [profileQuery.data, form])
  const save = useMutation({ mutationFn: (values: Values) => api.put('/api/profile', profilePayload(values)), onSuccess: async () => { setNotice('Your profile has been updated.'); await queryClient.invalidateQueries({ queryKey: ['profile'] }); await queryClient.invalidateQueries({ queryKey: ['daily'] }); await queryClient.invalidateQueries({ queryKey: ['water'] }) } })
  return <div className="page-stack"><PageHeading eyebrow="Your information, your choices" title="Profile" description="Keep preferences and tracking targets up to date. Changing them does not alter historical food logs." />
    {profileQuery.error && <ErrorNotice message={profileQuery.error.message} />}{save.error && <ErrorNotice message={save.error.message} />}{notice && <div className="notice notice-success" role="status">{notice}</div>}
    <Card className="profile-card"><form onSubmit={form.handleSubmit((values) => { setNotice(''); save.mutate(values) })} className="profile-form"><div className="form-section"><div><h2>About you</h2><p>Optional profile details and units.</p></div><div className="form-grid"><Field label="Display name" error={form.formState.errors.display_name?.message}><Input {...form.register('display_name')} /></Field><Field label="Age" error={form.formState.errors.age?.message}><Input inputMode="numeric" {...form.register('age')} /></Field><Field label={measurementSystem === 'imperial' ? "Height · in" : "Height · cm"} error={form.formState.errors.height_cm?.message}><Input inputMode="decimal" {...form.register('height_cm')} /></Field><Field label={measurementSystem === 'imperial' ? "Weight · lb" : "Weight · kg"} error={form.formState.errors.weight_kg?.message}><Input inputMode="decimal" {...form.register('weight_kg')} /></Field><Field label="Measurement display"><Select value={measurementSystem} onChange={(event) => changeMeasurementSystem(event.target.value as Values['measurement_system'])}><option value="metric">Metric · cm, kg</option><option value="imperial">Imperial · in, lb</option></Select></Field></div></div><div className="form-section"><div><h2>Food preferences</h2><p>Used to filter meal suggestions when data allows.</p></div><div className="form-grid"><Field label="Dietary preference"><Select {...form.register('dietary_preference')}><option value="no-preference">No preference</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="eggetarian">Eggetarian</option><option value="pescatarian">Pescatarian</option></Select></Field><Field label="Allergies" hint="Comma separated"><Input {...form.register('allergies')} placeholder="e.g. peanuts, milk" /></Field><Field label="Foods to avoid" hint="Comma separated"><Input {...form.register('foods_to_avoid')} /></Field><Field label="Preferred cuisine"><Input {...form.register('preferred_cuisine')} /></Field><Field label="Budget preference"><Select {...form.register('budget_preference')}><option value="any">No budget preference</option><option value="low">Lower cost</option><option value="moderate">Moderate</option></Select></Field><Field label="Activity level"><Select {...form.register('activity_level')}><option value="sedentary">Mostly sitting</option><option value="light">Light activity</option><option value="moderate">Moderate activity</option><option value="active">Active</option><option value="very-active">Very active</option></Select></Field><Field label="Goal"><Select {...form.register('goal')}><option value="general">General tracking</option><option value="maintain">Maintain</option><option value="lose">Weight loss</option><option value="gain">Muscle gain</option><option value="recomposition">Body recomposition</option></Select></Field></div></div><div className="form-section"><div><h2>Nutrition and hydration targets</h2><p>Targets are personal settings for tracking and are not medical advice.</p></div><div className="form-grid"><Field label="Calories · kcal" error={form.formState.errors.calories?.message}><Input inputMode="numeric" {...form.register('calories')} /></Field><Field label="Protein · g" error={form.formState.errors.protein?.message}><Input inputMode="numeric" {...form.register('protein')} /></Field><Field label="Hydration · ml" error={form.formState.errors.water_goal_ml?.message}><Input inputMode="numeric" {...form.register('water_goal_ml')} /></Field></div></div><div className="form-actions"><Button type="submit" disabled={save.isPending}><Save size={15} /> {save.isPending ? 'Saving…' : 'Save changes'}</Button></div></form></Card>
  </div>
}

