export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived'

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'checkbox'
  | 'rating_scale'
  | 'numeric'

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
  min_value?: number | null
  max_value?: number | null
  rating_max?: number | null
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
  owner_id?: string | null
  course_id?: string | null
  semester_id?: string | null
  lms_course_url?: string | null
}

/** One payload entry per question for student submit / results. */
export type SelectedAnswer = {
  question_id: string
  choice_id?: string
  choice_ids?: string[]
  text_answer?: string
  numeric_value?: number
}

export type SurveyResponse = {
  id: string
  survey_id: string
  submitted_at: string
  anonymous_token?: string | null
  answers: SelectedAnswer[]
}

export type Course = {
  id: string
  code: string
  name: string
  created_at: string
}

export type Semester = {
  id: string
  name: string
  starts_on: string | null
  ends_on: string | null
  created_at: string
}

export type BankQuestion = {
  id: string
  question_text: string
  question_type: QuestionType
  choices: Choice[]
  min_value: number | null
  max_value: number | null
  rating_max: number | null
  created_at: string
}

export type InstructorProfile = {
  id: string
  email: string
  display_name: string | null
}
