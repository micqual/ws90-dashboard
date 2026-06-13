'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface User {
  name?: string
  email?: string
  role?: string
}

export default function Navbar({ user }: { user: User }) {
  const pathname = usePathname()

  return (
    <header className="border-b border-[#344a20] bg-[#1a2310]/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-field-800 border border-field-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-field-300" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <span className="font-semibold text-stone-200 text-sm hidden sm:block">Weather Wrangler</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              pathname === '/dashboard'
                ? 'bg-field-800 text-field-200'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
            }`}
          >
            Paddocks
          </Link>
          <Link
            href="/dashboard/history"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              pathname === '/dashboard/history'
                ? 'bg-field-800 text-field-200'
                : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
            }`}
          >
            History
          </Link>
          {user.role === 'admin' && (
            <Link
              href="/dashboard/admin"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/dashboard/admin')
                  ? 'bg-field-800 text-field-200'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-white/5'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-medium text-stone-300 leading-tight">{user.name}</div>
            <div className="text-xs text-stone-600">{user.role}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors px-2 py-1 rounded hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
