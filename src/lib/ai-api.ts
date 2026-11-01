import { createChoice, createQuestion, ratingChoices } from './survey-form.ts'
import { supabase } from './supabase.ts'
import type { Question, QuestionType } from './types.ts'

const notConnected = 'This app is not connected to Supabase yet.'

type GeneratedQuestion = {
  question_text: string
  question_type: QuestionType
  choices?: string[]
  rating_max?: number
  min_value?: number
  max_value?: number
}

export async function generateQuestionsWithAi(input: {
  title: string
  description: string
  count: number
  topic?: string
}): Promise<{ questions: Question[] } | { error: string }> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase.functions.invoke('generate-questions', {
    body: {
      title: input.title,
      description: input.description,
      topic: input.topic ?? input.title,
      count: input.count,
    },
  })
  if (error) {
    return {
      error:
        error.message.includes('Failed to send') ||
        error.message.includes('FunctionsFetchError')
          ? 'AI generation is not configured. Set OPENAI_API_KEY on the generate-questions Edge Function.'
          : error.message,
    }
  }
  const payload = data as
    | { questions?: GeneratedQuestion[]; error?: string }
    | null
  if (!payload || payload.error) {
    return {
      error:
        payload?.error ??
        'AI generation failed. Check that OPENAI_API_KEY is set in Supabase.',
    }
  }
  const questions = (payload.questions ?? []).map((item, index) =>
    fromGenerated(item, index),
  )
  if (questions.length === 0) {
    return { error: 'The AI returned no questions. Try again.' }
  }
  return { questions }
}

function fromGenerated(item: GeneratedQuestion, index: number): Question {
  const type = item.question_type || 'multiple_choice'
  const question = createQuestion(type)
  question.question_text = item.question_text
  question.position = index + 1
  if (type === 'rating_scale') {
    question.rating_max = item.rating_max ?? 5
    question.choices = ratingChoices(question.rating_max)
  } else if (type === 'numeric') {
    question.min_value = item.min_value ?? 0
    question.max_value = item.max_value ?? 100
    question.choices = []
  } else if (type === 'short_answer') {
    question.choices = []
  } else if (item.choices && item.choices.length > 0) {
    question.choices = item.choices.map((text, choiceIndex) => ({
      ...createChoice(text),
      position: choiceIndex + 1,
    }))
  }
  return question
}
