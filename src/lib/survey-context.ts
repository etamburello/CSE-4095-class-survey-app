import { createContext } from 'react'
import type { SelectedAnswer, Survey, SurveyResponse } from './types.ts'

export type SurveyStore = {
  surveys: Survey[]
  responses: SurveyResponse[]
  getSurvey: (id: string) => Survey | undefined
  getBySlug: (slug: string) => Survey | undefined
  hasSubmitted: (surveyId: string) => boolean
  saveSurvey: (survey: Survey) => void
  activateSurvey: (id: string) => void
  closeSurvey: (id: string) => void
  archiveSurvey: (id: string) => void
  deleteSurvey: (id: string) => void
  duplicateSurvey: (id: string) => string | null
  submitResponse: (surveyId: string, answers: SelectedAnswer[]) => void
}

export const SurveyContext = createContext<SurveyStore | null>(null)
