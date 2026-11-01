import { useEffect, useState, type FormEvent } from 'react'
import { InstructorLayout } from '../components/InstructorLayout.tsx'
import { createCourse, deleteCourse, listCourses } from '../lib/org-api.ts'
import {
  fieldLabel,
  primaryButton,
  secondaryButton,
  textInput,
} from '../lib/styles.ts'
import type { Course } from '../lib/types.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  usePageTitle('Courses')

  async function reload() {
    const result = await listCourses()
    if ('error' in result) setError(result.error)
    else {
      setCourses(result.courses)
      setError(undefined)
    }
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (!code.trim() || !name.trim() || saving) return
    setSaving(true)
    const result = await createCourse(code, name)
    setSaving(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setCode('')
    setName('')
    await reload()
  }

  return (
    <InstructorLayout title="Courses">
      <form
        onSubmit={(event) => void onCreate(event)}
        className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-3"
      >
        <div>
          <label htmlFor="course-code" className={fieldLabel}>
            Code
          </label>
          <input
            id="course-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={textInput}
            placeholder="CSE 4095"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="course-name" className={fieldLabel}>
            Name
          </label>
          <input
            id="course-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={textInput}
            placeholder="Senior Design"
          />
        </div>
        <button type="submit" className={primaryButton} disabled={saving}>
          {saving ? 'Adding...' : 'Add Course'}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-8 text-lg text-stone-700">
          Loading courses...
        </p>
      ) : courses.length === 0 ? (
        <p className="mt-8 text-stone-700">No courses yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {courses.map((course) => (
            <li
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-semibold text-stone-950">{course.code}</p>
                <p className="text-sm text-stone-700">{course.name}</p>
              </div>
              <button
                type="button"
                className={secondaryButton}
                onClick={() =>
                  void deleteCourse(course.id).then(() => reload())
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
