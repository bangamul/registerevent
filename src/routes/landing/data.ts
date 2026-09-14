import axios from 'axios'

const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost/trisakti/api'
  // import.meta.env.VITE_API_URL ?? 'http://10.17.17.245/trisakti/api'

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
  gate?: number | string | null
  role_permission?: number | string | null
  status: boolean
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
