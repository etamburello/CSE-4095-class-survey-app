import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { InstructorLayout } from '../components/InstructorLayout.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { formatDate } from '../lib/format.ts'
import {
  dangerQuietButton,
  fieldLabel,
  primaryButton,
  secondaryButton,
  textInput,
} from '../lib/styles.ts'
import type { Survey, SurveyStatus } from '../lib/types.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useSurveys } from '../lib/useSurveys.ts'

type StatusFilter = 'all' | SurveyStatus

type PendingAction = {
  type: 'delete' | 'archive' | 'close'
  survey: Survey
}

export function DashboardPage() {
  const navigate = useNavigate()
  const {
    surveys,
    responses,
    activateSurvey,
    closeSurvey,
    archiveSurvey,
    deleteSurvey,
    duplicateSurvey,
  } = useSurveys()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [activateErrorId, setActivateErrorId] = useState<string | null>(null)
  usePageTitle('Dashboard')

  const normalizedQuery = query.trim().toLowerCase()
  const visible = surveys.filter((survey) => {
    const matchesStatus = status === 'all' || survey.status === status
    const matchesQuery = survey.title.toLowerCase().includes(normalizedQuery)
    return matchesStatus && matchesQuery
  })

  function responseCount(surveyId: string) {
    return responses.filter((item) => item.survey_id === surveyId).length
  }

  function onActivate(survey: Survey) {
    if (survey.questions.length === 0) {
      setActivateErrorId(survey.id)
      return
    }
    setActivateErrorId(null)
    activateSurvey(survey.id)
    navigate(`/surveys/${survey.id}/present`)
  }

  function onDuplicate(survey: Survey) {
    const id = duplicateSurvey(survey.id)
    if (id) navigate(`/surveys/${id}/edit`)
  }

  function onConfirm() {
    if (!pending) return
    if (pending.type === 'delete') deleteSurvey(pending.survey.id)
    if (pending.type === 'archive') archiveSurvey(pending.survey.id)
    if (pending.type === 'close') closeSurvey(pending.survey.id)
    setPending(null)
  }

  const pendingCount = pending ? responseCount(pending.survey.id) : 0

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

      {surveys.length === 0 ? (
        <section className="mt-10 rounded-lg border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg text-stone-700">
            You have not created any surveys yet.
          </p>
          <Link to="/surveys/new" className={`${primaryButton} mt-6`}>
            Create Your First Survey
          </Link>
        </section>
      ) : visible.length === 0 ? (
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
                    onClick={() => onDuplicate(survey)}
                  >
                    Duplicate
                  </button>
                  {(survey.status === 'draft' ||
                    survey.status === 'closed') && (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => setPending({ type: 'archive', survey })}
                    >
                      Archive
                    </button>
                  )}
                  {survey.status === 'active' && (
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => setPending({ type: 'close', survey })}
                    >
                      Close
                    </button>
                  )}
                  {survey.status !== 'active' && (
                    <button
                      type="button"
                      className={dangerQuietButton}
                      onClick={() => setPending({ type: 'delete', survey })}
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
            pendingCount > 0
              ? 'This will permanently delete the survey and all of its responses.'
              : 'This will permanently delete the survey.'
          }
          confirmLabel="Delete"
          tone="danger"
          onConfirm={onConfirm}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.type === 'archive' && (
        <ConfirmDialog
          title={`Archive "${pending.survey.title}"?`}
          body="Archived surveys stay in the Archived filter. Students can no longer submit responses."
          confirmLabel="Archive"
          onConfirm={onConfirm}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.type === 'close' && (
        <ConfirmDialog
          title={`Close "${pending.survey.title}"?`}
          body="Students will no longer be able to submit responses. Results stay available."
          confirmLabel="Close"
          onConfirm={onConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </InstructorLayout>
  )
}
