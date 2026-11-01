import { supabase } from './supabase.ts'
import type { SurveyStatus } from './types.ts'

const notConnected = 'This app is not connected to Supabase yet.'

export type AnalyticsSummary = {
  surveyCount: number
  responseCount: number
  byStatus: Record<SurveyStatus, number>
  surveys: Array<{
    id: string
    title: string
    status: SurveyStatus
    course_id: string | null
    semester_id: string | null
    response_count: number
  }>
}

export async function loadAnalytics(filters?: {
  courseId?: string
  semesterId?: string
}): Promise<{ summary: AnalyticsSummary } | { error: string }> {
  if (!supabase) return { error: notConnected }
  let query = supabase
    .from('surveys')
    .select('id, title, status, course_id, semester_id, responses(id)')
    .order('updated_at', { ascending: false })
  if (filters?.courseId) query = query.eq('course_id', filters.courseId)
  if (filters?.semesterId) query = query.eq('semester_id', filters.semesterId)

  const { data, error } = await query
  if (error) return { error: error.message }

  const byStatus: Record<SurveyStatus, number> = {
    draft: 0,
    active: 0,
    closed: 0,
    archived: 0,
  }
  let responseCount = 0
  const surveys = (
    (data ?? []) as {
      id: string
      title: string
      status: SurveyStatus
      course_id: string | null
      semester_id: string | null
      responses: { id: string }[] | null
    }[]
  ).map((row) => {
    const count = row.responses?.length ?? 0
    responseCount += count
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      course_id: row.course_id,
      semester_id: row.semester_id,
      response_count: count,
    }
  })

  return {
    summary: {
      surveyCount: surveys.length,
      responseCount,
      byStatus,
      surveys,
    },
  }
}
