import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Leaf, LockKeyhole } from 'lucide-react'
import { auth, firebaseConfigured } from '../lib/firebase'
import { Button, ErrorNotice, Field, Input } from '../components/ui'

const loginSchema = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') })
const registerSchema = z.object({ name: z.string().trim().min(1, 'Enter your name.').max(80), email: z.string().email('Enter a valid email address.'), password: z.string().min(8, 'Use at least 8 characters.') })
const resetSchema = z.object({ email: z.string().email('Enter a valid email address.') })
type Mode = 'login' | 'register' | 'forgot'

function authMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code.includes('email-already-in-use')) return 'That email already has an account. Try signing in instead.'
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'The email or password is incorrect.'
  if (code.includes('weak-password')) return 'Choose a stronger password.'
  if (code.includes('network-request-failed')) return 'Firebase could not be reached. Check your connection.'
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const heading = mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'
  const description = mode === 'register' ? 'A little more clarity starts with a few details.' : mode === 'forgot' ? 'We’ll email you a link to choose a new password.' : 'Sign in to pick up where you left off.'

  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) })
  const resetForm = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) })

  const onLogin = loginForm.handleSubmit(async (values) => {
    setError('')
    try {
      if (!auth) throw new Error('Firebase Authentication is not configured yet.')
      await signInWithEmailAndPassword(auth, values.email, values.password)
      navigate('/dashboard', { replace: true })
    } catch (err) { setError(authMessage(err)) }
  })
  const onRegister = registerForm.handleSubmit(async (values) => {
    setError('')
    try {
      if (!auth) throw new Error('Firebase Authentication is not configured yet.')
      const credential = await createUserWithEmailAndPassword(auth, values.email, values.password)
      await updateProfile(credential.user, { displayName: values.name })
      navigate('/onboarding', { replace: true })
    } catch (err) { setError(authMessage(err)) }
  })
  const onReset = resetForm.handleSubmit(async (values) => {
    setError('')
    setNotice('')
    try {
      if (!auth) throw new Error('Firebase Authentication is not configured yet.')
      await sendPasswordResetEmail(auth, values.email)
      setNotice('If an account exists for that email, a reset link is on its way.')
    } catch (err) { setError(authMessage(err)) }
  })

  return <div className="auth-layout"><aside className="auth-aside"><Link to="/" className="landing-brand"><span className="brand-mark"><Leaf size={18} /></span>nutrisense<span className="brand-dot">.</span></Link><div className="auth-aside-copy"><p className="eyebrow">A thoughtful space for your food journey</p><h2>Progress is built from small, honest notes.</h2><p>Keep a clear record of your meals and learn from patterns at your own pace.</p><div className="aside-note"><LockKeyhole size={17} /><span>Your private diary is only visible to you.</span></div></div><div className="aside-orbit orbit-one" /><div className="aside-orbit orbit-two" /><div className="auth-aside-footer">NutriSense AI <span>·</span> Information and tracking, not medical advice.</div></aside><main className="auth-main"><Link to="/" className="back-link"><ArrowLeft size={15} /> Back to home</Link><div className="auth-form-wrap"><div className="auth-heading"><div className="auth-mobile-mark"><Leaf size={19} /></div><p className="eyebrow">{mode === 'register' ? 'Get started' : mode === 'forgot' ? 'Account access' : 'Good to see you'}</p><h1>{heading}</h1><p>{description}</p></div>{!firebaseConfigured && <div className="notice notice-warn"><strong>Firebase setup needed.</strong><br />Add the Firebase web values in <code>frontend/.env.local</code> and enable Email/Password sign-in in Firebase Console. Forms are ready once configured.</div>}{error && <ErrorNotice message={error} />}{notice && <div className="notice notice-success" role="status">{notice}</div>}
      {mode === 'login' && <form onSubmit={onLogin} className="auth-form"><Field label="Email address" error={loginForm.formState.errors.email?.message}><Input autoComplete="email" type="email" placeholder="you@example.com" {...loginForm.register('email')} /></Field><Field label="Password" error={loginForm.formState.errors.password?.message}><div className="password-wrap"><Input autoComplete="current-password" type={showPassword ? 'text' : 'password'} placeholder="Your password" {...loginForm.register('password')} /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field><div className="form-between"><span /> <Link to="/forgot-password">Forgot password?</Link></div><Button type="submit" disabled={loginForm.formState.isSubmitting}>{loginForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></Button></form>}
      {mode === 'register' && <form onSubmit={onRegister} className="auth-form"><Field label="Your name" error={registerForm.formState.errors.name?.message}><Input autoComplete="name" placeholder="How should we call you?" {...registerForm.register('name')} /></Field><Field label="Email address" error={registerForm.formState.errors.email?.message}><Input autoComplete="email" type="email" placeholder="you@example.com" {...registerForm.register('email')} /></Field><Field label="Password" hint="Use at least 8 characters." error={registerForm.formState.errors.password?.message}><div className="password-wrap"><Input autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="Create a password" {...registerForm.register('password')} /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field><Button type="submit" disabled={registerForm.formState.isSubmitting}>{registerForm.formState.isSubmitting ? 'Creating account…' : 'Create account'} <ArrowRight size={16} /></Button><p className="terms-note">By continuing, you agree to use NutriSense for informational food tracking. It is not medical advice.</p></form>}
      {mode === 'forgot' && <form onSubmit={onReset} className="auth-form"><Field label="Email address" error={resetForm.formState.errors.email?.message}><Input autoComplete="email" type="email" placeholder="you@example.com" {...resetForm.register('email')} /></Field><Button type="submit" disabled={resetForm.formState.isSubmitting}>{resetForm.formState.isSubmitting ? 'Sending link…' : 'Send reset link'} <ArrowRight size={16} /></Button></form>}
      <div className="auth-switch">{mode === 'login' ? <>New to NutriSense? <Link to="/register">Create an account</Link></> : mode === 'register' ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>Remembered your password? <Link to="/login">Back to sign in</Link></>}</div></div><div className="auth-bottom">Private by design <span>·</span> For tracking and education only.</div></main></div>
}

