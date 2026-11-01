import { createChoice } from './survey-form.ts'
import { ensureInstructor } from './instructor-api.ts'
import { supabase } from './supabase.ts'
import type { BankQuestion, Choice, Question, QuestionType } from './types.ts'

const notConnected = 'This app is not connected to Supabase yet.'

type BankRow = {
  id: string
  question_text: string
  question_type: QuestionType
  choices: Choice[] | null
  min_value: number | null
  max_value: number | null
  rating_max: number | null
  created_at: string
}

export async function listBankQuestions(): Promise<
  { questions: BankQuestion[] } | { error: string }
> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase
    .from('question_bank')
    .select(
      'id, question_text, question_type, choices, min_value, max_value, rating_max, created_at',
    )
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  return {
    questions: ((data ?? []) as BankRow[]).map((row) => ({
      id: row.id,
      question_text: row.question_text,
      question_type: row.question_type,
      choices: Array.isArray(row.choices) ? row.choices : [],
      min_value: row.min_value,
      max_value: row.max_value,
      rating_max: row.rating_max,
      created_at: row.created_at,
    })),
  }
}

export async function saveQuestionToBank(
  question: Question,
): Promise<{ error?: string }> {
  if (!supabase) return { error: notConnected }
  const profile = await ensureInstructor()
  if ('error' in profile) return { error: profile.error }
  const { error } = await supabase.from('question_bank').insert({
    instructor_id: profile.instructor.id,
    question_text: question.question_text,
    question_type: question.question_type,
    choices: question.choices,
    min_value: question.min_value ?? null,
    max_value: question.max_value ?? null,
    rating_max: question.rating_max ?? null,
  })
  if (error) return { error: error.message }
  return {}
}

export async function deleteBankQuestion(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: notConnected }
  const { error } = await supabase.from('question_bank').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export function bankToQuestion(bank: BankQuestion): Question {
  return {
    id: crypto.randomUUID(),
    question_text: bank.question_text,
    question_type: bank.question_type,
    position: 1,
    min_value: bank.min_value,
    max_value: bank.max_value,
    rating_max: bank.rating_max,
    choices: (bank.choices.length > 0
      ? bank.choices
      : [createChoice(), createChoice()]
    ).map((choice) => ({
      ...choice,
      id: crypto.randomUUID(),
    })),
  }
}
