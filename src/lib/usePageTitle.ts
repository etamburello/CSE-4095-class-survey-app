import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title =
      title === 'Classroom Survey' ? title : `${title} · Classroom Survey`
  }, [title])
}
