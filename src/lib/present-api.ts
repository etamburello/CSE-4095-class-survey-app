import type { SurveyStatus } from './types.ts'
import { supabase } from './supabase.ts'

const notConnected = 'This app is not connected to Supabase yet.'

export type PresentSurvey = {
  id: string
  title: string
  status: SurveyStatus
  public_slug: string | null
  responseCount: number
}

type PresentRow = {
  id: string
  title: string
  status: SurveyStatus
  public_slug: string | null
  responses: { count: number }[] | null
}

export async function loadPresentSurvey(
  id: string,
): Promise<{ survey: PresentSurvey } | { error: string } | { missing: true }> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase
    .from('surveys')
    .select('id, title, status, public_slug, responses(count)')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    if (error.code === '22P02') return { missing: true }
    return { error: error.message }
  }
  if (!data) return { missing: true }
  const row = data as PresentRow
  return {
    survey: {
      id: row.id,
      title: row.title,
      status: row.status,
      public_slug: row.public_slug,
      responseCount: row.responses?.[0]?.count ?? 0,
    },
  }
}
