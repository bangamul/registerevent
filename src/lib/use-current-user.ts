import { useEffect, useState } from 'react'
import { getCurrentUserId, subscribeToAuth } from './auth-session'

export function useCurrentUser() {
  const [userId, setUserId] = useState(() => getCurrentUserId())
  const user = userId ? { id: userId } : undefined

  useEffect(() => subscribeToAuth(setUserId), [])
  return user
}