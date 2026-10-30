export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived'

export type QuestionType = 'multiple_choice' | 'true_false'

export type Choice = {
  id: string
  choice_text: string
  position: number
}

export type Question = {
  id: string
  question_text: string
  question_type: QuestionType
  position: number
  choices: Choice[]
}

export type Survey = {
  id: string
  title: string
  description: string
  status: SurveyStatus
  public_slug: string | null
  created_at: string
  updated_at: string
  questions: Question[]
}

export type SelectedAnswer = {
  question_id: string
  choice_id: string
}

export type SurveyResponse = {
  id: string
  survey_id: string
  submitted_at: string
  answers: SelectedAnswer[]
}
