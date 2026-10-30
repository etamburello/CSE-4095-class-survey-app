import { useContext } from 'react'
import { SurveyContext } from './survey-context.ts'

export function useSurveys() {
  const store = useContext(SurveyContext)
  if (!store) throw new Error('useSurveys must be used within SurveyProvider')
  return store
}
