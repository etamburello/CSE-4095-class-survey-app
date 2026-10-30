import { type FormEvent, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthStatus } from '../components/AuthStatus.tsx'
import { FieldError } from '../components/FieldError.tsx'
import { returnPath } from '../lib/auth-context.ts'
import { fieldLabel, primaryButton, textInput } from '../lib/styles.ts'
import { useAuth } from '../lib/useAuth.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function LoginPage() {
  const { session, loading, configured, signIn } = useAuth()
  const location = useLocation()
  const destination = returnPath(location.state)
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  usePageTitle('Instructor Login')

  if (loading) return <AuthStatus message="Checking your session..." />
  if (session) return <Navigate to={destination} replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    setSubmitting(true)
    setError(undefined)
    const message = await signIn(email, password)
    if (message) {
      setError(message)
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-stone-50 px-4 py-10">
      <form
        className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-8 shadow-sm"
        onSubmit={(event) => void onSubmit(event)}
      >
        <h1 className="text-2xl font-semibold text-stone-950">
          Instructor Login
        </h1>
        {!configured && (
          <p className="mt-4 text-sm text-red-700">
            This app is not connected to Supabase yet.
          </p>
        )}
        <div className="mt-6">
          <label htmlFor="email" className={fieldLabel}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className={textInput}
          />
        </div>
        <div className="mt-4">
          <label htmlFor="password" className={fieldLabel}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className={textInput}
          />
        </div>
        <FieldError id="login-error">{error}</FieldError>
        <button
          type="submit"
          className={`${primaryButton} mt-6 w-full`}
          disabled={submitting || !configured}
        >
          {submitting ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </main>
  )
}
