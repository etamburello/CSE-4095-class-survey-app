import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { FieldError } from '../components/FieldError.tsx'
import { InstructorLayout } from '../components/InstructorLayout.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { generateQuestionsWithAi } from '../lib/ai-api.ts'
import {
  bankToQuestion,
  listBankQuestions,
  saveQuestionToBank,
} from '../lib/bank-api.ts'
import {
  closeDashboardSurvey,
  duplicateDashboardSurvey,
} from '../lib/dashboard-api.ts'
import {
  activateEditorSurvey,
  loadEditorSurvey,
  saveEditorSurvey,
} from '../lib/editor-api.ts'
import {
  addSurveyInstructor,
  listSurveyInstructors,
  removeSurveyInstructor,
} from '../lib/instructor-api.ts'
import { listCourses, listSemesters } from '../lib/org-api.ts'
import {
  createChoice,
  createQuestion,
  createBlankSurvey,
  moveById,
  normalizeSurvey,
  QUESTION_TYPE_LABELS,
  ratingChoices,
  validateSurvey,
} from '../lib/survey-form.ts'
import {
  exportSurveyJson,
  parseSurveyJson,
  parseSurveyMarkdown,
} from '../lib/survey-io.ts'
import {
  fieldLabel,
  primaryButton,
  secondaryButton,
  textInput,
} from '../lib/styles.ts'
import type {
  BankQuestion,
  Course,
  InstructorProfile,
  Question,
  QuestionType,
  Semester,
  Survey,
} from '../lib/types.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function SurveyEditorPage() {
  const { id } = useParams()
  usePageTitle(id ? 'Edit Survey' : 'New Survey')
  if (!id) return <NewSurveyEditor />
  return <ExistingSurveyEditor id={id} />
}

function ExistingSurveyEditor({ id }: { id: string }) {
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    void loadEditorSurvey(id).then((result) => {
      if (cancelled) return
      if ('missing' in result) {
        setSurvey(null)
        setMissing(true)
        setError(undefined)
      } else if ('error' in result) {
        setSurvey(null)
        setMissing(false)
        setError(result.error)
      } else {
        setSurvey(result.survey)
        setMissing(false)
        setError(undefined)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <InstructorLayout title="Edit Survey">
        <p role="status" className="text-lg text-stone-700">
          Loading survey...
        </p>
      </InstructorLayout>
    )
  }

  if (missing) {
    return (
      <InstructorLayout title="Edit Survey">
        <h2 className="text-2xl font-semibold">Survey not found.</h2>
        <Link to="/dashboard" className={`${secondaryButton} mt-6`}>
          Back to Dashboard
        </Link>
      </InstructorLayout>
    )
  }

  if (error || !survey) {
    return (
      <InstructorLayout title="Edit Survey">
        <p role="alert" className="text-sm text-red-700">
          {error ?? 'The survey could not be loaded.'}
        </p>
        <Link to="/dashboard" className={`${secondaryButton} mt-6`}>
          Back to Dashboard
        </Link>
      </InstructorLayout>
    )
  }

  if (survey.status === 'active') {
    return (
      <ActiveSurveyGate
        survey={survey}
        onClosed={() => setSurvey({ ...survey, status: 'closed' })}
      />
    )
  }

  if (survey.status === 'archived')
    return <ArchivedSurveyGate survey={survey} />

  return <EditorForm key={survey.id} initial={survey} />
}

function ActiveSurveyGate({
  survey,
  onClosed,
}: {
  survey: Survey
  onClosed: () => void
}) {
  const [confirmClose, setConfirmClose] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string>()

  async function onConfirm() {
    setClosing(true)
    const message = await closeDashboardSurvey(survey.id)
    if (message) {
      setError(message)
      setClosing(false)
      return
    }
    onClosed()
  }

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
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButton}
          onClick={() => setConfirmClose(true)}
        >
          Close Survey
        </button>
        <Link to={`/surveys/${survey.id}/present`} className={secondaryButton}>
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
          busy={closing}
          onConfirm={() => void onConfirm()}
          onCancel={() => {
            if (!closing) setConfirmClose(false)
          }}
        />
      )}
    </InstructorLayout>
  )
}

function ArchivedSurveyGate({ survey }: { survey: Survey }) {
  const navigate = useNavigate()
  const [duplicating, setDuplicating] = useState(false)
  const [error, setError] = useState<string>()

  async function onDuplicate() {
    setDuplicating(true)
    const result = await duplicateDashboardSurvey(survey.id)
    if ('error' in result) {
      setError(result.error)
      setDuplicating(false)
      return
    }
    navigate(`/surveys/${result.id}/edit`)
  }

  return (
    <InstructorLayout title="Edit Survey">
      <h2 className="text-2xl font-semibold text-stone-950">{survey.title}</h2>
      <p className="mt-3 max-w-xl text-base text-stone-700">
        Archived surveys cannot be edited. Duplicate this survey to make a new
        draft.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButton}
          onClick={() => void onDuplicate()}
          disabled={duplicating}
        >
          {duplicating ? 'Duplicating...' : 'Duplicate'}
        </button>
        <Link to={`/surveys/${survey.id}/results`} className={secondaryButton}>
          Results
        </Link>
      </div>
    </InstructorLayout>
  )
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
  const [draft, setDraft] = useState(() => structuredClone(initial))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState(() => {
    const state = location.state as { notice?: string } | null
    return state?.notice ?? ''
  })
  const [formError, setFormError] = useState(() => {
    const state = location.state as { error?: string } | null
    return state?.error ?? ''
  })
  const [busy, setBusy] = useState<'save' | 'activate' | null>(null)
  const busyRef = useRef(false)
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(
    null,
  )
  const [courses, setCourses] = useState<Course[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [bank, setBank] = useState<BankQuestion[]>([])
  const [collaborators, setCollaborators] = useState<InstructorProfile[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [aiTopic, setAiTopic] = useState('')
  const [aiCount, setAiCount] = useState(3)
  const [aiBusy, setAiBusy] = useState(false)
  usePageTitle(
    initial.status === 'draft' && initial.title === ''
      ? 'New Survey'
      : 'Edit Survey',
  )

  useEffect(() => {
    void Promise.all([listCourses(), listSemesters(), listBankQuestions()]).then(
      ([courseResult, semesterResult, bankResult]) => {
        if ('courses' in courseResult) setCourses(courseResult.courses)
        if ('semesters' in semesterResult) setSemesters(semesterResult.semesters)
        if ('questions' in bankResult) setBank(bankResult.questions)
      },
    )
  }, [])

  useEffect(() => {
    if (!initial.id || redirectOnSave) return
    void listSurveyInstructors(initial.id).then((result) => {
      if ('instructors' in result) setCollaborators(result.instructors)
    })
  }, [initial.id, redirectOnSave])

  function changeDraft(next: Survey) {
    setNotice('')
    setFormError('')
    setErrors({})
    setDraft(next)
  }

  async function persist(mode: 'save' | 'activate') {
    if (busyRef.current) return
    busyRef.current = true
    const normalized = normalizeSurvey(draft)
    const nextErrors = validateSurvey(normalized, mode)
    setErrors(nextErrors)
    setFormError('')
    setNotice('')
    if (Object.keys(nextErrors).length > 0) {
      busyRef.current = false
      return
    }
    setDraft(normalized)
    setBusy(mode === 'save' ? 'save' : 'activate')
    const saved = await saveEditorSurvey(normalized)
    if ('error' in saved) {
      setFormError(saved.error)
      busyRef.current = false
      setBusy(null)
      return
    }
    if (mode === 'save') {
      busyRef.current = false
      setBusy(null)
      if (redirectOnSave) {
        navigate(`/surveys/${saved.survey.id}/edit`, {
          replace: true,
          state: { notice: 'Saved' },
        })
        return
      }
      setDraft(saved.survey)
      setNotice('Saved')
      return
    }

    const activated = await activateEditorSurvey(saved.survey)
    busyRef.current = false
    setBusy(null)
    if ('error' in activated) {
      setDraft(saved.survey)
      setFormError(activated.error)
      if (redirectOnSave) {
        navigate(`/surveys/${saved.survey.id}/edit`, {
          replace: true,
          state: { error: activated.error },
        })
      }
      return
    }
    navigate(`/surveys/${activated.survey.id}/present`, { replace: true })
  }

  function replaceQuestionType(question: Question, type: QuestionType): Question {
    const next = createQuestion(type)
    return {
      ...next,
      id: question.id,
      question_text: question.question_text,
      position: question.position,
    }
  }

  async function onGenerateAi() {
    setAiBusy(true)
    setFormError('')
    const result = await generateQuestionsWithAi({
      title: draft.title,
      description: draft.description,
      topic: aiTopic || draft.title,
      count: aiCount,
    })
    setAiBusy(false)
    if ('error' in result) {
      setFormError(result.error)
      return
    }
    changeDraft({
      ...draft,
      questions: [...draft.questions, ...result.questions],
    })
    setNotice(`Added ${result.questions.length} AI-generated question(s).`)
  }

  async function onInvite() {
    if (!inviteEmail.trim()) return
    const saved = await saveEditorSurvey(normalizeSurvey(draft))
    if ('error' in saved) {
      setFormError(saved.error)
      return
    }
    setDraft(saved.survey)
    const result = await addSurveyInstructor(saved.survey.id, inviteEmail)
    if (result.error) {
      setFormError(result.error)
      return
    }
    setInviteEmail('')
    const list = await listSurveyInstructors(saved.survey.id)
    if ('instructors' in list) setCollaborators(list.instructors)
    setNotice('Instructor added.')
  }

  const pageTitle = redirectOnSave ? 'New Survey' : 'Edit Survey'

  return (
    <InstructorLayout title={pageTitle}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void persist('save')
        }}
      >
        {formError && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {formError}
          </p>
        )}
        {!redirectOnSave && (
          <p className="mb-4 flex items-center gap-2 text-sm text-stone-700">
            Status: <StatusBadge status={draft.status} />
          </p>
        )}
        <fieldset
          disabled={busy !== null}
          className="min-w-0 border-0 p-0 disabled:opacity-70"
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

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="survey-course" className={fieldLabel}>
                Course
              </label>
              <select
                id="survey-course"
                value={draft.course_id ?? ''}
                onChange={(event) =>
                  changeDraft({
                    ...draft,
                    course_id: event.target.value || null,
                  })
                }
                className={textInput}
              >
                <option value="">None</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="survey-semester" className={fieldLabel}>
                Semester
              </label>
              <select
                id="survey-semester"
                value={draft.semester_id ?? ''}
                onChange={(event) =>
                  changeDraft({
                    ...draft,
                    semester_id: event.target.value || null,
                  })
                }
                className={textInput}
              >
                <option value="">None</option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="lms-url" className={fieldLabel}>
              LMS course URL (optional)
            </label>
            <input
              id="lms-url"
              value={draft.lms_course_url ?? ''}
              onChange={(event) =>
                changeDraft({
                  ...draft,
                  lms_course_url: event.target.value,
                })
              }
              className={textInput}
              placeholder="https://canvas.example.edu/courses/123"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => exportSurveyJson(draft)}
            >
              Export JSON
            </button>
            <label className={secondaryButton}>
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  void file.text().then((text) => {
                    try {
                      changeDraft(parseSurveyJson(text))
                      setNotice('Imported survey from JSON.')
                    } catch (err) {
                      setFormError(
                        err instanceof Error
                          ? err.message
                          : 'Could not import JSON.',
                      )
                    }
                  })
                }}
              />
            </label>
            <label className={secondaryButton}>
              Import Markdown
              <input
                type="file"
                accept=".md,text/markdown,text/plain"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  void file.text().then((text) => {
                    try {
                      changeDraft(parseSurveyMarkdown(text))
                      setNotice('Imported survey from Markdown.')
                    } catch (err) {
                      setFormError(
                        err instanceof Error
                          ? err.message
                          : 'Could not import Markdown.',
                      )
                    }
                  })
                }}
              />
            </label>
          </div>

          <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-stone-950">
              AI question generator
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="ai-topic" className={fieldLabel}>
                  Topic
                </label>
                <input
                  id="ai-topic"
                  value={aiTopic}
                  onChange={(event) => setAiTopic(event.target.value)}
                  className={textInput}
                  placeholder="Lecture clarity"
                />
              </div>
              <div>
                <label htmlFor="ai-count" className={fieldLabel}>
                  Count
                </label>
                <input
                  id="ai-count"
                  type="number"
                  min={1}
                  max={10}
                  value={aiCount}
                  onChange={(event) =>
                    setAiCount(Number(event.target.value) || 1)
                  }
                  className={textInput}
                />
              </div>
            </div>
            <button
              type="button"
              className={`${secondaryButton} mt-3`}
              disabled={aiBusy}
              onClick={() => void onGenerateAi()}
            >
              {aiBusy ? 'Generating...' : 'Generate with AI'}
            </button>
          </section>

          {!redirectOnSave && (
            <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-stone-950">
                Instructors
              </h2>
              <ul className="mt-3 space-y-1 text-sm text-stone-800">
                {collaborators.map((person) => (
                  <li
                    key={person.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>{person.email}</span>
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() =>
                        void removeSurveyInstructor(draft.id, person.id).then(
                          async () => {
                            const list = await listSurveyInstructors(draft.id)
                            if ('instructors' in list)
                              setCollaborators(list.instructors)
                          },
                        )
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className={`${textInput} sm:max-w-xs`}
                  placeholder="colleague@school.edu"
                />
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => void onInvite()}
                >
                  Add instructor
                </button>
              </div>
            </section>
          )}

          {bank.length > 0 && (
            <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-stone-950">
                Add from question bank
              </h2>
              <ul className="mt-3 space-y-2">
                {bank.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="text-sm text-stone-800">
                      <span className="font-medium">
                        {QUESTION_TYPE_LABELS[item.question_type]}:
                      </span>{' '}
                      {item.question_text}
                    </span>
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() =>
                        changeDraft({
                          ...draft,
                          questions: [
                            ...draft.questions,
                            bankToQuestion(item),
                          ],
                        })
                      }
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-6 space-y-4">
            {draft.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                total={draft.questions.length}
                errors={errors}
                onChange={(next) =>
                  changeDraft({
                    ...draft,
                    questions: draft.questions.map((item) =>
                      item.id === question.id ? next : item,
                    ),
                  })
                }
                onType={(type) =>
                  changeDraft({
                    ...draft,
                    questions: draft.questions.map((item) =>
                      item.id === question.id
                        ? replaceQuestionType(item, type)
                        : item,
                    ),
                  })
                }
                onMove={(direction) =>
                  changeDraft({
                    ...draft,
                    questions: moveById(
                      draft.questions,
                      question.id,
                      direction,
                    ),
                  })
                }
                onDelete={() => setQuestionToDelete(question)}
                onSaveToBank={() =>
                  void saveQuestionToBank(question).then((result) => {
                    if (result.error) setFormError(result.error)
                    else {
                      setNotice('Saved to question bank.')
                      void listBankQuestions().then((bankResult) => {
                        if ('questions' in bankResult)
                          setBank(bankResult.questions)
                      })
                    }
                  })
                }
              />
            ))}
          </div>

          <FieldError>{errors.questions}</FieldError>

          <div className="mt-6 flex flex-wrap gap-2">
            {(
              Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]
            ).map((type) => (
              <button
                key={type}
                type="button"
                className={secondaryButton}
                onClick={() =>
                  changeDraft({
                    ...draft,
                    questions: [...draft.questions, createQuestion(type)],
                  })
                }
              >
                + {QUESTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="submit" className={secondaryButton}>
              {busy === 'save'
                ? 'Saving...'
                : draft.status === 'draft'
                  ? 'Save Draft'
                  : 'Save'}
            </button>
            <button
              type="button"
              className={primaryButton}
              onClick={() => void persist('activate')}
            >
              {busy === 'activate' ? 'Activating...' : 'Activate'}
            </button>
            {notice && (
              <p role="status" className="text-sm font-medium text-stone-700">
                {notice}
              </p>
            )}
          </div>
        </fieldset>
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
  onChange,
  onType,
  onMove,
  onDelete,
  onSaveToBank,
}: {
  question: Question
  index: number
  total: number
  errors: Record<string, string>
  onChange: (question: Question) => void
  onType: (type: QuestionType) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onSaveToBank: () => void
}) {
  const questionErrorId = `question-${question.id}-error`
  const editableChoices =
    question.question_type === 'multiple_choice' ||
    question.question_type === 'checkbox'

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
            aria-label={`Move question ${index + 1} up`}
          >
            Up
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label={`Move question ${index + 1} down`}
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
          onChange={(event) =>
            onChange({ ...question, question_text: event.target.value })
          }
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
          {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
            <option key={type} value={type}>
              {QUESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {question.question_type === 'rating_scale' && (
        <div className="mt-4 sm:max-w-xs">
          <label htmlFor={`rating-${question.id}`} className={fieldLabel}>
            Scale max (2–10)
          </label>
          <input
            id={`rating-${question.id}`}
            type="number"
            min={2}
            max={10}
            value={question.rating_max ?? 5}
            onChange={(event) => {
              const rating_max = Number(event.target.value) || 5
              onChange({
                ...question,
                rating_max,
                choices: ratingChoices(rating_max),
              })
            }}
            className={textInput}
          />
          <FieldError>{errors[`rating-${question.id}`]}</FieldError>
        </div>
      )}

      {question.question_type === 'numeric' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:max-w-md">
          <div>
            <label htmlFor={`min-${question.id}`} className={fieldLabel}>
              Minimum
            </label>
            <input
              id={`min-${question.id}`}
              type="number"
              value={question.min_value ?? ''}
              onChange={(event) =>
                onChange({
                  ...question,
                  min_value:
                    event.target.value === ''
                      ? null
                      : Number(event.target.value),
                })
              }
              className={textInput}
            />
          </div>
          <div>
            <label htmlFor={`max-${question.id}`} className={fieldLabel}>
              Maximum
            </label>
            <input
              id={`max-${question.id}`}
              type="number"
              value={question.max_value ?? ''}
              onChange={(event) =>
                onChange({
                  ...question,
                  max_value:
                    event.target.value === ''
                      ? null
                      : Number(event.target.value),
                })
              }
              className={textInput}
            />
          </div>
          <FieldError>{errors[`numeric-${question.id}`]}</FieldError>
        </div>
      )}

      {question.question_type === 'true_false' && (
        <ul className="mt-4 space-y-2 text-base text-stone-800">
          <li className="rounded-md border border-stone-200 px-3 py-2">True</li>
          <li className="rounded-md border border-stone-200 px-3 py-2">
            False
          </li>
        </ul>
      )}

      {question.question_type === 'rating_scale' && (
        <p className="mt-4 text-sm text-stone-700">
          Choices: {question.choices.map((choice) => choice.choice_text).join(', ')}
        </p>
      )}

      {editableChoices && (
        <fieldset className="mt-4 border-0 p-0">
          <legend className={fieldLabel}>Choices</legend>
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
                      onChange({
                        ...question,
                        choices: question.choices.map((item) =>
                          item.id === choice.id
                            ? { ...item, choice_text: event.target.value }
                            : item,
                        ),
                      })
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
                  onClick={() =>
                    onChange({
                      ...question,
                      choices: moveById(question.choices, choice.id, -1),
                    })
                  }
                  disabled={choiceIndex === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() =>
                    onChange({
                      ...question,
                      choices: moveById(question.choices, choice.id, 1),
                    })
                  }
                  disabled={choiceIndex === question.choices.length - 1}
                >
                  Down
                </button>
                {question.choices.length > 2 && (
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() =>
                      onChange({
                        ...question,
                        choices: question.choices.filter(
                          (item) => item.id !== choice.id,
                        ),
                      })
                    }
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
              onClick={() =>
                onChange({
                  ...question,
                  choices: [...question.choices, createChoice()],
                })
              }
            >
              + Add Choice
            </button>
          </div>
        </fieldset>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} onClick={onSaveToBank}>
          Save to bank
        </button>
        <button type="button" className={secondaryButton} onClick={onDelete}>
          Delete Question
        </button>
      </div>
    </article>
  )
}
