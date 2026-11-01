import { useEffect, useState, type FormEvent } from 'react'
import { InstructorLayout } from '../components/InstructorLayout.tsx'
import {
  createSemester,
  deleteSemester,
  listSemesters,
} from '../lib/org-api.ts'
import {
  fieldLabel,
  primaryButton,
  secondaryButton,
  textInput,
} from '../lib/styles.ts'
import type { Semester } from '../lib/types.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function SemestersPage() {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [name, setName] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  usePageTitle('Semesters')

  async function reload() {
    const result = await listSemesters()
    if ('error' in result) setError(result.error)
    else {
      setSemesters(result.semesters)
      setError(undefined)
    }
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    const result = await createSemester(name, startsOn, endsOn)
    setSaving(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setName('')
    setStartsOn('')
    setEndsOn('')
    await reload()
  }

  return (
    <InstructorLayout title="Semesters">
      <form
        onSubmit={(event) => void onCreate(event)}
        className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-4"
      >
        <div className="sm:col-span-2">
          <label htmlFor="semester-name" className={fieldLabel}>
            Name
          </label>
          <input
            id="semester-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={textInput}
            placeholder="Fall 2026"
          />
        </div>
        <div>
          <label htmlFor="semester-start" className={fieldLabel}>
            Starts
          </label>
          <input
            id="semester-start"
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
            className={textInput}
          />
        </div>
        <div>
          <label htmlFor="semester-end" className={fieldLabel}>
            Ends
          </label>
          <input
            id="semester-end"
            type="date"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
            className={textInput}
          />
        </div>
        <button type="submit" className={primaryButton} disabled={saving}>
          {saving ? 'Adding...' : 'Add Semester'}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-8 text-lg text-stone-700">
          Loading semesters...
        </p>
      ) : semesters.length === 0 ? (
        <p className="mt-8 text-stone-700">No semesters yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {semesters.map((semester) => (
            <li
              key={semester.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-semibold text-stone-950">{semester.name}</p>
                <p className="text-sm text-stone-700">
                  {[semester.starts_on, semester.ends_on]
                    .filter(Boolean)
                    .join(' → ') || 'No dates'}
                </p>
              </div>
              <button
                type="button"
                className={secondaryButton}
                onClick={() =>
                  void deleteSemester(semester.id).then(() => reload())
                }
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </InstructorLayout>
  )
}
