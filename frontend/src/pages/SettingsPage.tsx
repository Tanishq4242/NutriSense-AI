import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, ExternalLink, ShieldCheck, Trash2 } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { api } from '../lib/api'
import type { Profile } from '../types'
import { Button, Card, ErrorNotice, PageHeading } from '../components/ui'

export function SettingsPage() {
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/api/profile') })
  const deleteMutation = useMutation({ mutationFn: () => api.delete<void>('/api/account'), onSuccess: async () => { if (auth?.currentUser) await signOut(auth); await queryClient.clear(); navigate('/', { replace: true }) } })
  const exportData = async () => {
    setError(''); setNotice('')
    try {
      const data = await api.get<Record<string, unknown>>('/api/account/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `nutrisense-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setNotice('Your export has been downloaded.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Export failed.') }
  }
  const removeAccount = async () => {
    const confirmed = window.confirm('Delete your NutriSense profile, diary, water logs, and saved plans? This cannot be undone.')
    if (!confirmed) return
    setError('')
    try { await deleteMutation.mutateAsync() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Account deletion failed.') }
  }
  return <div className="page-stack"><PageHeading eyebrow="Your data, under your control" title="Settings" description="Export your application records or request deletion of your NutriSense account." />
    {profileQuery.error && <ErrorNotice message={profileQuery.error.message} />}{error && <ErrorNotice message={error} />}{deleteMutation.error && <ErrorNotice message={deleteMutation.error.message} />}{notice && <div className="notice notice-success" role="status">{notice}</div>}
    <Card className="settings-card"><div className="settings-icon green"><Download size={19} /></div><div className="settings-copy"><h2>Export your data</h2><p>Download your profile, food diary, hydration records, and saved meal plans as a JSON file.</p><Button variant="secondary" onClick={exportData}><Download size={15} /> Download export</Button></div></Card>
    <Card className="settings-card"><div className="settings-icon blue"><ShieldCheck size={19} /></div><div className="settings-copy"><h2>Privacy and data</h2><p>Private records are stored beneath your Firebase account ID and accessed through the authenticated API. Your preferences and nutrition targets can be reviewed on your profile.</p><Link to="/profile" className="subtle-link">Review profile settings <ExternalLink size={14} /></Link></div></Card>
    <Card className="settings-card settings-danger"><div className="settings-icon red"><Trash2 size={19} /></div><div className="settings-copy"><h2>Delete account and data</h2><p>This removes your profile and application records, attempts to remove files under your user storage prefix, then deletes your Firebase Authentication account.</p><Button variant="danger" onClick={removeAccount} disabled={deleteMutation.isPending}><Trash2 size={15} /> {deleteMutation.isPending ? 'Deleting…' : 'Delete my account'}</Button><small>Firebase may require a recent sign-in before account deletion. If deletion is rejected, sign out and sign in again, then retry.</small></div></Card>
    <p className="page-disclaimer">Data deletion is performed by the backend using Firebase Admin privileges and may take time for accounts with many records.</p>
  </div>
}

