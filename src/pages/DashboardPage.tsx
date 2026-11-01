import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { InstructorLayout } from '../components/InstructorLayout.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import type { DashboardSurvey } from '../lib/dashboard-api.ts'
import { saveEditorSurvey } from '../lib/editor-api.ts'
import { formatDate, matchesDateRange } from '../lib/format.ts'
import {
  dangerQuietButton,
  fieldLabel,
  primaryButton,
  secondaryButton,
  textInput,
} from '../lib/styles.ts'
import { parseSurveyJson, parseSurveyMarkdown } from '../lib/survey-io.ts'
import type { SurveyStatus } from '../lib/types.ts'
import { useDashboardSurveys } from '../lib/useDashboardSurveys.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

type StatusFilter = 'all' | SurveyStatus

type PendingAction = {
  type: 'delete' | 'archive' | 'close'
  survey: DashboardSurvey
}

export function DashboardPage() {
  const navigate = useNavigate()
  const {
    surveys,
    loading,
    error,
    acting,
    activate,
    close,
    archive,
    remove,
    duplicate,
  } = useDashboardSurveys()
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [activateErrorId, setActivateErrorId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string>()
  const [importing, setImporting] = useState(false)
  usePageTitle('Dashboard')

  async function onDuplicate(id: string) {
    const result = await duplicate(id)
    if ('id' in result) navigate(`/surveys/${result.id}/edit`)
  }

  async function importFile(file: File, kind: 'json' | 'markdown') {
    setImporting(true)
    setImportError(undefined)
    try {
      const text = await file.text()
      const survey =
        kind === 'json' ? parseSurveyJson(text) : parseSurveyMarkdown(text)
      const saved = await saveEditorSurvey(survey)
      if ('error' in saved) {
        setImportError(saved.error)
        return
      }
      navigate(`/surveys/${saved.survey.id}/edit`)
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Could not import the survey.',
      )
    } finally {
      setImporting(false)
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const rangeInvalid = from !== '' && to !== '' && from > to
  const visible = surveys.filter((survey) => {
    const matchesStatus = status === 'all' || survey.status === status
    const matchesQuery = survey.title.toLowerCase().includes(normalizedQuery)
    const matchesDate =
      !rangeInvalid && matchesDateRange(survey.created_at, from, to)
    return matchesStatus && matchesQuery && matchesDate
  })

  function onActivate(survey: DashboardSurvey) {
    if (survey.questionCount === 0) {
      setActivateErrorId(survey.id)
      return
    }
    setActivateErrorId(null)
    void activate(survey)
  }

  async function onConfirm() {
    if (!pending || acting) return
    const current = pending
    const message =
      current.type === 'delete'
        ? await remove(current.survey.id)
        : current.type === 'archive'
          ? await archive(current.survey.id)
          : await close(current.survey.id)
    if (!message) setPending(null)
  }

  return (
    <InstructorLayout title="Dashboard">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="survey-search" className={fieldLabel}>
            Search
          </label>
          <input
            id="survey-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Survey title"
            className={textInput}
          />
        </div>
        <div className="sm:w-44">
          <label htmlFor="created-from" className={fieldLabel}>
            From
          </label>
          <input
            id="created-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={textInput}
          />
        </div>
        <div className="sm:w-44">
          <label htmlFor="created-to" className={fieldLabel}>
            To
          </label>
          <input
            id="created-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={textInput}
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor="status-filter" className={fieldLabel}>
            Status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            className={textInput}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className={secondaryButton}>
          {importing ? 'Importing...' : 'Import JSON'}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={importing}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void importFile(file, 'json')
            }}
          />
        </label>
        <label className={secondaryButton}>
          {importing ? 'Importing...' : 'Import Markdown'}
          <input
            type="file"
            accept=".md,text/markdown,text/plain"
            className="sr-only"
            disabled={importing}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void importFile(file, 'markdown')
            }}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {importError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {importError}
        </p>
      )}

      {rangeInvalid && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          The start date is after the end date.
        </p>
      )}

      {loading ? (
        <p role="status" className="mt-10 text-lg text-stone-700">
          Loading surveys...
        </p>
      ) : surveys.length === 0 ? (
        <section className="mt-10 rounded-lg border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg text-stone-700">
            You have not created any surveys yet.
          </p>
          <Link to="/surveys/new" className={`${primaryButton} mt-6`}>
            Create Your First Survey
          </Link>
        </section>
      ) : rangeInvalid ? null : visible.length === 0 ? (
        <p className="mt-10 text-lg text-stone-700">
          No surveys match your search.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {visible.map((survey) => (
            <li key={survey.id}>
              <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold text-stone-950">
                    {survey.title}
                  </h2>
                  <p className="flex items-center gap-2 text-sm text-stone-700">
                    <span>Status:</span>
                    <StatusBadge status={survey.status} />
                  </p>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  Created: {formatDate(survey.created_at)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(survey.status === 'draft' ||
                    survey.status === 'closed') && (
                    <Link
                      to={`/surveys/${survey.id}/edit`}
                      className={secondaryButton}
                    >
                      Edit
                    </Link>
                  )}
                  {(survey.status === 'draft' ||
                    survey.status === 'closed') && (
                    <button
                      type="button"
                      className={primaryButton}
                      onClick={() => onActivate(survey)}
                      disabled={acting}
                    >
                      Activate
                    </button>
                  )}
                  {survey.status === 'active' && (
                    <Link
                      to={`/surveys/${survey.id}/present`}
                      className={primaryButton}
                    >
                      Present
                    </Link>
                  )}
                  {survey.status !== 'draft' && (
                    <Link
                      to={`/surveys/${survey.id}/results`}
                      className={secondaryButton}
                    >
                      Results
                    </Link>
                  )}
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => void onDuplicate(survey.id)}
                    disabled={acting}
                  >
                    Duplicate
                  </button>
                  {(survey.status === 'draft' ||
                    survey.status === 'closed') && (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => setPending({ type: 'archive', survey })}
                      disabled={acting}
                    >
                      Archive
                    </button>
                  )}
                  {survey.status === 'active' && (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => setPending({ type: 'close', survey })}
                      disabled={acting}
                    >
                      Close
                    </button>
                  )}
                  {survey.status !== 'active' && (
                    <button
                      type="button"
                      className={dangerQuietButton}
                      onClick={() => setPending({ type: 'delete', survey })}
                      disabled={acting}
                    >
                      Delete
                    </button>
                  )}
                </div>
                {activateErrorId === survey.id && (
                  <p className="mt-3 text-sm text-red-700">
                    Add at least one question before activating.
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}

      {pending?.type === 'delete' && (
        <ConfirmDialog
          title={`Delete "${pending.survey.title}"?`}
          body={
            pending.survey.responseCount > 0
              ? 'This will permanently delete the survey and all of its responses.'
              : 'This will permanently delete the survey.'
          }
          confirmLabel="Delete"
          tone="danger"
          busy={acting}
          onConfirm={() => void onConfirm()}
          onCancel={() => {
            if (!acting) setPending(null)
          }}
        />
      )}
      {pending?.type === 'archive' && (
        <ConfirmDialog
          title={`Archive "${pending.survey.title}"?`}
          body="Archived surveys stay in the Archived filter. Students can no longer submit responses. Results stay available."
          confirmLabel="Archive"
          busy={acting}
          onConfirm={() => void onConfirm()}
          onCancel={() => {
            if (!acting) setPending(null)
          }}
        />
      )}
      {pending?.type === 'close' && (
        <ConfirmDialog
          title={`Close "${pending.survey.title}"?`}
          body="Students will no longer be able to submit responses. Results stay available."
          confirmLabel="Close"
          busy={acting}
          onConfirm={() => void onConfirm()}
          onCancel={() => {
            if (!acting) setPending(null)
          }}
        />
      )}
    </InstructorLayout>
  )
}
