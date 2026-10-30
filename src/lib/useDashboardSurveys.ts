import { useCallback, useEffect, useState } from 'react'
import {
  activateDashboardSurvey,
  archiveDashboardSurvey,
  closeDashboardSurvey,
  deleteDashboardSurvey,
  duplicateDashboardSurvey,
  listDashboardSurveys,
  type DashboardSurvey,
} from './dashboard-api.ts'

export function useDashboardSurveys() {
  const [surveys, setSurveys] = useState<DashboardSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    const result = await listDashboardSurveys()
    if ('error' in result) setError(result.error)
    else {
      setSurveys(result.surveys)
      setError(undefined)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function run(
    action: () => Promise<string | null>,
  ): Promise<string | null> {
    setActing(true)
    const message = await action()
    const result = await listDashboardSurveys()
    if ('error' in result) setError(result.error)
    else {
      setSurveys(result.surveys)
      setError(message ?? undefined)
    }
    setActing(false)
    return message
  }

  return {
    surveys,
    loading,
    error,
    acting,
    activate(survey: DashboardSurvey) {
      return run(() => activateDashboardSurvey(survey, surveys))
    },
    close(id: string) {
      return run(() => closeDashboardSurvey(id))
    },
    archive(id: string) {
      return run(() => archiveDashboardSurvey(id))
    },
    remove(id: string) {
      return run(() => deleteDashboardSurvey(id))
    },
    duplicate(id: string) {
      return run(() => duplicateDashboardSurvey(id))
    },
  }
}
