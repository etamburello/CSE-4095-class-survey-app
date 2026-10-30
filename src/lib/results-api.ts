import { supabase } from './supabase.ts'
import type {
  QuestionType,
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
  choices: ChoiceRow[] | null
}

type AnswerRow = {
  question_id: string
  choice_id: string | null
}

type ResponseRow = {
  id: string
  submitted_at: string
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
      'id, title, description, status, public_slug, created_at, updated_at, questions(id, question_text, question_type, position, choices(id, choice_text, position)), responses(id, submitted_at, answers(question_id, choice_id))',
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
    questions: questions.map((question) => ({
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      position: question.position,
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
      answers: (response.answers ?? [])
        .filter((answer) => answer.choice_id)
        .map((answer) => ({
          question_id: answer.question_id,
          choice_id: answer.choice_id as string,
        })),
    })),
  }
}
