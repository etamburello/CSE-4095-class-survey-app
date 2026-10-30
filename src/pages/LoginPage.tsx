import { type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { fieldLabel, primaryButton, textInput } from '../lib/styles.ts'

export function LoginPage() {
  const navigate = useNavigate()
  usePageTitle('Instructor Login')

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-stone-50 px-4 py-10">
      <form
        className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-8 shadow-sm"
        onSubmit={onSubmit}
      >
        <h1 className="text-2xl font-semibold text-stone-950">
          Instructor Login
        </h1>
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
            className={textInput}
          />
        </div>
        <button type="submit" className={`${primaryButton} mt-6 w-full`}>
          Log In
        </button>
      </form>
    </main>
  )
}
