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

export function filteredResponseCountLabel(
  shown: number,
  total: number,
  filtering: boolean,
) {
  if (!filtering) return responseCountLabel(total)
  const noun = total === 1 ? 'response' : 'responses'
  return `${shown} of ${total} ${noun}`
}

export function localDateKey(iso: string) {
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function matchesDateRange(iso: string, from: string, to: string) {
  const key = localDateKey(iso)
  if (from && key < from) return false
  if (to && key > to) return false
  return true
}
