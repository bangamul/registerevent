import axios from 'axios'

const API_URL =
  // import.meta.env.VITE_API_URL ?? 'http://localhost/trisakti/api'
  import.meta.env.VITE_API_URL ?? 'http://192.168.10.2/trisakti/api'

export type Participant = {
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
  waktu_konfirmasi?: string | null
  gate?: number | string | null
  role_permission?: number | string | null
  status: boolean
  rsvp_status?: 'pending' | 'confirmed' | 'declined' | string
  waktu_souvenir?: string | null
  souvenir_status?: string | null
}

interface ParticipantResponse {
  success: boolean
  message?: string
  data?: Participant
}

interface ParticipantListResponse {
  success: boolean
  message?: string
  data: Participant[]
  total: number
}

export type LogActivity = {
  id: number
  participant_id: number
  activity: string
  description: string
  status?: string | number
  created_at?: string
}

interface LogListResponse {
  success: boolean
  message?: string
  data: LogActivity[]
}

export async function findParticipants(): Promise<Participant[]> {
  const response = await axios.post<ParticipantListResponse>(
    `${API_URL}/UserPesertaList.php`,
  )

  if (!response.data.success) {
    throw new Error(
      response.data.message ?? 'Gagal mengambil data peserta',
    )
  }

  return response.data.data
}

export async function searchParticipantsByName(query: string): Promise<Participant[]> {
  if (!query || query.trim().length === 0) return []
  try {
    const response = await axios.get<{ success: boolean; data: Participant[] }>(
      `${API_URL}/SearchPesertaNama.php`,
      { params: { q: query.trim() } }
    )
    if (!response.data.success || !Array.isArray(response.data.data)) {
      return []
    }
    return response.data.data
  } catch {
    return []
  }
}

async function postParticipant(
  endpoint: string,
  formData: FormData,
  fallbackMessage: string,
): Promise<Participant> {
  const response = await axios.post<ParticipantResponse>(
    `${API_URL}/${endpoint}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message ?? fallbackMessage,
    )
  }

  return response.data.data
}

export async function findParticipant(
  idRegistrasi: string,
): Promise<Participant> {
  const formData = new FormData()
  formData.append('id_registrasi', idRegistrasi)

  return postParticipant(
    'UserPeserta.php',
    formData,
    'Data peserta tidak ditemukan',
  )
}

export async function checkInParticipant(
  idRegistrasi: string,
  userAdminId: number,
): Promise<Participant> {
  const formData = new FormData()

  formData.append('id_registrasi', idRegistrasi)
  formData.append('user_admin_id', String(userAdminId))

  return postParticipant(
    'CheckInPeserta.php',
    formData,
    'Gagal memvalidasi kehadiran peserta',
  )
}

export async function updateParticipantPhoto(
  idRegistrasi: string,
  file: File,
): Promise<Participant> {
  const formData = new FormData()
  formData.append('id_registrasi', idRegistrasi)
  formData.append('foto', file)

  return postParticipant(
    'UpdateFotoPeserta.php',
    formData,
    'Gagal mengunggah foto peserta',
  )
}

export async function updateParticipant(data: {
  id_registrasi: string
  name: string
  notelp: string
  email: string | null
  pekerjaan: string | null
  gate: number | string | null
  role_permission: number | string | null
}): Promise<Participant> {
  const formData = new FormData()
  formData.append('id_registrasi', data.id_registrasi)
  formData.append('name', data.name)
  formData.append('notelp', data.notelp)
  formData.append('email', data.email ?? '')
  formData.append('pekerjaan', data.pekerjaan ?? '')
  formData.append('gate', String(data.gate ?? 1))
  formData.append('role_permission', String(data.role_permission ?? 1))

  return postParticipant(
    'UpdatePeserta.php',
    formData,
    'Gagal memperbarui data peserta',
  )
}

export async function createParticipant(data: {
  name: string
  notelp: string
  email?: string
  pekerjaan?: string
  gate?: string
  role_permission?: string
  foto?: File | null
}): Promise<Participant> {
  const formData = new FormData()
  formData.append('name', data.name)
  formData.append('notelp', data.notelp)
  formData.append('email', data.email ?? '')
  formData.append('pekerjaan', data.pekerjaan ?? '')
  formData.append('gate', data.gate ?? '')
  formData.append('role_permission', data.role_permission ?? '')

  if (data.foto) {
    formData.append('foto', data.foto)
  }

  return postParticipant(
    'CreatePeserta.php',
    formData,
    'Gagal menambahkan peserta baru',
  )
}

export async function getParticipantLogs(params: {
  participantId?: number
  idRegistrasi?: string
}): Promise<LogActivity[]> {
  const formData = new FormData()

  if (params.participantId) {
    formData.append('participant_id', String(params.participantId))
  }
  if (params.idRegistrasi) {
    formData.append('id_registrasi', params.idRegistrasi)
  }

  const response = await axios.post<LogListResponse>(
    `${API_URL}/GetLog.php`,
    formData,
  )

  if (!response.data.success) {
    throw new Error(response.data.message ?? 'Gagal mengambil log aktivitas')
  }

  return response.data.data
}

export async function checkExistingParticipant(phoneOrId: string): Promise<Participant | null> {
  const formData = new FormData()
  if (phoneOrId.startsWith('REG-')) {
    formData.append('id_registrasi', phoneOrId)
  } else {
    formData.append('notelp', phoneOrId)
  }

  try {
    const response = await axios.post<ParticipantResponse>(
      `${API_URL}/UserPeserta.php`,
      formData,
    )
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    return null
  } catch {
    return null
  }
}

export interface ConfirmResult {
  success: boolean
  already_confirmed?: boolean
  message: string
  data?: Participant | null
}

export async function confirmAttendance(data: {
  notelp: string
  id_registrasi?: string
  name?: string
  action?: 'confirm' | 'decline'
  email?: string
  pekerjaan?: string
  gate?: string
  role_permission?: string
}): Promise<ConfirmResult> {
  const formData = new FormData()
  formData.append('notelp', data.notelp)
  if (data.id_registrasi) formData.append('id_registrasi', data.id_registrasi)
  if (data.name) formData.append('name', data.name)
  if (data.action) formData.append('action', data.action)
  if (data.email) formData.append('email', data.email)
  if (data.pekerjaan) formData.append('pekerjaan', data.pekerjaan)
  if (data.gate) formData.append('gate', data.gate)
  if (data.role_permission) formData.append('role_permission', data.role_permission)

  const response = await axios.post<ConfirmResult>(
    `${API_URL}/KonfirmasiPeserta.php`,
    formData,
  )

  if (!response.data.success) {
    throw new Error(response.data.message || 'Gagal memproses konfirmasi kehadiran.')
  }

  return response.data
}

export interface RsvpSettings {
  status: 'open' | 'closed'
  is_open: boolean
  title: string
  message: string
  contact_person: string
  closed_at: string | null
}

export async function fetchRsvpSettings(): Promise<RsvpSettings> {
  const response = await axios.get<{ success: boolean; data: RsvpSettings }>(
    `${API_URL}/RsvpSettings.php`
  )
  return response.data.data
}
