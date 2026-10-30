import { getAnonymousToken, rememberSubmittedSurvey } from './student-token.ts'
import { studentSupabase } from './supabase.ts'
import type {
  Question,
  QuestionType,
  SelectedAnswer,
  SurveyStatus,
} from './types.ts'

const notConnected = 'This survey is not available right now.'

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

type StudentRow = {
  id: string
  title: string
  description: string | null
  status: SurveyStatus
  questions: QuestionRow[] | null
}

export type StudentSurvey = {
  id: string
  title: string
  description: string
  status: SurveyStatus
  questions: Question[]
}

export type StudentSubmitResult =
  | { ok: true }
  | { code: 'closed' }
  | { code: 'duplicate' }
  | { code: 'invalid'; message: string }
  | { code: 'failed'; message: string }

export async function loadStudentSurvey(
  slug: string,
): Promise<{ survey: StudentSurvey } | { missing: true } | { error: string }> {
  if (!studentSupabase) return { error: notConnected }
  const { data, error } = await studentSupabase
    .from('surveys')
    .select(
      'id, title, description, status, questions(id, question_text, question_type, position, choices(id, choice_text, position))',
    )
    .eq('public_slug', slug)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { missing: true }
  return { survey: toSurvey(data as StudentRow) }
}

export async function submitStudentResponse(
  surveyId: string,
  answers: SelectedAnswer[],
): Promise<StudentSubmitResult> {
  if (!studentSupabase) return { code: 'failed', message: notConnected }
  const { error } = await studentSupabase.rpc('submit_survey_response', {
    p_survey_id: surveyId,
    p_anonymous_token: getAnonymousToken(),
    p_answers: answers,
  })
  if (!error) {
    rememberSubmittedSurvey(surveyId)
    return { ok: true }
  }
  const result = submissionResult(error.message)
  if ('code' in result && result.code === 'duplicate') {
    rememberSubmittedSurvey(surveyId)
  }
  return result
}

function submissionResult(message: string): StudentSubmitResult {
  if (message.includes('SURVEY_NOT_ACTIVE')) return { code: 'closed' }
  if (message.includes('DUPLICATE_RESPONSE')) return { code: 'duplicate' }
  if (
    message.includes('INVALID_QUESTION') ||
    message.includes('INVALID_CHOICE') ||
    message.includes('MISSING_REQUIRED_ANSWER')
  ) {
    return { code: 'invalid', message: 'Choose one answer for every question.' }
  }
  return {
    code: 'failed',
    message: 'Your response could not be submitted. Try again.',
  }
}

function toSurvey(row: StudentRow): StudentSurvey {
  const questions = [...(row.questions ?? [])].sort(
    (a, b) => a.position - b.position,
  )
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
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
}
