import { Link } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { primaryButton } from '../lib/styles.ts'

export function LandingPage() {
  usePageTitle('Classroom Survey')

  return (
    <main className="flex min-h-svh items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          Classroom Survey
        </h1>
        <p className="mt-4 text-lg text-stone-600">
          Quick in-class understanding checks
        </p>
        <Link to="/login" className={`${primaryButton} mt-8 px-6`}>
          Instructor Login
        </Link>
      </div>
    </main>
  )
}
