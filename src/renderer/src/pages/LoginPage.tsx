import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FileText, CheckCircle, Shield, TrendingUp, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import appLogo from '../assets/app-logo.svg'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const features = [
  { icon: FileText,    text: 'GST-compliant invoices in seconds' },
  { icon: CheckCircle, text: 'Auto CGST / SGST calculation' },
  { icon: TrendingUp,  text: 'Customer ledger & payment tracking' },
  { icon: Shield,      text: 'Your data synced securely to cloud' },
]

export default function LoginPage(): React.ReactElement {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [hasLocalData, setHasLocalData] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.exportLocalData().then((local) => {
      if (local.exists) { setHasLocalData(true); setMode('signup') }
    })
  }, [])

  const afterAuth = async (data: {
    access_token: string; refresh_token: string; user: { id: string; email: string }
  }): Promise<void> => {
    await window.api.setTokens({ access_token: data.access_token, refresh_token: data.refresh_token })
    setAuth(data.user.id, data.user.email)
    const done = await window.api.isMigrationDone()
    if (!done) {
      const local = await window.api.exportLocalData()
      if (local.exists) { navigate('/migrate'); return }
      await window.api.markMigrationDone()
    }
    navigate('/history')
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data } = await axios.post(`${API}/auth/signup`, { email, password, name: name || undefined })
        await afterAuth(data)
      } else {
        const { data } = await axios.post(`${API}/auth/signin`, { email, password })
        await afterAuth(data)
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) setError('Cannot connect to server. Check your internet connection.')
        else if (err.response.status === 401) setError('Invalid email or password.')
        else if (err.response.status === 409) setError('Account already exists. Sign in instead.')
        else if (err.response.status === 403) setError('Signup is disabled. Contact your administrator.')
        else setError(err.response.data?.message || 'Something went wrong.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── LEFT PANEL ── */}
      <div className="w-[52%] flex-shrink-0 bg-primary flex flex-col relative overflow-hidden">

        {/* Background decorative circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-white/5" />

        {/* Logo + Brand */}
        <div className="relative z-10 px-12 pt-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <img src={appLogo} alt="logo" className="w-6 h-6" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">GST Invoice Pro</span>
          </div>
        </div>

        {/* Main illustration area */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12">
          <h1 className="text-white text-4xl font-bold leading-tight mb-3">
            Invoicing made<br />
            <span className="text-blue-300">simple & smart</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed mb-10 max-w-xs">
            Create GST-compliant invoices, track payments, and manage your customers — all in one place.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-blue-300" />
                </div>
                <span className="text-white/75 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice card mockup */}
        <div className="relative z-10 px-12 pb-12">
          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white/40 text-xs mb-1">Latest Invoice</div>
                <div className="text-white font-semibold text-sm">INV-2024-0089</div>
              </div>
              <div className="bg-green-400/20 text-green-300 text-xs font-medium px-2.5 py-1 rounded-full">Paid</div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-white/50 text-xs">Acme Pvt. Ltd.</div>
              <div className="text-white font-bold text-lg">₹ 42,360</div>
            </div>
            {/* mini bar chart */}
            <div className="mt-4 flex items-end gap-1.5 h-10">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-blue-400/30"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="text-white/30 text-xs mt-1.5">Monthly revenue trend</div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 bg-white flex flex-col justify-center px-16">
        <div className="w-full max-w-sm mx-auto">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {mode === 'signup'
                ? 'Set up your account to get started'
                : 'Sign in to continue to GST Invoice Pro'}
            </p>
          </div>

          {/* Local data banner */}
          {hasLocalData && mode === 'signup' && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Local data detected</p>
              <p className="text-xs text-amber-700">Create an account and your invoices, customers & payments will be migrated automatically.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1.5">
                  Full Name <span className="text-text-secondary font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">Email address</label>
              <input
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-border rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-danger bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-light disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors mt-1"
            >
              {loading
                ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                : (mode === 'signup' ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-5 text-center">
            {mode === 'signup' ? (
              <p className="text-xs text-text-secondary">
                Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(null) }} className="text-accent font-medium hover:underline">
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-xs text-text-secondary">
                New user?{' '}
                <button onClick={() => { setMode('signup'); setError(null) }} className="text-accent font-medium hover:underline">
                  Create account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
