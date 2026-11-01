import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { InstructorLayout } from '../components/InstructorLayout.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import {
  csvFilename,
  downloadCsv,
  lmsShareText,
  participationToCsv,
  surveyToCsv,
} from '../lib/csv.ts'
import {
  filteredResponseCountLabel,
  formatPercent,
  matchesDateRange,
} from '../lib/format.ts'
import { loadSurveyResults } from '../lib/results-api.ts'
import {
  fieldLabel,
  primaryButton,
  secondaryButton,
  textInput,
} from '../lib/styles.ts'
import { supabase } from '../lib/supabase.ts'
import type { Question, Survey, SurveyResponse } from '../lib/types.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function ResultsPage() {
  const { id } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string>()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [live, setLive] = useState(false)
  const [copied, setCopied] = useState(false)
  usePageTitle(survey ? `${survey.title} results` : 'Results')

  function applyResult(result: Awaited<ReturnType<typeof loadSurveyResults>>) {
    if ('missing' in result) {
      setSurvey(null)
      setResponses([])
      setMissing(true)
      setError(undefined)
    } else if ('error' in result) {
      setError(result.error)
    } else {
      setSurvey(result.survey)
      setResponses(result.responses)
      setMissing(false)
      setError(undefined)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void loadSurveyResults(id).then((result) => {
      if (!cancelled) applyResult(result)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!id || !supabase) return
    const channel = supabase
      .channel(`results-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `survey_id=eq.${id}`,
        },
        () => {
          void loadSurveyResults(id).then(applyResult)
        },
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED')
      })
    return () => {
      void supabase?.removeChannel(channel)
      setLive(false)
    }
  }, [id])

  function refresh() {
    if (!id || loading) return
    setLoading(true)
    void loadSurveyResults(id).then(applyResult)
  }

  if (!id || missing) {
    return (
      <InstructorLayout title="Results">
        <h2 className="text-2xl font-semibold">Survey not found.</h2>
        <Link to="/dashboard" className={`${secondaryButton} mt-6`}>
          Back to Dashboard
        </Link>
      </InstructorLayout>
    )
  }

  if (loading && !survey) {
    return (
      <InstructorLayout title="Results">
        <p className="text-lg text-stone-700" role="status">
          Loading results...
        </p>
      </InstructorLayout>
    )
  }

  if (!survey) {
    return (
      <InstructorLayout title="Results">
        <p role="alert" className="text-sm text-red-700">
          {error ?? 'The results could not be loaded.'}
        </p>
        <Link to="/dashboard" className={`${secondaryButton} mt-6`}>
          Back to Dashboard
        </Link>
      </InstructorLayout>
    )
  }

  const selectedSurvey = survey
  const rangeInvalid = from !== '' && to !== '' && from > to
  const filtering = from !== '' || to !== ''
  const surveyResponses = rangeInvalid
    ? []
    : responses.filter((response) =>
        matchesDateRange(response.submitted_at, from, to),
      )
  const questions = [...selectedSurvey.questions].sort(
    (a, b) => a.position - b.position,
  )

  function exportCsv() {
    downloadCsv(
      csvFilename(selectedSurvey.title),
      surveyToCsv(selectedSurvey, surveyResponses),
    )
  }

  function exportParticipation() {
    downloadCsv(
      csvFilename(selectedSurvey.title, 'participation'),
      participationToCsv(selectedSurvey, surveyResponses),
    )
  }

  async function shareLms() {
    try {
      await navigator.clipboard.writeText(lmsShareText(selectedSurvey))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy LMS share text.')
    }
  }

  return (
    <InstructorLayout title={selectedSurvey.title}>
      <p className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
        <span>Status:</span>
        <StatusBadge status={selectedSurvey.status} />
        {live && (
          <span className="rounded-full border border-emerald-700 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Live
          </span>
        )}
      </p>
      <p className="mt-2 text-lg text-stone-700">
        {filteredResponseCountLabel(
          surveyResponses.length,
          responses.length,
          filtering,
        )}
      </p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="sm:w-44">
          <label htmlFor="submitted-from" className={fieldLabel}>
            From
          </label>
          <input
            id="submitted-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={textInput}
          />
        </div>
        <div className="sm:w-44">
          <label htmlFor="submitted-to" className={fieldLabel}>
            To
          </label>
          <input
            id="submitted-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={textInput}
          />
        </div>
      </div>
      {rangeInvalid && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          The start date is after the end date.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButton}
          onClick={refresh}
          disabled={loading}
        >
          Refresh
        </button>
        <button type="button" className={secondaryButton} onClick={exportCsv}>
          Export CSV
        </button>
        <button
          type="button"
          className={secondaryButton}
          onClick={exportParticipation}
        >
          Participation CSV
        </button>
        <button type="button" className={secondaryButton} onClick={() => void shareLms()}>
          {copied ? 'Copied' : 'Share for LMS'}
        </button>
        {selectedSurvey.public_slug && (
          <Link
            to={`/surveys/${selectedSurvey.id}/present`}
            className={secondaryButton}
          >
            Present QR
          </Link>
        )}
        <Link to="/dashboard" className={primaryButton}>
          Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <p className="mt-10 text-lg text-stone-700" role="status">
          Loading results...
        </p>
      ) : rangeInvalid ? null : responses.length === 0 ? (
        <section className="mt-10 rounded-lg border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-medium text-stone-900">
            No responses yet.
          </p>
          <p className="mt-2 text-stone-700">
            Display the QR code so students can join.
          </p>
          {selectedSurvey.public_slug && (
            <Link
              to={`/surveys/${selectedSurvey.id}/present`}
              className={`${primaryButton} mt-6`}
            >
              Present QR
            </Link>
          )}
        </section>
      ) : surveyResponses.length === 0 ? (
        <p className="mt-10 text-lg text-stone-700">
          No responses in this date range.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {questions.map((question) => (
            <QuestionResult
              key={question.id}
              question={question}
              responses={surveyResponses}
            />
          ))}
        </div>
      )}
    </InstructorLayout>
  )
}

function choiceIdsFor(questionId: string, response: SurveyResponse) {
  const ids = new Set<string>()
  for (const answer of response.answers) {
    if (answer.question_id !== questionId) continue
    if (answer.choice_ids) for (const id of answer.choice_ids) ids.add(id)
    if (answer.choice_id) ids.add(answer.choice_id)
  }
  return ids
}

function QuestionResult({
  question,
  responses,
}: {
  question: Question
  responses: SurveyResponse[]
}) {
  const total = responses.length

  if (question.question_type === 'short_answer') {
    const texts = responses
      .map(
        (response) =>
          response.answers.find((answer) => answer.question_id === question.id)
            ?.text_answer,
      )
      .filter((text): text is string => Boolean(text?.trim()))
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-stone-950">
          {question.question_text}
        </h2>
        <p className="mt-2 text-sm text-stone-700">
          {texts.length} written response{texts.length === 1 ? '' : 's'}
        </p>
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm text-stone-800">
          {texts.map((text, index) => (
            <li
              key={`${index}-${text.slice(0, 12)}`}
              className="rounded-md border border-stone-200 px-3 py-2"
            >
              {text}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  if (question.question_type === 'numeric') {
    const values = responses
      .map(
        (response) =>
          response.answers.find((answer) => answer.question_id === question.id)
            ?.numeric_value,
      )
      .filter((value): value is number => typeof value === 'number')
    const min = values.length ? Math.min(...values) : 0
    const max = values.length ? Math.max(...values) : 0
    const avg = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-stone-950">
          {question.question_text}
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-4">
          <Stat label="Responses" value={String(values.length)} />
          <Stat label="Min" value={values.length ? String(min) : '—'} />
          <Stat label="Max" value={values.length ? String(max) : '—'} />
          <Stat
            label="Average"
            value={values.length ? avg.toFixed(1) : '—'}
          />
        </dl>
      </section>
    )
  }

  const rows = [...question.choices]
    .sort((a, b) => a.position - b.position)
    .map((choice) => {
      const count = responses.filter((response) =>
        choiceIdsFor(question.id, response).has(choice.id),
      ).length
      return {
        choice_text: choice.choice_text,
        count,
        label: `${count}  ${formatPercent(count, total)}`,
      }
    })
  const answered = responses.filter(
    (response) => choiceIdsFor(question.id, response).size > 0,
  ).length
  const unanswered = total - answered
  const summary = rows
    .map((row) => `${row.choice_text}: ${row.label}`)
    .join(', ')

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="text-xl font-semibold text-stone-950">
        {question.question_text}
      </h2>
      {unanswered > 0 && (
        <p className="mt-2 text-sm font-medium text-stone-700">
          Unanswered: {unanswered}
        </p>
      )}
      <div className="mt-4 overflow-x-auto" aria-label={summary}>
        <div
          className="min-w-[520px]"
          style={{ height: Math.max(180, rows.length * 56) }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 88, left: 8, bottom: 8 }}
            >
              <CartesianGrid stroke="#e7e5e4" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="#78716c" />
              <YAxis
                type="category"
                dataKey="choice_text"
                width={150}
                stroke="#78716c"
                tick={{ fill: '#1c1917', fontSize: 14 }}
              />
              <Bar
                dataKey="count"
                fill="#1e293b"
                radius={[0, 4, 4, 0]}
                barSize={22}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="label"
                  position="right"
                  fill="#1c1917"
                  fontSize={14}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <ul className="mt-4 space-y-1 text-sm text-stone-800">
        {rows.map((row) => (
          <li key={row.choice_text} className="flex justify-between gap-4">
            <span>{row.choice_text}</span>
            <span className="tabular-nums">{row.label.trim()}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-stone-950">
        {value}
      </dd>
    </div>
  )
}
