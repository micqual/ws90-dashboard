'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AgronomistLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/agronomist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Login failed')

      // Store agronomist session
      localStorage.setItem('agronomist', JSON.stringify(data))
      
      // Redirect to agronomist dashboard
      router.push('/agronomist/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a2310] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-100">Weather Wrangler</h1>
            <p className="text-sm text-stone-500 mt-1">Agronomist Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-stone-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                placeholder="agronomist@example.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#161e0c] border border-[#344a20] rounded-lg px-3 py-2 text-stone-100 text-sm placeholder:text-stone-500 focus:outline-none focus:border-field-500 focus:ring-1 focus:ring-field-500/30"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#161e0c] border border-[#344a20] rounded-lg px-3 py-2 text-stone-100 text-sm placeholder:text-stone-500 focus:outline-none focus:border-field-500 focus:ring-1 focus:ring-field-500/30"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#344a20] text-center">
            <p className="text-xs text-stone-500">
              Farmer login? <Link href="/login" className="text-field-400 hover:text-field-300">Go here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
