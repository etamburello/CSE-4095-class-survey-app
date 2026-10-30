import { Link } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { primaryButton } from '../lib/styles.ts'

export function NotFoundPage() {
  usePageTitle('Page not found')

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-5">
      <h1 className="text-3xl font-semibold text-stone-950">Page not found.</h1>
      <Link to="/" className={`${primaryButton} mt-6 self-start`}>
        Back to home
      </Link>
    </main>
  )
}
