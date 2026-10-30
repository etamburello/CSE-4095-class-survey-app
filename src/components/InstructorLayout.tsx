import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { primaryButton, secondaryButton } from '../lib/styles.ts'
import { useAuth } from '../lib/useAuth.ts'

export function InstructorLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const instructor = user?.email ?? 'Instructor'

  async function onLogout() {
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-stone-50 text-stone-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <Link
              to="/dashboard"
              className="text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              Classroom Survey
            </Link>
            <h1 className="text-xl font-semibold text-stone-950">{title}</h1>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <p className="text-sm text-stone-600">
              Signed in as{' '}
              <span className="font-medium text-stone-900">{instructor}</span>
            </p>
            <nav aria-label="Instructor" className="flex flex-wrap gap-2">
              <Link to="/dashboard" className={secondaryButton}>
                Dashboard
              </Link>
              <Link to="/surveys/new" className={primaryButton}>
                New Survey
              </Link>
              <button
                type="button"
                className={secondaryButton}
                onClick={() => void onLogout()}
                disabled={signingOut}
              >
                {signingOut ? 'Logging out...' : 'Logout'}
              </button>
            </nav>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
