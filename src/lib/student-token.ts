const TOKEN_KEY = 'classroom-survey-anonymous-token'
const SUBMITTED_KEY = 'classroom-survey-submitted'

let memoryToken: string | null = null

export function getAnonymousToken() {
  const stored = readStorage(TOKEN_KEY)
  if (stored) {
    memoryToken = stored
    return stored
  }
  if (!memoryToken) memoryToken = crypto.randomUUID()
  writeStorage(TOKEN_KEY, memoryToken)
  return memoryToken
}

export function hasSubmittedSurvey(surveyId: string) {
  return readSubmitted().includes(surveyId)
}

export function rememberSubmittedSurvey(surveyId: string) {
  const submitted = readSubmitted()
  if (submitted.includes(surveyId)) return
  submitted.push(surveyId)
  writeStorage(SUBMITTED_KEY, JSON.stringify(submitted))
}

function readSubmitted() {
  const raw = readStorage(SUBMITTED_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private browsing can block storage. The in-memory token still covers this visit.
  }
}
