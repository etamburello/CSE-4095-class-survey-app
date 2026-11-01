import {
  createBlankSurvey,
  createChoice,
  createQuestion,
  ratingChoices,
} from './survey-form.ts'
import type { Question, QuestionType, Survey } from './types.ts'

export type SurveyDefinition = {
  title: string
  description: string
  lms_course_url?: string | null
  questions: Array<{
    question_text: string
    question_type: QuestionType
    choices?: Array<{ choice_text: string }>
    min_value?: number | null
    max_value?: number | null
    rating_max?: number | null
  }>
}

export function surveyToDefinition(survey: Survey): SurveyDefinition {
  return {
    title: survey.title,
    description: survey.description,
    lms_course_url: survey.lms_course_url ?? null,
    questions: survey.questions.map((question) => ({
      question_text: question.question_text,
      question_type: question.question_type,
      choices: question.choices.map((choice) => ({
        choice_text: choice.choice_text,
      })),
      min_value: question.min_value ?? null,
      max_value: question.max_value ?? null,
      rating_max: question.rating_max ?? null,
    })),
  }
}

export function definitionToSurvey(definition: SurveyDefinition): Survey {
  const survey = createBlankSurvey()
  survey.title = definition.title ?? ''
  survey.description = definition.description ?? ''
  survey.lms_course_url = definition.lms_course_url ?? null
  survey.questions = (definition.questions ?? []).map((item, index) => {
    const type = normalizeType(item.question_type)
    const question = createQuestion(type)
    question.question_text = item.question_text ?? ''
    question.position = index + 1
    question.min_value = item.min_value ?? question.min_value
    question.max_value = item.max_value ?? question.max_value
    question.rating_max = item.rating_max ?? question.rating_max
    if (type === 'rating_scale') {
      question.choices = ratingChoices(question.rating_max ?? 5)
    } else if (type === 'short_answer' || type === 'numeric') {
      question.choices = []
    } else if (item.choices && item.choices.length > 0) {
      question.choices = item.choices.map((choice, choiceIndex) => ({
        ...createChoice(choice.choice_text),
        position: choiceIndex + 1,
      }))
    }
    return question
  })
  return survey
}

export function exportSurveyJson(survey: Survey) {
  const json = JSON.stringify(surveyToDefinition(survey), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${slugify(survey.title || 'survey')}.json`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function parseSurveyJson(text: string): Survey {
  const parsed = JSON.parse(text) as SurveyDefinition
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid survey JSON.')
  }
  if (!Array.isArray(parsed.questions)) {
    throw new Error('Survey JSON must include a questions array.')
  }
  return definitionToSurvey(parsed)
}

/**
 * Markdown format:
 * # Title
 * Optional description paragraph
 *
 * ## Question text
 * or numbered "1. Question"
 * Prefix type: TF: / SA: / NUM: / RATE: / CB: / MC: (default MC)
 * - choice (for MC/CB)
 */
export function parseSurveyMarkdown(markdown: string): Survey {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const survey = createBlankSurvey()
  let i = 0
  if (lines[0]?.startsWith('# ')) {
    survey.title = lines[0].slice(2).trim()
    i = 1
  }
  const descriptionLines: string[] = []
  while (i < lines.length && !isQuestionStart(lines[i]!)) {
    const line = lines[i]!.trim()
    if (line) descriptionLines.push(line)
    i += 1
  }
  survey.description = descriptionLines.join(' ')

  let current: Question | null = null
  while (i < lines.length) {
    const line = lines[i]!
    if (isQuestionStart(line)) {
      if (current) survey.questions.push(current)
      current = parseQuestionLine(line)
      i += 1
      continue
    }
    if (current && /^\s*[-*]\s+/.test(line)) {
      const text = line.replace(/^\s*[-*]\s+/, '').trim()
      if (
        current.question_type === 'multiple_choice' ||
        current.question_type === 'checkbox'
      ) {
        current.choices.push({
          ...createChoice(text),
          position: current.choices.length + 1,
        })
      }
    }
    i += 1
  }
  if (current) survey.questions.push(current)
  survey.questions = survey.questions.map((question, index) => ({
    ...question,
    position: index + 1,
  }))
  return survey
}

function isQuestionStart(line: string) {
  return /^##\s+/.test(line) || /^\d+\.\s+/.test(line)
}

function parseQuestionLine(line: string): Question {
  const raw = line.replace(/^##\s+/, '').replace(/^\d+\.\s+/, '').trim()
  const match = /^(TF|SA|NUM|RATE|CB|MC):\s*(.*)$/i.exec(raw)
  const type = match ? prefixToType(match[1]!) : 'multiple_choice'
  const text = match ? match[2]!.trim() : raw
  const question = createQuestion(type)
  question.question_text = text
  return question
}

function prefixToType(prefix: string): QuestionType {
  switch (prefix.toUpperCase()) {
    case 'TF':
      return 'true_false'
    case 'SA':
      return 'short_answer'
    case 'NUM':
      return 'numeric'
    case 'RATE':
      return 'rating_scale'
    case 'CB':
      return 'checkbox'
    default:
      return 'multiple_choice'
  }
}

function normalizeType(type: string): QuestionType {
  const allowed: QuestionType[] = [
    'multiple_choice',
    'true_false',
    'short_answer',
    'checkbox',
    'rating_scale',
    'numeric',
  ]
  return allowed.includes(type as QuestionType)
    ? (type as QuestionType)
    : 'multiple_choice'
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'survey'
  )
}
