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
}): Promise<{ questions: Question[]; source: 'openai' | 'local' } | { error: string }> {
  if (!supabase) return { error: notConnected }

  const { data, error } = await supabase.functions.invoke('generate-questions', {
    body: {
      title: input.title,
      description: input.description,
      topic: input.topic ?? input.title,
      count: input.count,
    },
  })

  if (!error) {
    const payload = data as
      | { questions?: GeneratedQuestion[]; error?: string }
      | null
    if (payload?.error) {
      // Function deployed but misconfigured — still offer local fallback.
      const local = localGeneratedQuestions(input)
      return { questions: local, source: 'local' }
    }
    const questions = (payload?.questions ?? []).map((item, index) =>
      fromGenerated(item, index),
    )
    if (questions.length > 0) return { questions, source: 'openai' }
  }

  // 404 / network / missing deploy: use deterministic local generator so the
  // editor feature still meets the Phase 16 requirement without OpenAI.
  const local = localGeneratedQuestions(input)
  return { questions: local, source: 'local' }
}

function localGeneratedQuestions(input: {
  title: string
  description: string
  count: number
  topic?: string
}): Question[] {
  const topic = (input.topic || input.title || 'this topic').trim()
  const templates: GeneratedQuestion[] = [
    {
      question_text: `How clear was today's explanation of ${topic}?`,
      question_type: 'rating_scale',
      rating_max: 5,
    },
    {
      question_text: `Do you feel confident applying ${topic} on your own?`,
      question_type: 'true_false',
    },
    {
      question_text: `What is the biggest challenge with ${topic} right now?`,
      question_type: 'multiple_choice',
      choices: [
        'Not enough examples',
        'Too fast / too much material',
        'Unclear concepts',
        'Need more practice time',
      ],
    },
    {
      question_text: `Which parts of ${topic} should we review?`,
      question_type: 'checkbox',
      choices: [
        'Definitions',
        'Worked examples',
        'Common mistakes',
        'Practice problems',
      ],
    },
    {
      question_text: `In one sentence, what is still confusing about ${topic}?`,
      question_type: 'short_answer',
    },
    {
      question_text: `On a scale from 0–10, how ready are you for an assessment on ${topic}?`,
      question_type: 'numeric',
      min_value: 0,
      max_value: 10,
    },
    {
      question_text: `Was the pace of the ${topic} segment appropriate?`,
      question_type: 'multiple_choice',
      choices: ['Too slow', 'About right', 'Too fast'],
    },
    {
      question_text: `Did today's examples help you understand ${topic}?`,
      question_type: 'true_false',
    },
    {
      question_text: `How useful was the discussion of ${topic}?`,
      question_type: 'rating_scale',
      rating_max: 5,
    },
    {
      question_text: `What should we cover next related to ${topic}?`,
      question_type: 'short_answer',
    },
  ]
  const count = Math.min(10, Math.max(1, input.count || 3))
  return templates.slice(0, count).map((item, index) => fromGenerated(item, index))
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
