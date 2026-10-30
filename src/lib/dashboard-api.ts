import type { QuestionType, SurveyStatus } from './types.ts'
import { supabase } from './supabase.ts'

const SLUG_ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789'

export type DashboardSurvey = {
  id: string
  title: string
  description: string
  status: SurveyStatus
  public_slug: string | null
  created_at: string
  updated_at: string
  questionCount: number
  responseCount: number
}

type SurveyRow = {
  id: string
  title: string
  description: string | null
  status: SurveyStatus
  public_slug: string | null
  created_at: string
  updated_at: string
  questions: { id: string }[] | null
  responses: { id: string }[] | null
}

type SourceChoice = { choice_text: string; position: number }
type SourceQuestion = {
  question_text: string
  question_type: QuestionType
  position: number
  choices: SourceChoice[] | null
}
type SourceSurvey = {
  title: string
  description: string | null
  questions: SourceQuestion[] | null
}

const notConnected = 'This app is not connected to Supabase yet.'

export async function listDashboardSurveys(): Promise<
  { surveys: DashboardSurvey[] } | { error: string }
> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase
    .from('surveys')
    .select(
      'id, title, description, status, public_slug, created_at, updated_at, questions(id), responses(id)',
    )
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  const surveys = ((data ?? []) as SurveyRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    public_slug: row.public_slug,
    created_at: row.created_at,
    updated_at: row.updated_at,
    questionCount: row.questions?.length ?? 0,
    responseCount: row.responses?.length ?? 0,
  }))
  return { surveys }
}

export async function activateDashboardSurvey(
  survey: DashboardSurvey,
  surveys: DashboardSurvey[],
) {
  if (!supabase) return notConnected
  if (survey.questionCount === 0) {
    return 'Add at least one question before activating.'
  }
  const { error: closeError } = await supabase
    .from('surveys')
    .update({ status: 'closed' })
    .eq('status', 'active')
    .neq('id', survey.id)
  if (closeError) return closeError.message

  const used = new Set(
    surveys
      .map((item) => item.public_slug)
      .filter((slug): slug is string => Boolean(slug)),
  )
  const publicSlug = survey.public_slug ?? createSlug(used)
  const { error } = await supabase
    .from('surveys')
    .update({ status: 'active', public_slug: publicSlug })
    .eq('id', survey.id)
  return error ? error.message : null
}

export async function closeDashboardSurvey(id: string) {
  return updateStatus(id, 'closed')
}

export async function archiveDashboardSurvey(id: string) {
  return updateStatus(id, 'archived')
}

export async function deleteDashboardSurvey(id: string) {
  if (!supabase) return notConnected
  const { error } = await supabase.from('surveys').delete().eq('id', id)
  return error ? error.message : null
}

export async function duplicateDashboardSurvey(id: string) {
  if (!supabase) return notConnected
  const { data, error } = await supabase
    .from('surveys')
    .select(
      'title, description, questions(question_text, question_type, position, choices(choice_text, position))',
    )
    .eq('id', id)
    .single()
  if (error) return error.message

  const source = data as SourceSurvey
  const { data: created, error: insertError } = await supabase
    .from('surveys')
    .insert({
      title: `Copy of ${source.title}`,
      description: source.description,
      status: 'draft',
    })
    .select('id')
    .single()
  if (insertError || !created) {
    return insertError?.message ?? 'The survey could not be duplicated.'
  }

  const surveyId = (created as { id: string }).id
  const questions = [...(source.questions ?? [])].sort(
    (a, b) => a.position - b.position,
  )
  for (const question of questions) {
    const { data: questionRow, error: questionError } = await supabase
      .from('questions')
      .insert({
        survey_id: surveyId,
        question_text: question.question_text,
        question_type: question.question_type,
        position: question.position,
      })
      .select('id')
      .single()
    if (questionError || !questionRow) {
      await supabase.from('surveys').delete().eq('id', surveyId)
      return questionError?.message ?? 'The survey could not be duplicated.'
    }

    const choices = [...(question.choices ?? [])].sort(
      (a, b) => a.position - b.position,
    )
    if (choices.length === 0) continue
    const { error: choiceError } = await supabase.from('choices').insert(
      choices.map((choice) => ({
        question_id: (questionRow as { id: string }).id,
        choice_text: choice.choice_text,
        position: choice.position,
      })),
    )
    if (choiceError) {
      await supabase.from('surveys').delete().eq('id', surveyId)
      return choiceError.message
    }
  }
  return null
}

async function updateStatus(id: string, status: SurveyStatus) {
  if (!supabase) return notConnected
  const { error } = await supabase
    .from('surveys')
    .update({ status })
    .eq('id', id)
  return error ? error.message : null
}

function createSlug(used: Set<string>) {
  let slug = ''
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    slug = Array.from(
      bytes,
      (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length],
    ).join('')
  } while (used.has(slug))
  return slug
}
