import { useContext } from 'react'
import { AuthContext } from './auth-context.ts'

export function useAuth() {
  const store = useContext(AuthContext)
  if (!store) throw new Error('useAuth must be used within AuthProvider')
  return store
}
