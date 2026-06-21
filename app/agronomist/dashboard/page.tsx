'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AgronomistDashboardPage() {
  const [agronomist, setAgronomist] = useState<any>(null)
  const [paddocks, setPaddocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if logged in
    const stored = localStorage.getItem('agronomist')
    if (!stored) {
      router.push('/agronomist/login')
      return
    }

    const data = JSON.parse(stored)
    setAgronomist(data)
    
    // Load paddocks assigned to this agronomist
    loadPaddocks(data.id)
  }, [router])

  async function loadPaddocks(agronomistId: string) {
    try {
      const res = await fetch(`/api/agronomist/paddocks?agronomist_id=${agronomistId}`)
      const data = await res.json()
      setPaddocks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load paddocks:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('agronomist')
    router.push('/agronomist/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a2310] flex items-center justify-center">
        <div className="text-stone-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a2310]">
      <div className="border-b border-[#344a20] bg-[#0f1707]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-100">Weather Wrangler</h1>
            <p className="text-xs text-stone-500">Agronomist: {agronomist?.name || agronomist?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-stone-500 hover:text-stone-300 border border-[#344a20] rounded-lg px-3 py-1.5 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-200">Assigned Paddocks</h2>
          <p className="text-sm text-stone-500 mt-1">{paddocks.length} paddock{paddocks.length !== 1 ? 's' : ''}</p>
        </div>

        {paddocks.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-stone-500">No paddocks assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paddocks.map(paddock => (
              <Link
                key={paddock.id}
                href={`/agronomist/paddock/${paddock.id}`}
                className="card p-5 hover:border-field-500 transition-colors cursor-pointer"
              >
                <div className="text-sm font-medium text-stone-200">{paddock.paddock_name || paddock.id}</div>
                <div className="text-xs text-stone-500 mt-1">
                  {paddock.crop_type?.crop_name || 'No crop'} · {paddock.hectares || '?'} ha
                </div>
                <div className="text-xs text-stone-600 mt-2 flex justify-between">
                  <span>Farmer: {paddock.farmer?.name || 'Unknown'}</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
