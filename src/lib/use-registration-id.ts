import { useEffect, useState } from 'react'
import { getRegistrationId, subscribeToRegistrationId } from './registration-session'

export function useRegistrationId(userId: string | undefined, fallback = 'TRS-2026-0001') {
  const [registrationId, setRegistrationId] = useState(() => userId ? getRegistrationId(userId) ?? fallback : fallback)

  useEffect(() => {
    if (!userId) return
    return subscribeToRegistrationId(userId, (nextId) => setRegistrationId(nextId ?? fallback))
  }, [fallback, userId])

  return registrationId
}