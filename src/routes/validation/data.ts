import axios from 'axios'

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost/trisakti/api'
const API_URL = import.meta.env.VITE_API_URL ?? 'http://192.168.10.2/trisakti/api'


export interface Participant {
  id: number
  id_registrasi: string
  id_independent: string
  name: string
  notelp: string
  email: string | null
  foto: string | null
  pekerjaan: string | null
  waktu_hadir: string | null
  waktu_sesi_2: string | null
  gate: string | null
  role_permission: string | null
  status: boolean
  waktu_souvenir?: string | null
  souvenir_status?: string | null
  souvenir_petugas?: string | null
  seating_arrangement?: string | null
}

export interface ParticipantResponse {
  success: boolean
  message?: string
  data: Participant
}

export interface CheckoutResponse {
  success: boolean
  message: string
  data?: {
    id_registrasi: string
    name: string
    action: string
  }
}

export async function findParticipant(
  idRegistrasi: string,
): Promise<Participant> {
  const formData = new FormData()

  formData.append('id_registrasi', idRegistrasi)

  const response = await axios.post<ParticipantResponse>(
    `${API_URL}/UserPeserta.php`,
    formData,
  )

  return response.data.data
}

export async function searchParticipantsByName(query: string): Promise<Participant[]> {
  if (!query || query.trim().length === 0) return []
  try {
    const response = await axios.get<{ success: boolean; data: Participant[] }>(
      `${API_URL}/SearchPesertaNama.php`,
      { params: { q: query.trim() } }
    )
    if (!response.data.success || !Array.isArray(response.data.data)) return []
    return response.data.data
  } catch {
    return []
  }
}


// Helper baru untuk Clock Out / Checkout Peserta
export async function checkoutParticipant(
  idRegistrasi: string,
  userId: string,
): Promise<CheckoutResponse['data']> {
  const formData = new FormData()

  formData.append('id_registrasi', idRegistrasi)
  formData.append('user_id', userId)
  formData.append('action', 'CHECKOUT')

  const response = await axios.post<CheckoutResponse>(
    `${API_URL}/checkoutpeserta.php`,
    formData,
  )

  if (!response.data.success) {
    throw new Error(response.data.message || 'Gagal melakukan checkout.')
  }

  return response.data.data
}

// Helper baru untuk Re-entry / Check-in ulang Peserta yang sudah pernah validasi
export async function checkinParticipant(
  idRegistrasi: string,
  userId: string,
  session: number = 1, // 👈 Tambah parameter session (default 1)
): Promise<Participant> {
  const formData = new FormData()

  formData.append('id_registrasi', idRegistrasi)
  formData.append('user_admin_id', userId)
  formData.append('sesi', String(session))

  const response = await axios.post<ParticipantResponse>(
    `${API_URL}/CheckInPeserta.php`,
    formData,
  )

  if (!response.data.success) {
    throw new Error(response.data.message || 'Gagal melakukan check-in.')
  }

  return response.data.data
}

export interface SouvenirClaimResult {
  success: boolean
  code: 'SUCCESS' | 'ALREADY_CLAIMED' | 'NOT_STARTED_YET' | 'BOOTH_CLOSED' | 'NOT_FOUND' | string
  message: string
  data?: {
    id?: number
    id_registrasi: string
    name: string
    notelp?: string
    foto?: string | null
    pekerjaan?: string | null
    waktu_souvenir?: string | null
    souvenir_status?: string | null
    souvenir_petugas?: string | null
    scheduled_time?: string
    scheduled_date?: string
    current_time?: string
  }
}

export interface SouvenirSettings {
  mode: 'auto' | 'open' | 'closed'
  start_time: string
  start_date: string
  title: string
  is_open: boolean
  status_text: string
  current_time: string
  current_date: string
  stats: {
    total_peserta: number
    claimed_count: number
    unclaimed_count: number
  }
}

export async function fetchSouvenirSettings(): Promise<SouvenirSettings> {
  const response = await axios.get<{ success: boolean; data: SouvenirSettings }>(
    `${API_URL}/SouvenirSettings.php`,
  )
  return response.data.data
}

export async function updateSouvenirSettings(payload: {
  souvenir_mode?: 'auto' | 'open' | 'closed'
  souvenir_start_time?: string
  souvenir_start_date?: string
  souvenir_title?: string
}): Promise<SouvenirSettings> {
  const formData = new FormData()
  if (payload.souvenir_mode) formData.append('souvenir_mode', payload.souvenir_mode)
  if (payload.souvenir_start_time) formData.append('souvenir_start_time', payload.souvenir_start_time)
  if (payload.souvenir_start_date) formData.append('souvenir_start_date', payload.souvenir_start_date)
  if (payload.souvenir_title) formData.append('souvenir_title', payload.souvenir_title)

  const response = await axios.post<{ success: boolean; data: SouvenirSettings }>(
    `${API_URL}/SouvenirSettings.php`,
    formData,
  )
  return response.data.data
}

export async function claimSouvenir(
  idRegistrasi: string,
  adminId: string = '1',
  petugasName: string = 'Petugas Souvenir',
  force: boolean = false,
): Promise<SouvenirClaimResult> {
  const formData = new FormData()
  formData.append('id_registrasi', idRegistrasi)
  formData.append('user_admin_id', adminId)
  formData.append('petugas_name', petugasName)
  if (force) formData.append('force', '1')

  try {
    const response = await axios.post<SouvenirClaimResult>(
      `${API_URL}/SouvenirClaim.php`,
      formData,
    )
    return response.data
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data) {
      return err.response.data as SouvenirClaimResult
    }
    throw err
  }
}

export async function resetSouvenirClaim(
  idRegistrasi: string,
  adminId: string = '1',
): Promise<{ success: boolean; message: string }> {
  const formData = new FormData()
  formData.append('id_registrasi', idRegistrasi)
  formData.append('user_admin_id', adminId)

  const response = await axios.post<{ success: boolean; message: string }>(
    `${API_URL}/SouvenirReset.php`,
    formData,
  )
  return response.data
}

