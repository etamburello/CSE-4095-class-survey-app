import type { Question, QuestionType, Survey, SurveyStatus } from './types.ts'
import { ensureInstructor } from './instructor-api.ts'
import { supabase } from './supabase.ts'

const SLUG_ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789'
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

type EditorRow = {
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
}

const surveyColumns =
  'id, title, description, status, public_slug, created_at, updated_at, owner_id, course_id, semester_id, lms_course_url, questions(id, question_text, question_type, position, min_value, max_value, rating_max, choices(id, choice_text, position))'

export async function loadEditorSurvey(
  id: string,
): Promise<{ survey: Survey } | { error: string } | { missing: true }> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase
    .from('surveys')
    .select(surveyColumns)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    if (error.code === '22P02') return { missing: true }
    return { error: error.message }
  }
  if (!data) return { missing: true }
  return { survey: toSurvey(data as EditorRow) }
}

export async function saveEditorSurvey(
  survey: Survey,
): Promise<{ survey: Survey } | { error: string }> {
  if (!supabase) return { error: notConnected }

  const profile = await ensureInstructor()
  if ('error' in profile) return { error: profile.error }

  const { data: existing, error: lookupError } = await supabase
    .from('surveys')
    .select('id, status, public_slug, created_at, owner_id')
    .eq('id', survey.id)
    .maybeSingle()
  if (lookupError) return { error: lookupError.message }

  const current = existing as {
    id: string
    status: SurveyStatus
    public_slug: string | null
    created_at: string
    owner_id: string | null
  } | null

  if (current && current.status !== 'draft' && current.status !== 'closed') {
    return {
      error:
        current.status === 'active'
          ? 'Close this survey before editing.'
          : 'Archived surveys cannot be edited.',
    }
  }

  const description = survey.description || null
  const meta = {
    title: survey.title,
    description,
    course_id: survey.course_id || null,
    semester_id: survey.semester_id || null,
    lms_course_url: survey.lms_course_url || null,
  }

  const writing = current
    ? supabase.from('surveys').update(meta).eq('id', survey.id)
    : supabase.from('surveys').insert({
        id: survey.id,
        ...meta,
        status: 'draft',
        owner_id: profile.instructor.id,
      })

  const { data, error } = await writing
    .select(
      'id, title, description, status, public_slug, created_at, updated_at, owner_id, course_id, semester_id, lms_course_url',
    )
    .single()
  if (error || !data) {
    return { error: error?.message ?? 'The survey could not be saved.' }
  }

  if (!current) {
    await supabase.from('survey_instructors').upsert({
      survey_id: survey.id,
      instructor_id: profile.instructor.id,
      role: 'owner',
    })
  }

  const synced = await syncQuestions(survey.id, survey.questions)
  if (synced) {
    if (!current) await supabase.from('surveys').delete().eq('id', survey.id)
    return { error: synced }
  }

  const row = data as Omit<EditorRow, 'questions'>
  return {
    survey: {
      ...survey,
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
    },
  }
}

export async function activateEditorSurvey(
  survey: Survey,
): Promise<{ survey: Survey } | { error: string }> {
  if (!supabase) return { error: notConnected }
  if (survey.status === 'archived') {
    return { error: 'Archived surveys cannot be activated.' }
  }
  if (survey.questions.length === 0) {
    return { error: 'Add at least one question before activating.' }
  }

  const { error: closeError } = await supabase
    .from('surveys')
    .update({ status: 'closed' })
    .eq('status', 'active')
    .neq('id', survey.id)
  if (closeError) return { error: closeError.message }

  let publicSlug = survey.public_slug
  if (!publicSlug) {
    const { data, error } = await supabase.from('surveys').select('public_slug')
    if (error) return { error: error.message }
    const used = new Set(
      ((data ?? []) as { public_slug: string | null }[])
        .map((row) => row.public_slug)
        .filter((slug): slug is string => Boolean(slug)),
    )
    publicSlug = createSlug(used)
  }

  const { data, error } = await supabase
    .from('surveys')
    .update({ status: 'active', public_slug: publicSlug })
    .eq('id', survey.id)
    .select('public_slug, updated_at')
    .single()
  if (error || !data) {
    return { error: error?.message ?? 'The survey could not be activated.' }
  }

  const row = data as { public_slug: string | null; updated_at: string }
  return {
    survey: {
      ...survey,
      status: 'active',
      public_slug: row.public_slug,
      updated_at: row.updated_at,
    },
  }
}

async function syncQuestions(surveyId: string, questions: Question[]) {
  if (!supabase) return notConnected
  const { data, error } = await supabase
    .from('questions')
    .select('id, choices(id)')
    .eq('survey_id', surveyId)
  if (error) return error.message

  const existing = new Map<string, Set<string>>()
  for (const row of (data ?? []) as {
    id: string
    choices: { id: string }[] | null
  }[]) {
    existing.set(
      row.id,
      new Set((row.choices ?? []).map((choice) => choice.id)),
    )
  }

  const kept = new Set(questions.map((question) => question.id))
  const removed = [...existing.keys()].filter((id) => !kept.has(id))
  if (removed.length > 0) {
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .in('id', removed)
    if (deleteError) return deleteError.message
  }

  for (const question of questions) {
    const payload = {
      survey_id: surveyId,
      question_text: question.question_text,
      question_type: question.question_type,
      position: question.position,
      min_value: question.min_value ?? null,
      max_value: question.max_value ?? null,
      rating_max: question.rating_max ?? null,
    }
    if (existing.has(question.id)) {
      const { error: updateError } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', question.id)
      if (updateError) return updateError.message
    } else {
      const { error: insertError } = await supabase
        .from('questions')
        .insert({ id: question.id, ...payload })
      if (insertError) return insertError.message
    }

    const savedChoices = existing.get(question.id) ?? new Set<string>()
    const keptChoices = new Set(question.choices.map((choice) => choice.id))
    const removedChoices = [...savedChoices].filter(
      (id) => !keptChoices.has(id),
    )
    if (removedChoices.length > 0) {
      const { error: choiceDeleteError } = await supabase
        .from('choices')
        .delete()
        .in('id', removedChoices)
      if (choiceDeleteError) return choiceDeleteError.message
    }

    for (const choice of question.choices) {
      if (savedChoices.has(choice.id)) {
        const { error: choiceUpdateError } = await supabase
          .from('choices')
          .update({
            choice_text: choice.choice_text,
            position: choice.position,
          })
          .eq('id', choice.id)
        if (choiceUpdateError) return choiceUpdateError.message
      } else {
        const { error: choiceInsertError } = await supabase
          .from('choices')
          .insert({
            id: choice.id,
            question_id: question.id,
            choice_text: choice.choice_text,
            position: choice.position,
          })
        if (choiceInsertError) return choiceInsertError.message
      }
    }
  }

  return null
}

function toSurvey(row: EditorRow): Survey {
  const questions = [...(row.questions ?? [])].sort(
    (a, b) => a.position - b.position,
  )
  return {
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
