import { supabase } from './supabase.ts'
import type {
  QuestionType,
  SelectedAnswer,
  Survey,
  SurveyResponse,
  SurveyStatus,
} from './types.ts'

const notConnected = 'This app is not connected to Supabase yet.'

type ChoiceRow = {
  id: string
  choice_text: string
  position: number
}

type QuestionRow = {
  id: string
  question_text: string
  question_type: QuestionType
  position: number
  min_value: number | null
  max_value: number | null
  rating_max: number | null
  choices: ChoiceRow[] | null
}

type AnswerRow = {
  question_id: string
  choice_id: string | null
  text_answer: string | null
  numeric_value: number | null
}

type ResponseRow = {
  id: string
  submitted_at: string
  anonymous_token: string | null
  answers: AnswerRow[] | null
}

type ResultsRow = {
  id: string
  title: string
  description: string | null
  status: SurveyStatus
  public_slug: string | null
  created_at: string
  updated_at: string
  owner_id: string | null
  course_id: string | null
  semester_id: string | null
  lms_course_url: string | null
  questions: QuestionRow[] | null
  responses: ResponseRow[] | null
}

export async function loadSurveyResults(
  id: string,
): Promise<
  | { survey: Survey; responses: SurveyResponse[] }
  | { missing: true }
  | { error: string }
> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase
    .from('surveys')
    .select(
      'id, title, description, status, public_slug, created_at, updated_at, owner_id, course_id, semester_id, lms_course_url, questions(id, question_text, question_type, position, min_value, max_value, rating_max, choices(id, choice_text, position)), responses(id, submitted_at, anonymous_token, answers(question_id, choice_id, text_answer, numeric_value))',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) {
    if (error.code === '22P02') return { missing: true }
    return { error: error.message }
  }
  if (!data) return { missing: true }
  return toResults(data as ResultsRow)
}

function toResults(row: ResultsRow) {
  const questions = [...(row.questions ?? [])].sort(
    (a, b) => a.position - b.position,
  )
  const responses = [...(row.responses ?? [])].sort((a, b) =>
    a.submitted_at.localeCompare(b.submitted_at),
  )
  const survey: Survey = {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    public_slug: row.public_slug,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner_id: row.owner_id,
    course_id: row.course_id,
    semester_id: row.semester_id,
    lms_course_url: row.lms_course_url,
    questions: questions.map((question) => ({
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      position: question.position,
      min_value: question.min_value,
      max_value: question.max_value,
      rating_max: question.rating_max,
      choices: [...(question.choices ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((choice) => ({
          id: choice.id,
          choice_text: choice.choice_text,
          position: choice.position,
        })),
    })),
  }

  return {
    survey,
    responses: responses.map((response) => ({
      id: response.id,
      survey_id: row.id,
      submitted_at: response.submitted_at,
      anonymous_token: response.anonymous_token,
      answers: collapseAnswers(response.answers ?? []),
    })),
  }
}

function collapseAnswers(rows: AnswerRow[]): SelectedAnswer[] {
  const byQuestion = new Map<string, SelectedAnswer>()
  for (const row of rows) {
    const existing = byQuestion.get(row.question_id)
    if (row.choice_id) {
      if (existing) {
        const ids = new Set(existing.choice_ids ?? [])
        if (existing.choice_id) ids.add(existing.choice_id)
        ids.add(row.choice_id)
        byQuestion.set(row.question_id, {
          question_id: row.question_id,
          choice_ids: [...ids],
        })
      } else {
        byQuestion.set(row.question_id, {
          question_id: row.question_id,
          choice_id: row.choice_id,
        })
      }
    } else {
      byQuestion.set(row.question_id, {
        question_id: row.question_id,
        text_answer: row.text_answer ?? undefined,
        numeric_value:
          row.numeric_value == null ? undefined : Number(row.numeric_value),
      })
    }
  }
  return [...byQuestion.values()]
}
