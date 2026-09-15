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
