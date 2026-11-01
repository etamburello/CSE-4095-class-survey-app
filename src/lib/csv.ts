import type { Question, Survey, SurveyResponse } from './types.ts'

function escapeCell(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  if (/[",\r\n]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`
  return safe
}

function metadataLines(survey: Survey, exportedAt: string) {
  return [
    ['Survey Title', survey.title],
    ['Description', survey.description],
    ['Status', survey.status],
    ['Created At', survey.created_at],
    ['Exported At', exportedAt],
  ].map((row) => row.map(escapeCell).join(','))
}

function answerDisplay(question: Question, response: SurveyResponse) {
  const matches = response.answers.filter(
    (item) => item.question_id === question.id,
  )
  if (matches.length === 0) return ''
  if (
    question.question_type === 'short_answer' ||
    question.question_type === 'numeric'
  ) {
    const answer = matches[0]!
    if (answer.numeric_value != null) return String(answer.numeric_value)
    return answer.text_answer ?? ''
  }
  const choiceIds = new Set<string>()
  for (const answer of matches) {
    if (answer.choice_ids) for (const id of answer.choice_ids) choiceIds.add(id)
    if (answer.choice_id) choiceIds.add(answer.choice_id)
  }
  return question.choices
    .filter((choice) => choiceIds.has(choice.id))
    .map((choice) => choice.choice_text)
    .join('; ')
}

export function surveyToCsv(
  survey: Survey,
  responses: SurveyResponse[],
  exportedAt = new Date().toISOString(),
) {
  const questions = [...survey.questions].sort(
    (a, b) => a.position - b.position,
  )
  const header = [
    'response_id',
    'submitted_at',
    ...questions.map((question) => question.question_text),
  ]
  const lines = [
    ...metadataLines(survey, exportedAt),
    '',
    header.map(escapeCell).join(','),
  ]

  const sorted = [...responses].sort((a, b) =>
    a.submitted_at.localeCompare(b.submitted_at),
  )
  for (const response of sorted) {
    const cells = [
      response.id,
      response.submitted_at,
      ...questions.map((question) => answerDisplay(question, response)),
    ]
    lines.push(cells.map(escapeCell).join(','))
  }

  return lines.join('\n')
}

export function participationToCsv(
  survey: Survey,
  responses: SurveyResponse[],
  exportedAt = new Date().toISOString(),
) {
  const lines = [
    ['Survey Title', survey.title].map(escapeCell).join(','),
    ['Exported At', exportedAt].map(escapeCell).join(','),
    '',
    ['participant', 'submitted_at', 'completed']
      .map(escapeCell)
      .join(','),
  ]
  const sorted = [...responses].sort((a, b) =>
    a.submitted_at.localeCompare(b.submitted_at),
  )
  sorted.forEach((response, index) => {
    lines.push(
      [
        `Participant ${index + 1}`,
        response.submitted_at,
        'Yes',
      ]
        .map(escapeCell)
        .join(','),
    )
  })
  return lines.join('\n')
}

export function csvFilename(title: string, suffix = 'results') {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'survey'}-${suffix}.csv`
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function lmsShareText(survey: Survey, origin = window.location.origin) {
  const url = survey.public_slug
    ? `${origin}/s/${survey.public_slug}`
    : `${origin}/dashboard`
  const lines = [
    `Survey: ${survey.title}`,
    `Student link: ${url}`,
    '',
    'Canvas / LMS instructions:',
    '1. Open your course Modules (or Pages).',
    '2. Add an External URL or paste this link for students.',
    '3. Optionally attach the participation CSV export for gradebook credit.',
  ]
  if (survey.lms_course_url) {
    lines.push(`Course LMS URL: ${survey.lms_course_url}`)
  }
  return lines.join('\n')
}
