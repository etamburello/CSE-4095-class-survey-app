import { useMemo, useReducer, type ReactNode } from 'react'
import { createInitialState, type SurveyState } from '../lib/mock-data.ts'
import { SurveyContext, type SurveyStore } from '../lib/survey-context.ts'
import type { SelectedAnswer, Survey } from '../lib/types.ts'

const SLUG_ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789'

type Action =
  | { type: 'save'; survey: Survey }
  | { type: 'activate'; id: string }
  | { type: 'close'; id: string }
  | { type: 'archive'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'add-response'; surveyId: string; answers: SelectedAnswer[] }

function createSlug(surveys: Survey[]) {
  const used = new Set(
    surveys.map((survey) => survey.public_slug).filter(Boolean),
  )
  let slug = ''
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    slug = Array.from(
      bytes,
      (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length],
    ).join('')
  } while (used.has(slug))
  return slug
}

function withTimestamp(survey: Survey, now: string) {
  return { ...survey, updated_at: now }
}

function reducer(state: SurveyState, action: Action): SurveyState {
  const now = new Date().toISOString()

  switch (action.type) {
    case 'save': {
      const current = state.surveys.find(
        (survey) => survey.id === action.survey.id,
      )
      if (current && current.status !== 'draft' && current.status !== 'closed')
        return state
      const saved: Survey = {
        ...action.survey,
        status: current?.status ?? 'draft',
        public_slug: current?.public_slug ?? null,
        created_at: current?.created_at ?? action.survey.created_at,
        updated_at: now,
        questions: action.survey.questions.map((question, questionIndex) => ({
          ...question,
          position: questionIndex + 1,
          choices: question.choices.map((choice, choiceIndex) => ({
            ...choice,
            position: choiceIndex + 1,
          })),
        })),
      }
      return {
        ...state,
        surveys: current
          ? state.surveys.map((survey) =>
              survey.id === saved.id ? saved : survey,
            )
          : [saved, ...state.surveys],
      }
    }
    case 'activate': {
      const target = state.surveys.find((survey) => survey.id === action.id)
      if (
        !target ||
        target.status === 'archived' ||
        target.questions.length === 0
      )
        return state
      const slug = target.public_slug ?? createSlug(state.surveys)
      return {
        ...state,
        surveys: state.surveys.map((survey) => {
          if (survey.id === action.id)
            return {
              ...survey,
              status: 'active',
              public_slug: slug,
              updated_at: now,
            }
          if (survey.status === 'active')
            return withTimestamp({ ...survey, status: 'closed' }, now)
          return survey
        }),
      }
    }
    case 'close':
      return {
        ...state,
        surveys: state.surveys.map((survey) =>
          survey.id === action.id && survey.status === 'active'
            ? withTimestamp({ ...survey, status: 'closed' }, now)
            : survey,
        ),
      }
    case 'archive':
      return {
        ...state,
        surveys: state.surveys.map((survey) =>
          survey.id === action.id &&
          (survey.status === 'draft' || survey.status === 'closed')
            ? withTimestamp({ ...survey, status: 'archived' }, now)
            : survey,
        ),
      }
    case 'delete':
      return {
        surveys: state.surveys.filter((survey) => survey.id !== action.id),
        responses: state.responses.filter(
          (item) => item.survey_id !== action.id,
        ),
        submittedSurveyIds: state.submittedSurveyIds.filter(
          (id) => id !== action.id,
        ),
      }
    case 'add-response': {
      const survey = state.surveys.find((item) => item.id === action.surveyId)
      if (!survey || survey.status !== 'active') return state
      if (state.submittedSurveyIds.includes(action.surveyId)) return state
      return {
        ...state,
        submittedSurveyIds: [...state.submittedSurveyIds, action.surveyId],
        responses: [
          ...state.responses,
          {
            id: crypto.randomUUID(),
            survey_id: action.surveyId,
            submitted_at: now,
            answers: action.answers,
          },
        ],
      }
    }
    default:
      return state
  }
}

export function SurveyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const store = useMemo<SurveyStore>(() => {
    const surveys = [...state.surveys].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )
    return {
      surveys,
      responses: state.responses,
      getSurvey: (id) => state.surveys.find((survey) => survey.id === id),
      getBySlug: (slug) =>
        state.surveys.find((survey) => survey.public_slug === slug),
      hasSubmitted: (surveyId) => state.submittedSurveyIds.includes(surveyId),
      saveSurvey: (survey) => dispatch({ type: 'save', survey }),
      activateSurvey: (id) => dispatch({ type: 'activate', id }),
      closeSurvey: (id) => dispatch({ type: 'close', id }),
      archiveSurvey: (id) => dispatch({ type: 'archive', id }),
      deleteSurvey: (id) => dispatch({ type: 'delete', id }),
      duplicateSurvey: (id) => {
        const source = state.surveys.find((survey) => survey.id === id)
        if (!source) return null
        const copy: Survey = {
          id: crypto.randomUUID(),
          title: `Copy of ${source.title}`,
          description: source.description,
          status: 'draft',
          public_slug: null,
          created_at: nowIso(),
          updated_at: nowIso(),
          questions: source.questions.map((question) => ({
            ...question,
            id: crypto.randomUUID(),
            choices: question.choices.map((choice) => ({
              ...choice,
              id: crypto.randomUUID(),
            })),
          })),
        }
        dispatch({ type: 'save', survey: copy })
        return copy.id
      },
      submitResponse: (surveyId, answers) =>
        dispatch({ type: 'add-response', surveyId, answers }),
    }
  }, [state])

  return <SurveyContext value={store}>{children}</SurveyContext>
}

function nowIso() {
  return new Date().toISOString()
}
