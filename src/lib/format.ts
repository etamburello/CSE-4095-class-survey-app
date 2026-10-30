export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatPercent(count: number, total: number) {
  if (total <= 0) return '0.0%'
  return `${((count / total) * 100).toFixed(1)}%`
}

export function responseCountLabel(count: number) {
  return `${count} ${count === 1 ? 'response' : 'responses'}`
}
