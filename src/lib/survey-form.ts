import type { Choice, Question, QuestionType, Survey } from './types.ts'

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple choice',
  true_false: 'True / False',
  short_answer: 'Short answer',
  checkbox: 'Checkbox',
  rating_scale: 'Rating scale',
  numeric: 'Numeric',
}

export function createChoice(choiceText = ''): Choice {
  return {
    id: crypto.randomUUID(),
    choice_text: choiceText,
    position: 1,
  }
}

export function ratingChoices(max = 5): Choice[] {
  const n = Math.min(10, Math.max(2, Math.round(max) || 5))
  return Array.from({ length: n }, (_, i) =>
    createChoice(String(i + 1)),
  ).map((choice, index) => ({ ...choice, position: index + 1 }))
}

export function createQuestion(
  type: QuestionType = 'multiple_choice',
): Question {
  if (type === 'true_false') {
    return {
      id: crypto.randomUUID(),
      question_text: '',
      question_type: type,
      position: 1,
      choices: [createChoice('True'), createChoice('False')],
    }
  }
  if (type === 'rating_scale') {
    return {
      id: crypto.randomUUID(),
      question_text: '',
      question_type: type,
      position: 1,
      rating_max: 5,
      choices: ratingChoices(5),
    }
  }
  if (type === 'short_answer' || type === 'numeric') {
    return {
      id: crypto.randomUUID(),
      question_text: '',
      question_type: type,
      position: 1,
      choices: [],
      min_value: type === 'numeric' ? 0 : null,
      max_value: type === 'numeric' ? 100 : null,
    }
  }
  return {
    id: crypto.randomUUID(),
    question_text: '',
    question_type: type,
    position: 1,
    choices: [createChoice(), createChoice()],
  }
}

export function createBlankSurvey(): Survey {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    status: 'draft',
    public_slug: null,
    created_at: now,
    updated_at: now,
    questions: [],
    course_id: null,
    semester_id: null,
    lms_course_url: null,
  }
}

export function normalizeSurvey(survey: Survey): Survey {
  return {
    ...survey,
    title: survey.title.trim(),
    description: survey.description.trim(),
    lms_course_url: survey.lms_course_url?.trim() || null,
    questions: survey.questions.map((question, questionIndex) => {
      const type = question.question_type
      let choices = question.choices.map((choice, choiceIndex) => ({
        ...choice,
        choice_text: choice.choice_text.trim(),
        position: choiceIndex + 1,
      }))
      if (type === 'rating_scale') {
        const max = question.rating_max ?? 5
        choices = ratingChoices(max)
      }
      if (type === 'short_answer' || type === 'numeric') {
        choices = []
      }
      return {
        ...question,
        question_text: question.question_text.trim(),
        position: questionIndex + 1,
        choices,
        min_value: type === 'numeric' ? (question.min_value ?? null) : null,
        max_value: type === 'numeric' ? (question.max_value ?? null) : null,
        rating_max: type === 'rating_scale' ? (question.rating_max ?? 5) : null,
      }
    }),
  }
}

export function validateSurvey(survey: Survey, mode: 'save' | 'activate') {
  const errors: Record<string, string> = {}

  if (!survey.title.trim()) errors.title = 'Enter a survey title.'

  if (mode === 'activate' && survey.questions.length === 0) {
    errors.questions = 'Add at least one question before activating.'
  }

  for (const question of survey.questions) {
    if (!question.question_text.trim()) {
      errors[`question-${question.id}`] = 'Enter the question text.'
    }

    if (
      question.question_type === 'multiple_choice' ||
      question.question_type === 'checkbox'
    ) {
      if (question.choices.length < 2) {
        errors[`choices-${question.id}`] = 'Add at least two choices.'
      }
      for (const choice of question.choices) {
        if (!choice.choice_text.trim()) {
          errors[`choice-${choice.id}`] = 'Enter this choice.'
        }
      }
    }

    if (question.question_type === 'rating_scale') {
      const max = question.rating_max ?? 5
      if (max < 2 || max > 10) {
        errors[`rating-${question.id}`] = 'Rating scale must be between 2 and 10.'
      }
    }

    if (question.question_type === 'numeric') {
      const min = question.min_value
      const max = question.max_value
      if (
        min != null &&
        max != null &&
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min > max
      ) {
        errors[`numeric-${question.id}`] = 'Minimum cannot be greater than maximum.'
      }
    }
  }

  return errors
}

export function moveById<T extends { id: string }>(
  items: T[],
  id: string,
  direction: -1 | 1,
) {
  const index = items.findIndex((item) => item.id === id)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items
  const copy = items.slice()
  const [item] = copy.splice(index, 1)
  copy.splice(nextIndex, 0, item)
  return copy
}

export function questionNeedsChoices(type: QuestionType) {
  return (
    type === 'multiple_choice' ||
    type === 'true_false' ||
    type === 'checkbox' ||
    type === 'rating_scale'
  )
}
