import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Camera, ImageUp, Info, ScanLine, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Button, Card, ErrorNotice, PageHeading } from '../components/ui'

export function ScannerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const uploadMutation = useMutation({ mutationFn: (image: File) => api.upload<{ labels: string[] }>('/api/food-recognition/predict', image), onSuccess: () => setMessage('A configured recognition adapter returned candidates. Confirm the food and portion before logging.') })
  const submit = (event: FormEvent) => { event.preventDefault(); if (file) uploadMutation.mutate(file) }
  return <div className="page-stack"><PageHeading eyebrow="Optional, model-dependent" title="Food scanner" description="A photo may suggest a food label, but it cannot confirm the portion or exact nutrition." />
    <div className="scanner-grid"><Card className="scanner-upload"><div className="scanner-illustration"><div className="scan-frame"><Camera size={33} strokeWidth={1.5} /><span className="scan-corner top-left" /><span className="scan-corner top-right" /><span className="scan-corner bottom-left" /><span className="scan-corner bottom-right" /></div></div><h2>Recognition is not configured</h2><p>The upload validation flow is available, but no evaluated food classification model or weights are installed. We won’t return sample predictions.</p><form onSubmit={submit} className="scanner-form"><label className="upload-control"><ImageUp size={17} /><span>{file?.name ?? 'Choose JPEG, PNG, or WebP'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><Button type="submit" disabled={!file || uploadMutation.isPending}>{uploadMutation.isPending ? 'Checking image…' : 'Check availability'}</Button></form>{uploadMutation.error && <ErrorNotice message={uploadMutation.error.message} />}{message && <div className="notice notice-success">{message}</div>}</Card><div className="scanner-side"><Card className="notice-card"><span className="notice-card-icon"><Info size={18} /></span><div><h3>What a photo can’t tell us</h3><p>A normal image cannot reliably establish food weight. Any future label is only a candidate; you’ll confirm the food and enter a serving before it can be logged.</p></div></Card><Card className="notice-card"><span className="notice-card-icon"><ScanLine size={18} /></span><div><h3>Use verified food data</h3><p>Nutrition values should come from the catalog record, not from image classification or a guessed response.</p><Link to="/foods"><Search size={14} /> Search the food catalog</Link></div></Card><div className="notice notice-info">Informational tool only. Food recognition does not diagnose allergies or medical conditions.</div></div></div>
  </div>
}

