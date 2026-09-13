const REGISTRATION_ID_EVENT = 'trisakti:registration-id-changed'

function getKey(userId: string) {
  return `trisakti.registrationId.${userId}`
}

export function saveRegistrationId(userId: string, registrationId: string) {
  localStorage.setItem(getKey(userId), registrationId)
  window.dispatchEvent(new CustomEvent(REGISTRATION_ID_EVENT, { detail: { userId, registrationId } }))
}

export function getRegistrationId(userId: string) {
  return localStorage.getItem(getKey(userId))
}

export function subscribeToRegistrationId(userId: string, onChange: (registrationId: string | null) => void) {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === getKey(userId)) onChange(event.newValue)
  }
  const handleSameTabChange = (event: Event) => {
    const detail = (event as CustomEvent<{ userId: string; registrationId: string }>).detail
    if (detail.userId === userId) onChange(detail.registrationId)
  }

  window.addEventListener('storage', handleStorageChange)
  window.addEventListener(REGISTRATION_ID_EVENT, handleSameTabChange)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener(REGISTRATION_ID_EVENT, handleSameTabChange)
  }
}