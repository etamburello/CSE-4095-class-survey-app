import { useEffect, useState } from 'react'
import { InstructorLayout } from '../components/InstructorLayout.tsx'
import { deleteBankQuestion, listBankQuestions } from '../lib/bank-api.ts'
import { QUESTION_TYPE_LABELS } from '../lib/survey-form.ts'
import { secondaryButton } from '../lib/styles.ts'
import type { BankQuestion } from '../lib/types.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function QuestionBankPage() {
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [busyId, setBusyId] = useState<string>()
  usePageTitle('Question Bank')

  async function reload() {
    const result = await listBankQuestions()
    if ('error' in result) setError(result.error)
    else {
      setQuestions(result.questions)
      setError(undefined)
    }
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onDelete(id: string) {
    setBusyId(id)
    const result = await deleteBankQuestion(id)
    if (result.error) setError(result.error)
    else await reload()
    setBusyId(undefined)
  }

  return (
    <InstructorLayout title="Question Bank">
      <p className="text-stone-700">
        Save questions from the survey editor, then reuse them in new surveys.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-8 text-lg text-stone-700">
          Loading question bank...
        </p>
      ) : questions.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-700">
          No saved questions yet. Open a survey editor and use Save to bank.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {questions.map((question) => (
            <li
              key={question.id}
              className="rounded-lg border border-stone-200 bg-white p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {QUESTION_TYPE_LABELS[question.question_type]}
              </p>
              <p className="mt-1 text-lg font-semibold text-stone-950">
                {question.question_text}
              </p>
              {question.choices.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-700">
                  {question.choices.map((choice) => (
                    <li key={choice.id}>{choice.choice_text}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className={`${secondaryButton} mt-4`}
                disabled={busyId === question.id}
                onClick={() => void onDelete(question.id)}
              >
                {busyId === question.id ? 'Removing...' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </InstructorLayout>
  )
}
