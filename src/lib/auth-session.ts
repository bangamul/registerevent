const USER_ID_KEY = 'trisakti.currentUserId'
const AUTH_EVENT = 'trisakti:auth-changed'

export function saveCurrentUser(userId: string) {
  localStorage.setItem(USER_ID_KEY, userId)
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: userId }))
}

export function getCurrentUserId() {
  return localStorage.getItem(USER_ID_KEY)
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_ID_KEY)
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: null }))
}

export function subscribeToAuth(onChange: (userId: string | null) => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === USER_ID_KEY) onChange(event.newValue)
  }
  const handleAuth = (event: Event) => onChange((event as CustomEvent<string | null>).detail)

  window.addEventListener('storage', handleStorage)
  window.addEventListener(AUTH_EVENT, handleAuth)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(AUTH_EVENT, handleAuth)
  }
}