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
  waktu_kirim_wa?: string | null
  wa_status?: 'sent' | 'failed' | 'unsent' | string | null
  gate?: number | string | null
  role_permission?: number | string | null
  status: boolean
  rsvp_status?: 'pending' | 'confirmed' | 'declined' | string
  jalur_undangan?: 'blast' | 'manual' | string
  waktu_souvenir?: string | null
  souvenir_status?: 'unclaimed' | 'claimed' | string
  souvenir_petugas?: string | null
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

export type LastActivityLog = {
  participant_id: number
  last_created_at: string
}

interface LastLogListResponse {
  success: boolean
  message?: string
  data: LastActivityLog[]
}

// ------------------------------
// Helper filter sesi (berdasarkan role_permission, tier cascading)
// ------------------------------

/** Ambil daftar sesi yang tersedia, dari 1 sampai role_permission tertinggi di list. */
export function getSesiList(participants: Participant[]): number[] {
  const max = participants.reduce((acc, p) => {
    const n = parseInt(String(p.role_permission), 10)
    return Number.isFinite(n) && n > acc ? n : acc
  }, 1)

  return Array.from({ length: max }, (_, i) => i + 1)
}

/**
 * Cek apakah peserta termasuk sesi ke-N.
 * role_permission bersifat tier/cascading: value 2 berarti ikut Sesi 1 & 2,
 * jadi peserta match sesi N kalau role_permission-nya >= N.
 */
export function matchesSesi(participant: Participant, sesiKe: number): boolean {
  const n = parseInt(String(participant.role_permission), 10)
  return Number.isFinite(n) && n >= sesiKe
}

// ------------------------------
// API calls
// ------------------------------

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

export async function getLastActivityLogs(): Promise<Record<number, string>> {
  try {
    const response = await axios.post<LastLogListResponse>(
      `${API_URL}/GetLastLogs.php`
    )
    if (response.data.success && Array.isArray(response.data.data)) {
      const map: Record<number, string> = {}
      response.data.data.forEach((item) => {
        map[item.participant_id] = item.last_created_at
      })
      return map
    }
    return {}
  } catch {
    return {}
  }
}

export interface DailyReportSummary {
  total_peserta: number
  wa_terkirim: number
  wa_belum_terkirim: number
  wa_persentase: number
  rsvp_hadir: number
  rsvp_berhalangan: number
  rsvp_pending: number
  hadir_venue: number
  belum_hadir_venue: number
  jalur_blast?: number
  jalur_manual?: number
  souvenir_diambil?: number
  souvenir_belum_diambil?: number
}

export interface DailyBreakdownItem {
  tanggal: string
  wa_terkirim: number
  rsvp_hadir: number
}

export interface RecentLogItem {
  id: number
  activity: string
  description: string
  created_at: string
  participant_name: string | null
  participant_phone: string | null
  id_registrasi: string | null
}

export interface TamuRsvpItem {
  id: number
  id_registrasi: string
  name: string
  notelp: string
  pekerjaan: string | null
  waktu_konfirmasi: string | null
  jalur_undangan?: string
  gate?: string
  checkin_status?: number
  souvenir_status?: string
}

export interface LaporanHarianResponse {
  success: boolean
  summary: DailyReportSummary
  daily_breakdown: DailyBreakdownItem[]
  recent_logs: RecentLogItem[]
  tamu_hadir?: TamuRsvpItem[]
  tamu_berhalangan?: TamuRsvpItem[]
  generated_at: string
}

export async function fetchLaporanHarian(): Promise<LaporanHarianResponse> {
  const response = await axios.get<LaporanHarianResponse>(`${API_URL}/LaporanHarian.php`, {
    params: { _t: Date.now() },
  })
  if (!response.data.success) {
    throw new Error('Gagal memuat laporan harian.')
  }
  return response.data
}

export async function updateJalurUndangan(
  idOrIds: number | number[] | string,
  jalur: 'blast' | 'manual',
): Promise<void> {
  const formData = new FormData()
  if (Array.isArray(idOrIds)) {
    formData.append('ids', idOrIds.join(','))
  } else if (typeof idOrIds === 'number') {
    formData.append('id', String(idOrIds))
  } else {
    formData.append('id_registrasi', idOrIds)
  }
  formData.append('jalur', jalur)

  const response = await axios.post(`${API_URL}/UpdateJalurUndangan.php`, formData)
  if (!response.data.success) {
    throw new Error(response.data.message || 'Gagal mengubah jalur undangan')
  }
}

export async function updateWaStatusManual(
  idRegistrasi: string,
  status: 'manual_sent' | 'sent' | 'unsent',
): Promise<void> {
  const formData = new FormData()
  formData.append('id_registrasi', idRegistrasi)
  formData.append('status', status)

  const response = await axios.post(`${API_URL}/UpdateWaStatus.php`, formData)
  if (!response.data.success) {
    throw new Error(response.data.message || 'Gagal memperbarui status WA')
  }
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

export async function updateRsvpSettings(payload: {
  rsvp_status?: 'open' | 'closed'
  rsvp_closed_title?: string
  rsvp_closed_message?: string
  rsvp_contact_person?: string
}): Promise<RsvpSettings> {
  const formData = new FormData()
  if (payload.rsvp_status) formData.append('rsvp_status', payload.rsvp_status)
  if (payload.rsvp_closed_title) formData.append('rsvp_closed_title', payload.rsvp_closed_title)
  if (payload.rsvp_closed_message) formData.append('rsvp_closed_message', payload.rsvp_closed_message)
  if (payload.rsvp_contact_person) formData.append('rsvp_contact_person', payload.rsvp_contact_person)

  const response = await axios.post<{ success: boolean; data: RsvpSettings }>(
    `${API_URL}/RsvpSettings.php`,
    formData
  )
  return response.data.data
}

