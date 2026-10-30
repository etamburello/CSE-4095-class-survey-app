import type { Choice, Question, QuestionType, Survey } from './types.ts'

export function createChoice(choiceText = ''): Choice {
  return {
    id: crypto.randomUUID(),
    choice_text: choiceText,
    position: 1,
  }
}

export function createQuestion(
  type: QuestionType = 'multiple_choice',
): Question {
  return {
    id: crypto.randomUUID(),
    question_text: '',
    question_type: type,
    position: 1,
    choices:
      type === 'true_false'
        ? [createChoice('True'), createChoice('False')]
        : [createChoice(), createChoice()],
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
  }
}

export function normalizeSurvey(survey: Survey): Survey {
  return {
    ...survey,
    title: survey.title.trim(),
    description: survey.description.trim(),
    questions: survey.questions.map((question, questionIndex) => ({
      ...question,
      question_text: question.question_text.trim(),
      position: questionIndex + 1,
      choices: question.choices.map((choice, choiceIndex) => ({
        ...choice,
        choice_text: choice.choice_text.trim(),
        position: choiceIndex + 1,
      })),
    })),
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

    if (question.question_type === 'multiple_choice') {
      if (question.choices.length < 2) {
        errors[`choices-${question.id}`] = 'Add at least two choices.'
      }
      for (const choice of question.choices) {
        if (!choice.choice_text.trim()) {
          errors[`choice-${choice.id}`] = 'Enter this choice.'
        }
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
