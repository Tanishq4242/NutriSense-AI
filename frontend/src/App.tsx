import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './app/AuthProvider'
import { api } from './lib/api'
import { firebaseConfigured } from './lib/firebase'
import type { Profile } from './types'
import { ErrorNotice, LoadingState } from './components/ui'

const AppShell = lazy(() => import('./components/AppShell').then((module) => ({ default: module.AppShell })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const AuthPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.AuthPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const DiaryPage = lazy(() => import('./pages/DiaryPage').then((module) => ({ default: module.DiaryPage })))
const FoodsPage = lazy(() => import('./pages/FoodsPage').then((module) => ({ default: module.FoodsPage })))
const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const MealPlannerPage = lazy(() => import('./pages/MealPlannerPage').then((module) => ({ default: module.MealPlannerPage })))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const ScannerPage = lazy(() => import('./pages/ScannerPage').then((module) => ({ default: module.ScannerPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function AuthRequired() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState label="Checking your session…" />
  if (!firebaseConfigured) return <Navigate to="/login" replace state={{ from: location }} />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

function ProfileRequired() {
  const { user } = useAuth()
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/api/profile'), enabled: Boolean(user) })
  if (profile.isLoading) return <LoadingState label="Loading your profile…" />
  if (profile.error) return <div className="route-error"><ErrorNotice message={profile.error instanceof Error ? profile.error.message : 'Your profile could not be loaded.'} /><button className="button button-secondary" onClick={() => profile.refetch()}>Try again</button></div>
  if (profile.data && !profile.data.onboarding_complete) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function NotFound() { return <main className="not-found"><span className="eyebrow">404 · Not found</span><h1>This page wandered off.</h1><p>Try heading back to your dashboard.</p><a className="button button-primary" href="/dashboard">Go to dashboard</a></main> }

export function App() {
  return <Suspense fallback={<LoadingState label="Opening NutriSense…" />}><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/forgot-password" element={<AuthPage mode="forgot" />} /><Route element={<AuthRequired />}><Route path="/onboarding" element={<OnboardingPage />} /><Route element={<ProfileRequired />}><Route element={<AppShell />}><Route path="/dashboard" element={<DashboardPage />} /><Route path="/diary" element={<DiaryPage />} /><Route path="/foods" element={<FoodsPage />} /><Route path="/meal-planner" element={<MealPlannerPage />} /><Route path="/food-scanner" element={<ScannerPage />} /><Route path="/analytics" element={<AnalyticsPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/settings" element={<SettingsPage />} /></Route></Route></Route><Route path="*" element={<NotFound />} /></Routes></Suspense>
}

