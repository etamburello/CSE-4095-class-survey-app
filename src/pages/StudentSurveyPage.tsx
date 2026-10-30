import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { FieldError } from '../components/FieldError.tsx'
import {
  loadStudentSurvey,
  submitStudentResponse,
  type StudentSurvey,
} from '../lib/student-api.ts'
import { hasSubmittedSurvey } from '../lib/student-token.ts'
import { primaryButton } from '../lib/styles.ts'
import type { Question, SelectedAnswer } from '../lib/types.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

type Phase = 'form' | 'submitting' | 'success' | 'closed' | 'duplicate'

export function StudentSurveyPage() {
  const { slug } = useParams()
  const [survey, setSurvey] = useState<StudentSurvey | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  usePageTitle(survey?.title ?? 'Survey')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    void loadStudentSurvey(slug).then((result) => {
      if (cancelled) return
      if ('missing' in result) {
        setSurvey(null)
        setMissing(true)
        setLoadError(undefined)
      } else if ('error' in result) {
        setSurvey(null)
        setMissing(false)
        setLoadError(result.error)
      } else {
        setSurvey(result.survey)
        setMissing(false)
        setLoadError(undefined)
        if (hasSubmittedSurvey(result.survey.id)) setPhase('duplicate')
        else if (result.survey.status !== 'active') setPhase('closed')
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!slug || missing) {
    return <StudentMessage title="Survey not found." />
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-5 py-10">
        <p role="status" className="text-lg text-stone-700">
          Loading survey...
        </p>
      </main>
    )
  }

  if (loadError || !survey) {
    return (
      <StudentMessage
        title="This survey is not available right now."
        body={loadError}
      />
    )
  }

  if (phase === 'closed' || survey.status !== 'active') {
    return (
      <StudentMessage title="This survey is no longer accepting responses." />
    )
  }

  if (phase === 'duplicate') {
    return (
      <StudentMessage title="You have already submitted a response to this survey." />
    )
  }

  if (phase === 'success') {
    return (
      <StudentMessage
        title="Thank you!"
        body="Your response has been recorded."
      />
    )
  }

  const questions = [...survey.questions].sort(
    (a, b) => a.position - b.position,
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!survey || phase === 'submitting') return
    const nextErrors: Record<string, string> = {}
    const selected: SelectedAnswer[] = []
    for (const question of questions) {
      const choiceId = answers[question.id]
      if (!choiceId) nextErrors[question.id] = 'Select an answer.'
      else selected.push({ question_id: question.id, choice_id: choiceId })
    }
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) return
    setPhase('submitting')
    const result = await submitStudentResponse(survey.id, selected)
    if ('ok' in result) {
      setPhase('success')
      return
    }
    if (result.code === 'closed') {
      setPhase('closed')
      return
    }
    if (result.code === 'duplicate') {
      setPhase('duplicate')
      return
    }
    setFormError(result.message)
    setPhase('form')
  }

  return (
    <main className="mx-auto min-h-svh max-w-xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-stone-950">{survey.title}</h1>
      {survey.description && (
        <p className="mt-2 text-lg text-stone-600">{survey.description}</p>
      )}
      <form
        className="mt-8"
        onSubmit={onSubmit}
        aria-busy={phase === 'submitting'}
      >
        {questions.map((question, index) => (
          <QuestionField
            key={question.id}
            question={question}
            index={index}
            selected={answers[question.id] ?? ''}
            error={errors[question.id]}
            disabled={phase === 'submitting'}
            onSelect={(choiceId) => {
              setAnswers((current) => ({ ...current, [question.id]: choiceId }))
              setErrors((current) => {
                const next = { ...current }
                delete next[question.id]
                return next
              })
            }}
          />
        ))}
        {formError && (
          <p role="alert" className="mt-6 text-sm text-red-700">
            {formError}
          </p>
        )}
        <button
          type="submit"
          className={`${primaryButton} mt-8 w-full text-base`}
          disabled={phase === 'submitting'}
        >
          {phase === 'submitting' ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </main>
  )
}

function QuestionField({
  question,
  index,
  selected,
  error,
  disabled,
  onSelect,
}: {
  question: Question
  index: number
  selected: string
  error?: string
  disabled: boolean
  onSelect: (choiceId: string) => void
}) {
  const errorId = `question-${question.id}-error`
  const choices = [...question.choices].sort((a, b) => a.position - b.position)

  return (
    <fieldset className="mt-8 border-0 p-0 first:mt-0" disabled={disabled}>
      <legend className="text-lg font-semibold text-stone-950">
        {index + 1}. {question.question_text}
      </legend>
      <div className="mt-3 space-y-3">
        {choices.map((choice) => {
          const isSelected = selected === choice.id
          return (
            <label
              key={choice.id}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-base ${
                isSelected
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-stone-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={choice.id}
                checked={isSelected}
                onChange={() => onSelect(choice.id)}
                className="size-5 accent-slate-900"
                aria-describedby={error ? errorId : undefined}
              />
              <span>{choice.choice_text}</span>
            </label>
          )
        })}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  )
}

function StudentMessage({ title, body }: { title: string; body?: string }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-5 py-10">
      <h1 className="text-3xl font-semibold text-stone-950">{title}</h1>
      {body && <p className="mt-3 text-lg text-stone-700">{body}</p>}
    </main>
  )
}
