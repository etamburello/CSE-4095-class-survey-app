import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { InstructorLayout } from '../components/InstructorLayout.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import {
  loadAnalytics,
  type AnalyticsSummary,
} from '../lib/analytics-api.ts'
import { listCourses, listSemesters } from '../lib/org-api.ts'
import {
  fieldLabel,
  secondaryButton,
  textInput,
} from '../lib/styles.ts'
import type { Course, Semester } from '../lib/types.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [courseId, setCourseId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  usePageTitle('Analytics')

  useEffect(() => {
    void Promise.all([listCourses(), listSemesters()]).then(
      ([courseResult, semesterResult]) => {
        if ('courses' in courseResult) setCourses(courseResult.courses)
        if ('semesters' in semesterResult) setSemesters(semesterResult.semesters)
      },
    )
  }, [])

  useEffect(() => {
    setLoading(true)
    void loadAnalytics({
      courseId: courseId || undefined,
      semesterId: semesterId || undefined,
    }).then((result) => {
      if ('error' in result) {
        setError(result.error)
        setSummary(null)
      } else {
        setSummary(result.summary)
        setError(undefined)
      }
      setLoading(false)
    })
  }, [courseId, semesterId])

  return (
    <InstructorLayout title="Analytics">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="sm:w-56">
          <label htmlFor="analytics-course" className={fieldLabel}>
            Course
          </label>
          <select
            id="analytics-course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className={textInput}
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-56">
          <label htmlFor="analytics-semester" className={fieldLabel}>
            Semester
          </label>
          <select
            id="analytics-semester"
            value={semesterId}
            onChange={(event) => setSemesterId(event.target.value)}
            className={textInput}
          >
            <option value="">All semesters</option>
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading || !summary ? (
        <p role="status" className="mt-8 text-lg text-stone-700">
          Loading analytics...
        </p>
      ) : (
        <>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Surveys" value={String(summary.surveyCount)} />
            <Stat label="Responses" value={String(summary.responseCount)} />
            <Stat
              label="Active"
              value={String(summary.byStatus.active ?? 0)}
            />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-stone-700">
            <span>Draft: {summary.byStatus.draft}</span>
            <span>Closed: {summary.byStatus.closed}</span>
            <span>Archived: {summary.byStatus.archived}</span>
          </div>
          {summary.surveys.length === 0 ? (
            <p className="mt-8 text-stone-700">No surveys match these filters.</p>
          ) : (
            <ul className="mt-8 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
              {summary.surveys.map((survey) => (
                <li
                  key={survey.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-stone-950">{survey.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-stone-700">
                      <StatusBadge status={survey.status} />
                      <span>
                        {survey.response_count} response
                        {survey.response_count === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                  <Link
                    to={`/surveys/${survey.id}/results`}
                    className={secondaryButton}
                  >
                    Results
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </InstructorLayout>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-stone-950">
        {value}
      </dd>
    </div>
  )
}
