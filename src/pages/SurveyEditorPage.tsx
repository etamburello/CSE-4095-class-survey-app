import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { FieldError } from '../components/FieldError.tsx'
import { InstructorLayout } from '../components/InstructorLayout.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import {
  createChoice,
  createQuestion,
  createBlankSurvey,
  moveById,
  normalizeSurvey,
  validateSurvey,
} from '../lib/survey-form.ts'
import {
  fieldLabel,
  primaryButton,
  secondaryButton,
  textInput,
} from '../lib/styles.ts'
import type { Question, QuestionType, Survey } from '../lib/types.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useSurveys } from '../lib/useSurveys.ts'

export function SurveyEditorPage() {
  const { id } = useParams()
  const { getSurvey, closeSurvey, duplicateSurvey } = useSurveys()
  const navigate = useNavigate()
  const survey = id ? getSurvey(id) : undefined
  const [confirmClose, setConfirmClose] = useState(false)

  const title = !id ? 'New Survey' : survey ? 'Edit Survey' : 'Survey not found'
  usePageTitle(title)

  if (id && !survey) {
    return (
      <InstructorLayout title="Edit Survey">
        <h2 className="text-2xl font-semibold">Survey not found.</h2>
        <Link to="/dashboard" className={`${secondaryButton} mt-6`}>
          Back to Dashboard
        </Link>
      </InstructorLayout>
    )
  }

  if (survey?.status === 'active') {
    return (
      <InstructorLayout title="Edit Survey">
        <p className="flex items-center gap-2 text-sm text-stone-700">
          Status: <StatusBadge status={survey.status} />
        </p>
        <h2 className="mt-4 text-2xl font-semibold text-stone-950">
          {survey.title}
        </h2>
        <p className="mt-3 max-w-xl text-base text-stone-700">
          This survey is active. Close it before editing.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButton}
            onClick={() => setConfirmClose(true)}
          >
            Close Survey
          </button>
          <Link
            to={`/surveys/${survey.id}/present`}
            className={secondaryButton}
          >
            Present
          </Link>
          <Link to="/dashboard" className={secondaryButton}>
            Back to Dashboard
          </Link>
        </div>
        {confirmClose && (
          <ConfirmDialog
            title={`Close "${survey.title}"?`}
            body="Students will no longer be able to submit responses. You can edit the survey after it is closed."
            confirmLabel="Close"
            onConfirm={() => {
              closeSurvey(survey.id)
              setConfirmClose(false)
            }}
            onCancel={() => setConfirmClose(false)}
          />
        )}
      </InstructorLayout>
    )
  }

  if (survey?.status === 'archived') {
    return (
      <InstructorLayout title="Edit Survey">
        <h2 className="text-2xl font-semibold text-stone-950">
          {survey.title}
        </h2>
        <p className="mt-3 max-w-xl text-base text-stone-700">
          Archived surveys cannot be edited. Duplicate this survey to make a new
          draft.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButton}
            onClick={() => {
              const copyId = duplicateSurvey(survey.id)
              if (copyId) navigate(`/surveys/${copyId}/edit`)
            }}
          >
            Duplicate
          </button>
          <Link
            to={`/surveys/${survey.id}/results`}
            className={secondaryButton}
          >
            Results
          </Link>
        </div>
      </InstructorLayout>
    )
  }

  if (!survey) return <NewSurveyEditor />
  return <EditorForm key={survey.id} initial={survey} />
}

function NewSurveyEditor() {
  const [initial] = useState(createBlankSurvey)
  return <EditorForm initial={initial} redirectOnSave />
}

function EditorForm({
  initial,
  redirectOnSave = false,
}: {
  initial: Survey
  redirectOnSave?: boolean
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { saveSurvey, activateSurvey } = useSurveys()
  const [draft, setDraft] = useState(() => structuredClone(initial))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState(() => {
    const state = location.state as { notice?: string } | null
    return state?.notice ?? ''
  })
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(
    null,
  )
  usePageTitle(
    initial.status === 'draft' && initial.title === ''
      ? 'New Survey'
      : 'Edit Survey',
  )

  function changeDraft(next: Survey) {
    setNotice('')
    setErrors({})
    setDraft(next)
  }

  function onSave() {
    const normalized = normalizeSurvey(draft)
    const nextErrors = validateSurvey(normalized, 'save')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setDraft(normalized)
    saveSurvey(normalized)
    if (redirectOnSave) {
      navigate(`/surveys/${normalized.id}/edit`, {
        replace: true,
        state: { notice: 'Saved' },
      })
      return
    }
    setNotice('Saved')
  }

  function onActivate() {
    const normalized = normalizeSurvey(draft)
    const nextErrors = validateSurvey(normalized, 'activate')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setDraft(normalized)
    saveSurvey(normalized)
    activateSurvey(normalized.id)
    navigate(`/surveys/${normalized.id}/present`)
  }

  const pageTitle = redirectOnSave ? 'New Survey' : 'Edit Survey'

  return (
    <InstructorLayout title={pageTitle}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <div>
          <label htmlFor="survey-title" className={fieldLabel}>
            Survey Title
          </label>
          <input
            id="survey-title"
            value={draft.title}
            onChange={(event) =>
              changeDraft({ ...draft, title: event.target.value })
            }
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? 'survey-title-error' : undefined}
            className={textInput}
          />
          <FieldError id="survey-title-error">{errors.title}</FieldError>
        </div>

        <div className="mt-4">
          <label htmlFor="survey-description" className={fieldLabel}>
            Description
          </label>
          <textarea
            id="survey-description"
            rows={3}
            value={draft.description}
            onChange={(event) =>
              changeDraft({ ...draft, description: event.target.value })
            }
            className={textInput}
          />
        </div>

        <div className="mt-6 space-y-4">
          {draft.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              total={draft.questions.length}
              errors={errors}
              onText={(text) =>
                changeDraft({
                  ...draft,
                  questions: draft.questions.map((item) =>
                    item.id === question.id
                      ? { ...item, question_text: text }
                      : item,
                  ),
                })
              }
              onType={(type) =>
                changeDraft({
                  ...draft,
                  questions: draft.questions.map((item) => {
                    if (item.id !== question.id) return item
                    if (type === 'true_false') {
                      return {
                        ...item,
                        question_type: type,
                        choices: [createChoice('True'), createChoice('False')],
                      }
                    }
                    const isFixedPair =
                      item.choices.length === 2 &&
                      item.choices[0]?.choice_text === 'True' &&
                      item.choices[1]?.choice_text === 'False'
                    return {
                      ...item,
                      question_type: type,
                      choices: isFixedPair
                        ? [createChoice(), createChoice()]
                        : item.choices,
                    }
                  }),
                })
              }
              onMove={(direction) =>
                changeDraft({
                  ...draft,
                  questions: moveById(draft.questions, question.id, direction),
                })
              }
              onDelete={() => setQuestionToDelete(question)}
              onChoiceText={(choiceId, text) =>
                changeDraft({
                  ...draft,
                  questions: draft.questions.map((item) =>
                    item.id === question.id
                      ? {
                          ...item,
                          choices: item.choices.map((choice) =>
                            choice.id === choiceId
                              ? { ...choice, choice_text: text }
                              : choice,
                          ),
                        }
                      : item,
                  ),
                })
              }
              onAddChoice={() =>
                changeDraft({
                  ...draft,
                  questions: draft.questions.map((item) =>
                    item.id === question.id
                      ? { ...item, choices: [...item.choices, createChoice()] }
                      : item,
                  ),
                })
              }
              onRemoveChoice={(choiceId) =>
                changeDraft({
                  ...draft,
                  questions: draft.questions.map((item) =>
                    item.id === question.id
                      ? {
                          ...item,
                          choices: item.choices.filter(
                            (choice) => choice.id !== choiceId,
                          ),
                        }
                      : item,
                  ),
                })
              }
              onMoveChoice={(choiceId, direction) =>
                changeDraft({
                  ...draft,
                  questions: draft.questions.map((item) =>
                    item.id === question.id
                      ? {
                          ...item,
                          choices: moveById(item.choices, choiceId, direction),
                        }
                      : item,
                  ),
                })
              }
            />
          ))}
        </div>

        <FieldError>{errors.questions}</FieldError>

        <button
          type="button"
          className={`${secondaryButton} mt-6`}
          onClick={() =>
            changeDraft({
              ...draft,
              questions: [...draft.questions, createQuestion()],
            })
          }
        >
          + Add Question
        </button>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="submit" className={secondaryButton}>
            {draft.status === 'draft' ? 'Save Draft' : 'Save'}
          </button>
          <button type="button" className={primaryButton} onClick={onActivate}>
            Activate
          </button>
          {notice && (
            <p role="status" className="text-sm font-medium text-stone-700">
              {notice}
            </p>
          )}
        </div>
      </form>

      {questionToDelete && (
        <ConfirmDialog
          title={`Delete question ${draft.questions.findIndex((item) => item.id === questionToDelete.id) + 1}?`}
          body="This removes the question from the survey."
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            changeDraft({
              ...draft,
              questions: draft.questions.filter(
                (item) => item.id !== questionToDelete.id,
              ),
            })
            setQuestionToDelete(null)
          }}
          onCancel={() => setQuestionToDelete(null)}
        />
      )}
    </InstructorLayout>
  )
}

function QuestionCard({
  question,
  index,
  total,
  errors,
  onText,
  onType,
  onMove,
  onDelete,
  onChoiceText,
  onAddChoice,
  onRemoveChoice,
  onMoveChoice,
}: {
  question: Question
  index: number
  total: number
  errors: Record<string, string>
  onText: (text: string) => void
  onType: (type: QuestionType) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onChoiceText: (choiceId: string, text: string) => void
  onAddChoice: () => void
  onRemoveChoice: (choiceId: string) => void
  onMoveChoice: (choiceId: string, direction: -1 | 1) => void
}) {
  const questionErrorId = `question-${question.id}-error`

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-950">
          Question {index + 1}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            className={secondaryButton}
            onClick={() => onMove(-1)}
            disabled={index === 0}
          >
            Up
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => onMove(1)}
            disabled={index === total - 1}
          >
            Down
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor={`question-${question.id}`} className={fieldLabel}>
          Question text
        </label>
        <input
          id={`question-${question.id}`}
          value={question.question_text}
          onChange={(event) => onText(event.target.value)}
          aria-invalid={errors[`question-${question.id}`] ? true : undefined}
          aria-describedby={
            errors[`question-${question.id}`] ? questionErrorId : undefined
          }
          className={textInput}
        />
        <FieldError id={questionErrorId}>
          {errors[`question-${question.id}`]}
        </FieldError>
      </div>

      <div className="mt-4 sm:max-w-xs">
        <label htmlFor={`type-${question.id}`} className={fieldLabel}>
          Type
        </label>
        <select
          id={`type-${question.id}`}
          value={question.question_type}
          onChange={(event) => onType(event.target.value as QuestionType)}
          className={textInput}
        >
          <option value="multiple_choice">Multiple Choice</option>
          <option value="true_false">True / False</option>
        </select>
      </div>

      <fieldset className="mt-4 border-0 p-0">
        <legend className={fieldLabel}>Choices</legend>
        {question.question_type === 'true_false' ? (
          <ul className="mt-2 space-y-2 text-base text-stone-800">
            <li className="rounded-md border border-stone-200 px-3 py-2">
              True
            </li>
            <li className="rounded-md border border-stone-200 px-3 py-2">
              False
            </li>
          </ul>
        ) : (
          <div className="mt-2 space-y-3">
            {question.choices.map((choice, choiceIndex) => (
              <div key={choice.id} className="flex flex-wrap items-start gap-2">
                <div className="min-w-[12rem] flex-1">
                  <label htmlFor={choice.id} className="sr-only">
                    Choice {choiceIndex + 1}
                  </label>
                  <input
                    id={choice.id}
                    value={choice.choice_text}
                    onChange={(event) =>
                      onChoiceText(choice.id, event.target.value)
                    }
                    aria-invalid={
                      errors[`choice-${choice.id}`] ? true : undefined
                    }
                    aria-describedby={
                      errors[`choice-${choice.id}`]
                        ? `choice-${choice.id}-error`
                        : undefined
                    }
                    className={textInput}
                  />
                  <FieldError id={`choice-${choice.id}-error`}>
                    {errors[`choice-${choice.id}`]}
                  </FieldError>
                </div>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => onMoveChoice(choice.id, -1)}
                  disabled={choiceIndex === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => onMoveChoice(choice.id, 1)}
                  disabled={choiceIndex === question.choices.length - 1}
                >
                  Down
                </button>
                {question.choices.length > 2 && (
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() => onRemoveChoice(choice.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <FieldError>{errors[`choices-${question.id}`]}</FieldError>
            <button
              type="button"
              className={secondaryButton}
              onClick={onAddChoice}
            >
              + Add Choice
            </button>
          </div>
        )}
      </fieldset>

      <button
        type="button"
        className={`${secondaryButton} mt-4`}
        onClick={onDelete}
      >
        Delete Question
      </button>
    </article>
  )
}
