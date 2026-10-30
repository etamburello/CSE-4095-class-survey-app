import type { Survey, SurveyResponse } from './types.ts'

function escapeCell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  if (/[",\r\n]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`
  return safe
}

export function surveyToCsv(survey: Survey, responses: SurveyResponse[]) {
  const questions = [...survey.questions].sort(
    (a, b) => a.position - b.position,
  )
  const header = [
    'response_id',
    'submitted_at',
    ...questions.map((question) => question.question_text),
  ]
  const lines = [header.map(escapeCell).join(',')]

  const sorted = [...responses].sort((a, b) =>
    a.submitted_at.localeCompare(b.submitted_at),
  )
  for (const response of sorted) {
    const cells = [
      response.id,
      response.submitted_at,
      ...questions.map((question) => {
        const answer = response.answers.find(
          (item) => item.question_id === question.id,
        )
        const choice = question.choices.find(
          (item) => item.id === answer?.choice_id,
        )
        return choice?.choice_text ?? ''
      }),
    ]
    lines.push(cells.map(escapeCell).join(','))
  }

  return lines.join('\n')
}

export function csvFilename(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'survey'}-results.csv`
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
