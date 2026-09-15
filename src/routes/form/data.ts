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
  gate?: number | string | null
  role_permission?: number | string | null
  status: boolean
}

interface ParticipantResponse {
  success: boolean
  message?: string
  data?: Participant
}

async function postParticipant(
  endpoint: string,
  formData: FormData,
  fallbackMessage: string,
): Promise<Participant> {
  const response = await axios.post<ParticipantResponse>(
    `${API_URL}/${endpoint}`,
    formData,
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
