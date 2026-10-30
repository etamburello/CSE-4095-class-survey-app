import type { SelectedAnswer, Survey, SurveyResponse } from './types.ts'

const recursionId = '11111111-1111-4111-8111-111111111111'
const recursionQ1 = '11111111-1111-4111-8111-111111111101'
const recursionQ2 = '11111111-1111-4111-8111-111111111102'
const baseCase = '11111111-1111-4111-8111-111111111201'
const pointerChoice = '11111111-1111-4111-8111-111111111202'
const loopChoice = '11111111-1111-4111-8111-111111111203'
const compilerChoice = '11111111-1111-4111-8111-111111111204'
const trueChoice = '11111111-1111-4111-8111-111111111205'
const falseChoice = '11111111-1111-4111-8111-111111111206'

const pointerId = '22222222-2222-4222-8222-222222222222'
const pointerQ1 = '22222222-2222-4222-8222-222222222201'
const addressChoice = '22222222-2222-4222-8222-222222222301'
const copyChoice = '22222222-2222-4222-8222-222222222302'
const loopPointerChoice = '22222222-2222-4222-8222-222222222303'

const icebreakerId = '33333333-3333-4333-8333-333333333333'
const icebreakerQ1 = '33333333-3333-4333-8333-333333333301'

const archivedId = '44444444-4444-4444-8444-444444444444'
const archivedQ1 = '44444444-4444-4444-8444-444444444401'
const recursionTopic = '44444444-4444-4444-8444-444444444501'
const pointersTopic = '44444444-4444-4444-8444-444444444502'
const listsTopic = '44444444-4444-4444-8444-444444444503'

function response(
  surveyId: string,
  index: number,
  answers: SelectedAnswer[],
  startIso: string,
): SurveyResponse {
  return {
    id: `${surveyId.slice(0, 8)}-r${index + 1}`,
    survey_id: surveyId,
    submitted_at: new Date(Date.parse(startIso) + index * 15000).toISOString(),
    answers,
  }
}

function repeat(choiceId: string, count: number) {
  return Array.from({ length: count }, () => choiceId)
}

function choiceForRecursion(index: number) {
  if (index < 41) return { choiceId: baseCase, tfId: trueChoice }
  if (index < 45) return { choiceId: baseCase, tfId: falseChoice }
  if (index < 48) return { choiceId: pointerChoice, tfId: trueChoice }
  if (index < 50) return { choiceId: loopChoice, tfId: trueChoice }
  return { choiceId: compilerChoice, tfId: trueChoice }
}

const recursionResponses = Array.from({ length: 52 }, (_, index) => {
  const picked = choiceForRecursion(index)
  return response(
    recursionId,
    index,
    [
      { question_id: recursionQ1, choice_id: picked.choiceId },
      { question_id: recursionQ2, choice_id: picked.tfId },
    ],
    '2026-08-17T12:10:00Z',
  )
})

const pointerResponses = [
  ...repeat(addressChoice, 6),
  ...repeat(copyChoice, 1),
  ...repeat(loopPointerChoice, 1),
].map((choiceId, index) =>
  response(
    pointerId,
    index,
    [{ question_id: pointerQ1, choice_id: choiceId }],
    '2026-09-03T15:05:00Z',
  ),
)

const archivedResponses = [
  ...repeat(recursionTopic, 4),
  ...repeat(pointersTopic, 2),
  ...repeat(listsTopic, 1),
].map((choiceId, index) =>
  response(
    archivedId,
    index,
    [{ question_id: archivedQ1, choice_id: choiceId }],
    '2026-05-12T14:20:00Z',
  ),
)

const surveys: Survey[] = [
  {
    id: recursionId,
    title: 'Recursion Concept Check',
    description: 'Quick understanding check',
    status: 'active',
    public_slug: 'x7kf2q',
    created_at: '2026-08-17T12:00:00Z',
    updated_at: '2026-08-17T12:05:00Z',
    questions: [
      {
        id: recursionQ1,
        question_text: 'What is required for recursion?',
        question_type: 'multiple_choice',
        position: 1,
        choices: [
          { id: baseCase, choice_text: 'A base case', position: 1 },
          { id: pointerChoice, choice_text: 'A pointer', position: 2 },
          { id: loopChoice, choice_text: 'A loop', position: 3 },
          { id: compilerChoice, choice_text: 'A compiler', position: 4 },
        ],
      },
      {
        id: recursionQ2,
        question_text: 'Every recursive function needs a stopping condition.',
        question_type: 'true_false',
        position: 2,
        choices: [
          { id: trueChoice, choice_text: 'True', position: 1 },
          { id: falseChoice, choice_text: 'False', position: 2 },
        ],
      },
    ],
  },
  {
    id: pointerId,
    title: 'Pointer Review',
    description: 'After the pointers lecture',
    status: 'closed',
    public_slug: 'p4n8wd',
    created_at: '2026-09-03T15:00:00Z',
    updated_at: '2026-09-03T16:00:00Z',
    questions: [
      {
        id: pointerQ1,
        question_text: 'Which statement about pointers is correct?',
        question_type: 'multiple_choice',
        position: 1,
        choices: [
          { id: addressChoice, choice_text: 'Stores an address', position: 1 },
          { id: copyChoice, choice_text: 'Copies the value', position: 2 },
          { id: loopPointerChoice, choice_text: 'Is a loop', position: 3 },
        ],
      },
    ],
  },
  {
    id: icebreakerId,
    title: 'Week 1 Icebreaker',
    description: 'Choose the first review topic',
    status: 'draft',
    public_slug: null,
    created_at: '2026-10-20T18:00:00Z',
    updated_at: '2026-10-20T18:00:00Z',
    questions: [
      {
        id: icebreakerQ1,
        question_text: 'Which topic should we review first?',
        question_type: 'multiple_choice',
        position: 1,
        choices: [
          {
            id: '33333333-3333-4333-8333-333333333401',
            choice_text: 'Recursion',
            position: 1,
          },
          {
            id: '33333333-3333-4333-8333-333333333402',
            choice_text: 'Pointers',
            position: 2,
          },
          {
            id: '33333333-3333-4333-8333-333333333403',
            choice_text: 'Big-O',
            position: 3,
          },
        ],
      },
    ],
  },
  {
    id: archivedId,
    title: 'Midterm Reflection',
    description: 'Kept for the semester archive',
    status: 'archived',
    public_slug: 'm2archv',
    created_at: '2026-05-12T14:00:00Z',
    updated_at: '2026-05-12T15:00:00Z',
    questions: [
      {
        id: archivedQ1,
        question_text: 'Which topic was hardest?',
        question_type: 'multiple_choice',
        position: 1,
        choices: [
          { id: recursionTopic, choice_text: 'Recursion', position: 1 },
          { id: pointersTopic, choice_text: 'Pointers', position: 2 },
          { id: listsTopic, choice_text: 'Lists', position: 3 },
        ],
      },
    ],
  },
]

export type SurveyState = {
  surveys: Survey[]
  responses: SurveyResponse[]
  submittedSurveyIds: string[]
}

export function createInitialState(): SurveyState {
  return {
    surveys,
    responses: [
      ...recursionResponses,
      ...pointerResponses,
      ...archivedResponses,
    ],
    submittedSurveyIds: [],
  }
}
