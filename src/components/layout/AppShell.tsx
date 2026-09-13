import type { ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { clearCurrentUser, getCurrentUserId } from '../../lib/auth-session'

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticatedPage = Boolean(getCurrentUserId()) && location.pathname !== '/login' && location.pathname !== '/'

  function handleLogout() {
    clearCurrentUser()
    navigate({ to: '/login' })
  }

  return (
    <div className="relative min-h-screen">
      {isAuthenticatedPage && (
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
          className="fixed right-5 top-5 z-50 grid size-10 place-items-center rounded-xl border border-white/10 bg-slate-900/90 text-slate-300 shadow-lg backdrop-blur transition hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5M15 12H3m8 8h7a2 2 0 002-2V6a2 2 0 00-2-2h-7" />
          </svg>
        </button>
      )}
      {children}
    </div>
  )
}