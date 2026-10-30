import type { SurveyStatus } from '../lib/types.ts'

const labels: Record<SurveyStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
}

const tones: Record<SurveyStatus, string> = {
  draft: 'bg-stone-200 text-stone-800',
  active: 'bg-emerald-100 text-emerald-950',
  closed: 'bg-amber-100 text-amber-950',
  archived: 'bg-slate-200 text-slate-800',
}

export function StatusBadge({ status }: { status: SurveyStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold ${tones[status]}`}
    >
      {labels[status]}
    </span>
  )
}
