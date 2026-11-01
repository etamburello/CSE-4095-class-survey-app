import type { InstructorProfile } from './types.ts'
import { supabase } from './supabase.ts'

const notConnected = 'This app is not connected to Supabase yet.'

export async function ensureInstructor(): Promise<
  { instructor: InstructorProfile } | { error: string }
> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase.rpc('ensure_instructor_profile')
  if (error || !data) {
    return { error: error?.message ?? 'Could not load instructor profile.' }
  }
  const row = data as InstructorProfile
  return {
    instructor: {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
    },
  }
}

export async function listInstructors(): Promise<
  { instructors: InstructorProfile[] } | { error: string }
> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase
    .from('instructors')
    .select('id, email, display_name')
    .order('email')
  if (error) return { error: error.message }
  return { instructors: (data ?? []) as InstructorProfile[] }
}

export async function listSurveyInstructors(
  surveyId: string,
): Promise<{ instructors: InstructorProfile[] } | { error: string }> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase
    .from('survey_instructors')
    .select('instructor_id, instructors(id, email, display_name)')
    .eq('survey_id', surveyId)
  if (error) return { error: error.message }
  const instructors = (
    (data ?? []) as {
      instructors: InstructorProfile | InstructorProfile[] | null
    }[]
  )
    .map((row) => {
      const nested = row.instructors
      return Array.isArray(nested) ? nested[0] : nested
    })
    .filter((row): row is InstructorProfile => Boolean(row))
  return { instructors }
}

export async function addSurveyInstructor(
  surveyId: string,
  email: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: notConnected }
  const normalized = email.trim().toLowerCase()
  const { data: instructor, error: findError } = await supabase
    .from('instructors')
    .select('id')
    .ilike('email', normalized)
    .maybeSingle()
  if (findError) return { error: findError.message }
  if (!instructor) {
    return {
      error:
        'No instructor with that email has logged in yet. Ask them to sign in once first.',
    }
  }
  const { error } = await supabase.from('survey_instructors').upsert({
    survey_id: surveyId,
    instructor_id: (instructor as { id: string }).id,
    role: 'editor',
  })
  if (error) return { error: error.message }
  return {}
}

export async function removeSurveyInstructor(
  surveyId: string,
  instructorId: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: notConnected }
  const { error } = await supabase
    .from('survey_instructors')
    .delete()
    .eq('survey_id', surveyId)
    .eq('instructor_id', instructorId)
  if (error) return { error: error.message }
  return {}
}
