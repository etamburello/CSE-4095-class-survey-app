import { ensureInstructor } from './instructor-api.ts'
import { supabase } from './supabase.ts'
import type { Course, Semester } from './types.ts'

const notConnected = 'This app is not connected to Supabase yet.'

export async function listCourses(): Promise<
  { courses: Course[] } | { error: string }
> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase
    .from('courses')
    .select('id, code, name, created_at')
    .order('code')
  if (error) return { error: error.message }
  return { courses: (data ?? []) as Course[] }
}

export async function createCourse(
  code: string,
  name: string,
): Promise<{ course: Course } | { error: string }> {
  if (!supabase) return { error: notConnected }
  const profile = await ensureInstructor()
  if ('error' in profile) return { error: profile.error }
  const { data, error } = await supabase
    .from('courses')
    .insert({
      instructor_id: profile.instructor.id,
      code: code.trim(),
      name: name.trim(),
    })
    .select('id, code, name, created_at')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not create course.' }
  return { course: data as Course }
}

export async function deleteCourse(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: notConnected }
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function listSemesters(): Promise<
  { semesters: Semester[] } | { error: string }
> {
  if (!supabase) return { error: notConnected }
  const { data, error } = await supabase
    .from('semesters')
    .select('id, name, starts_on, ends_on, created_at')
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  return { semesters: (data ?? []) as Semester[] }
}

export async function createSemester(
  name: string,
  startsOn: string,
  endsOn: string,
): Promise<{ semester: Semester } | { error: string }> {
  if (!supabase) return { error: notConnected }
  const profile = await ensureInstructor()
  if ('error' in profile) return { error: profile.error }
  const { data, error } = await supabase
    .from('semesters')
    .insert({
      instructor_id: profile.instructor.id,
      name: name.trim(),
      starts_on: startsOn || null,
      ends_on: endsOn || null,
    })
    .select('id, name, starts_on, ends_on, created_at')
    .single()
  if (error || !data)
    return { error: error?.message ?? 'Could not create semester.' }
  return { semester: data as Semester }
}

export async function deleteSemester(id: string): Promise<{ error?: string }> {
  if (!supabase) return { error: notConnected }
  const { error } = await supabase.from('semesters').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}
