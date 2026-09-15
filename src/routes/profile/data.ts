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
  gate?: string | number | null
  role_permission?: string | number | null
  status: boolean
}

interface ParticipantResponse {
  success: boolean
  message?: string
  data: Participant
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

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message ?? 'Data peserta tidak ditemukan',
    )
  }

  return response.data.data
}
