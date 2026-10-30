const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900'

const base =
  'inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'

export const primaryButton = `${base} bg-slate-900 text-white hover:bg-slate-800 ${focus}`

export const secondaryButton = `${base} border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 ${focus}`

export const dangerButton = `${base} bg-red-800 text-white hover:bg-red-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900`

export const dangerQuietButton = `${base} border border-red-300 bg-white text-red-800 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800`

export const textInput =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900'

export const textLink = `rounded-sm text-sm font-medium text-stone-600 hover:text-stone-900 ${focus}`

export const fieldLabel = 'mb-1 block text-sm font-medium text-stone-800'
