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
import { csvFilename, downloadCsv, surveyToCsv } from '../lib/csv.ts'
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
  usePageTitle(survey ? `${survey.title} results` : 'Results')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void loadSurveyResults(id).then((result) => {
      if (cancelled) return
      applyResult(result)
    })
    return () => {
      cancelled = true
    }
  }, [id])

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

  function refresh() {
    if (!id || loading) return
    setLoading(true)
    void loadSurveyResults(id).then((result) => {
      applyResult(result)
    })
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

  return (
    <InstructorLayout title={selectedSurvey.title}>
      <p className="flex items-center gap-2 text-sm text-stone-700">
        <span>Status:</span>
        <StatusBadge status={selectedSurvey.status} />
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

function QuestionResult({
  question,
  responses,
}: {
  question: Question
  responses: SurveyResponse[]
}) {
  const total = responses.length
  const rows = [...question.choices]
    .sort((a, b) => a.position - b.position)
    .map((choice) => {
      const count = responses.filter((response) =>
        response.answers.some(
          (answer) =>
            answer.question_id === question.id &&
            answer.choice_id === choice.id,
        ),
      ).length
      return {
        choice_text: choice.choice_text,
        count,
        label: `${count}  ${formatPercent(count, total)}`,
      }
    })
  const answered = responses.filter((response) =>
    response.answers.some(
      (answer) =>
        answer.question_id === question.id && answer.choice_id.length > 0,
    ),
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
