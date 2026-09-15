import { useEffect, useState, useRef } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  findParticipant,
  updateParticipantPhoto,
  updateParticipant,
  getParticipantLogs,
  type Participant,
  type LogActivity,
} from './data'

// const BASE_URL = import.meta.env.VITE_API_IMAGE || 'http://localhost/trisakti'
const BASE_URL = import.meta.env.VITE_API_IMAGE || 'http://192.168.10.2/trisakti'
const LOG_PAGE_SIZE = 5

function getPhotoUrl(foto: string | null | undefined): string | null {
  if (!foto) return null
  if (foto.startsWith('http://') || foto.startsWith('https://')) return foto
  const cleanFotoPath = foto.startsWith('/') ? foto.slice(1) : foto
  return `${BASE_URL}/assets/images/${cleanFotoPath}`
}

export function DetailPage() {
  const { idRegistrasi } = useParams({ strict: false })

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState(false)
  const [uploading, setUploading] = useState(false)

  // State Modal Cetak ID Card
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  // State Mode Edit & Form Data
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    notelp: '',
    email: '',
    pekerjaan: '',
    gate: '1',
    role_permission: '1',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [logs, setLogs] = useState<LogActivity[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logPage, setLogPage] = useState(1)

  useEffect(() => {
    if (!idRegistrasi) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      setError('ID Registrasi tidak ditemukan.')
      return
    }

    async function loadParticipant() {
      try {
        setLoading(true)
        setError('')
        setImageError(false)

        const data = await findParticipant(idRegistrasi)
        setParticipant(data)
        setFormData({
          name: data.name,
          notelp: data.notelp,
          email: data.email ?? '',
          pekerjaan: data.pekerjaan ?? '',
          gate: String(data.gate ?? '1'),
          role_permission: String(data.role_permission ?? '1'),
        })

        // Fetch Log aktivitas peserta
        setLoadingLogs(true)
        try {
          const logData = await getParticipantLogs({
            participantId: data.id,
            idRegistrasi: idRegistrasi,
          })
          setLogs(logData)
          setLogPage(1)
        } catch (logErr) {
          console.error('Error loading logs:', logErr)
        } finally {
          setLoadingLogs(false)
        }

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal mengambil data peserta.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadParticipant()
  }, [idRegistrasi])

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !idRegistrasi) return

    try {
      setUploading(true)
      setImageError(false)

      const updatedData = await updateParticipantPhoto(idRegistrasi, file)
      setParticipant(updatedData)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengunggah foto.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Toggle Edit / Simpan
  const handleToggleEdit = async () => {
    if (!participant || !idRegistrasi) return

    if (!isEditing) {
      setIsEditing(true)
    } else {
      try {
        setSaving(true)
        const updatedData = await updateParticipant({
          id_registrasi: idRegistrasi,
          name: formData.name,
          notelp: formData.notelp,
          email: formData.email,
          pekerjaan: formData.pekerjaan,
          gate: formData.gate,
          role_permission: formData.role_permission,
        })

        setParticipant(updatedData)
        setIsEditing(false)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal menyimpan perubahan.')
      } finally {
        setSaving(false)
      }
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Fungsi Export Detail Peserta & Log Activity ke Excel (.xls)
  const exportDetailToExcel = () => {
    if (!participant) return

    const isCheckedIn = participant.status
    const typeUser = participant.role_permission === '1'

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <title>Detail Peserta - ${participant.name}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          h2 { color: #008080; margin-top: 20px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 0.5pt solid #cccccc; padding: 8px; text-align: left; font-size: 11pt; }
          th { background-color: #008080; color: #ffffff; font-weight: bold; }
          .label-col { background-color: #f2f2f2; font-weight: bold; width: 25%; }
        </style>
      </head>
      <body>
        <h2>PROFIL INFORMASI PESERTA</h2>
        <table>
          <tr>
            <td class="label-col">ID Registrasi</td>
            <td>${participant.id_registrasi || '-'}</td>
          </tr>
          <tr>
            <td class="label-col">Independent ID</td>
            <td>${participant.id_independent || '-'}</td>
          </tr>
          <tr>
            <td class="label-col">Nama Lengkap</td>
            <td>${participant.name || '-'}</td>
          </tr>
          <tr>
            <td class="label-col">No. Telepon</td>
            <td>${participant.notelp ? `'${participant.notelp}` : '-'}</td>
          </tr>
          <tr>
            <td class="label-col">Email</td>
            <td>${participant.email || '-'}</td>
          </tr>
          <tr>
            <td class="label-col">Pekerjaan</td>
            <td>${participant.pekerjaan || '-'}</td>
          </tr>
          <tr>
            <td class="label-col">Gate</td>
            <td>Gate ${participant.gate ?? '1'}</td>
          </tr>
          <tr>
            <td class="label-col">Role Permission</td>
            <td>Role ${participant.role_permission ?? '1'}</td>
          </tr>
          <tr>
            <td class="label-col">Status Kehadiran</td>
            <td>${isCheckedIn ? 'Sudah Validasi' : 'Belum Validasi'}</td>
          </tr>
          <tr>
            <td class="label-col">Waktu Hadir ${!typeUser ? 'Sesi 1' : ''}</td>
            <td>${participant.waktu_hadir ? new Date(participant.waktu_hadir).toLocaleString('id-ID') : '-'}</td>
          </tr>
          ${!typeUser ? `
          <tr>
            <td class="label-col">Waktu Hadir Sesi 2</td>
            <td>${participant.waktu_sesi_2 ? new Date(participant.waktu_sesi_2).toLocaleString('id-ID') : '-'}</td>
          </tr>
          ` : ''}
        </table>

        <h2>LOG AKTIVITAS PESERTA</h2>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Waktu</th>
              <th>Aktivitas</th>
              <th>Deskripsi</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length > 0 ? logs.map((log, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : `#${log.id}`}</td>
                <td>${log.activity || '-'}</td>
                <td>${log.description || '-'}</td>
                <td>${log.status ?? 'Tercatat'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5" style="text-align: center;">Belum ada log aktivitas.</td>
              </tr>
            `}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    const cleanName = participant.name.replace(/[^a-zA-Z0-9]/g, '_')
    link.href = url
    link.download = `Detail_Peserta_${cleanName}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalLogPages = Math.max(1, Math.ceil(logs.length / LOG_PAGE_SIZE))
  const visibleLogs = logs.slice(
    (logPage - 1) * LOG_PAGE_SIZE,
    logPage * LOG_PAGE_SIZE,
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-400" />
            <p className="text-sm text-slate-400">Memuat data peserta...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !participant) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-lg font-semibold text-red-400">
              Data peserta tidak ditemukan
            </h1>
            <p className="mt-2 text-sm text-red-300">
              {error || 'Data peserta tidak tersedia.'}
            </p>
            <Link
              to="/dashboard"
              className="mt-5 inline-flex rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const isCheckedIn = participant.status
  const photoUrl = getPhotoUrl(participant.foto)
  const typeUser = participant.role_permission === '1'

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Detail Peserta
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={exportDetailToExcel}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition hover:border-emerald-500/50 hover:bg-emerald-500/20 active:scale-95"
            >
              Export Excel
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-400 transition hover:border-cyan-500/50 hover:bg-cyan-500/20 active:scale-95"
            >
              <svg
                className="h-4 w-4 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
              </svg>
              Cetak ID Card
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleToggleEdit}
              className={[
                'rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50',
                isEditing
                  ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                  : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400 hover:text-cyan-300',
              ].join(' ')}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  Menyimpan...
                </span>
              ) : isEditing ? (
                'Simpan'
              ) : (
                'Edit'
              )}
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl">
          {/* Top */}
          <div className="border-b border-white/10 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {/* Foto + Overlay Upload */}
              <div className="relative group flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                {photoUrl && !imageError ? (
                  <img
                    src={photoUrl}
                    alt={participant.name}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span className="text-3xl font-bold text-slate-500">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                )}

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 text-xs font-medium text-cyan-300 opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />
                  ) : (
                    <>
                      <svg
                        className="mb-1 h-5 w-5 fill-current"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 9a3 3 0 100 6 3 3 0 000-6zm-7 3a7 7 0 1114 0 7 7 0 01-14 0zm7-11a1 1 0 011 1v1h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2V2a1 1 0 011-1h4z" />
                      </svg>
                      {participant.foto ? 'Ubah' : 'Unggah'}
                    </>
                  )}
                </button>
              </div>

              {/* Identity Header */}
              <div className="flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {participant.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {participant.pekerjaan || 'Pekerjaan belum diisi'}
                    </p>
                  </div>

                  <span
                    className={[
                      'inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold',
                      isCheckedIn
                        ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20'
                        : 'bg-amber-400/10 text-amber-300 border border-amber-400/20',
                    ].join(' ')}
                  >
                    {isCheckedIn ? 'Sudah Hadir' : 'Belum Validasi'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Informasi (Editable Mode) */}
          <div className="p-6 sm:p-8">
            <h3 className="mb-6 text-lg font-semibold text-white">
              Informasi Peserta
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              {/* ID Registrasi (Dikunci) */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  ID Registrasi
                </p>
                <p className="mt-1 break-all font-mono text-sm font-semibold text-cyan-300">
                  {participant.id_registrasi}
                </p>
              </div>

              {/* Independent ID (Dikunci) */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Independent ID
                </p>
                <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-300">
                  {participant.id_independent}
                </p>
              </div>

              {/* Nama */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Nama
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                ) : (
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {participant.name}
                  </p>
                )}
              </div>

              {/* No Telepon */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  No. Telepon
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    name="notelp"
                    value={formData.notelp}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                ) : (
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {participant.notelp}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Email
                </p>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                ) : (
                  <p className="mt-1 break-all text-sm font-medium text-slate-200">
                    {participant.email || '-'}
                  </p>
                )}
              </div>

              {/* Pekerjaan */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Pekerjaan
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    name="pekerjaan"
                    value={formData.pekerjaan}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                ) : (
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {participant.pekerjaan || '-'}
                  </p>
                )}
              </div>

              {/* Dropdown Gate */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Gate
                </p>
                {isEditing ? (
                  <select
                    name="gate"
                    value={formData.gate}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="1">Gate 1</option>
                    <option value="2">Gate 2</option>
                    <option value="3">Gate 3</option>
                    <option value="4">Gate 4</option>
                    <option value="5">Gate 5</option>
                  </select>
                ) : (
                  <p className="mt-1 text-sm font-medium text-cyan-400">
                    Gate {participant.gate ?? '1'}
                  </p>
                )}
              </div>

              {/* Dropdown Role Permission */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Role Permission
                </p>
                {isEditing ? (
                  <select
                    name="role_permission"
                    value={formData.role_permission}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="1">Role 1</option>
                    <option value="2">Role 2</option>
                  </select>
                ) : (
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    Role {participant.role_permission ?? '1'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Kehadiran */}
          <div className="border-t border-white/10 bg-slate-900/40 p-6 sm:p-8">
            <h3 className="mb-6 text-lg font-semibold text-white">
              Informasi Kehadiran
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status Kehadiran
                </p>
                <p
                  className={[
                    'mt-1 text-sm font-semibold',
                    isCheckedIn ? 'text-cyan-300' : 'text-amber-300',
                  ].join(' ')}
                >
                  {isCheckedIn
                    ? 'Sudah validasi'
                    : 'Belum validasi'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Waktu Hadir
                    {!typeUser && (
                      <> Sesi 1</>
                    )}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {participant.waktu_hadir
                      ? `${new Date(participant.waktu_hadir).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB`
                      : '-'}
                  </p>
                </div>
                {!typeUser && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Waktu Hadir Sesi 2
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-200">
                      {participant.waktu_sesi_2
                        ? `${new Date(participant.waktu_sesi_2).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB`
                        : '-'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Log Activity */}
          <div className="border-t border-white/10 bg-slate-900/20 p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Catatan Aktivitas Peserta
              </h3>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                Total: {logs.length} Log
              </span>
            </div>

            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
                <span className="ml-3 text-sm text-slate-400">Memuat log aktivitas...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-500">
                Belum ada log aktivitas untuk peserta ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-white/10 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Waktu / ID Log</th>
                      <th className="px-4 py-3">Aktivitas</th>
                      <th className="px-4 py-3">Deskripsi</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {visibleLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">
                          {log.created_at ? (
                            new Date(log.created_at).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            })
                          ) : (
                            `#${log.id}`
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-cyan-300">
                          {log.activity}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {log.description || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span
                            className={[
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              String(log.status) === '1' || String(log.status).toLowerCase() === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20',
                            ].join(' ')}
                          >
                            {log.status ?? 'Tercatat'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalLogPages > 1 && (
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-400">
                    <span>
                      Halaman {logPage} dari {totalLogPages}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={logPage === 1}
                        onClick={() => setLogPage((page) => page - 1)}
                        className="rounded-lg border border-slate-700 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Sebelumnya
                      </button>

                      <button
                        type="button"
                        disabled={logPage === totalLogPages}
                        onClick={() => setLogPage((page) => page + 1)}
                        className="rounded-lg border border-slate-700 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-white/10 p-6 sm:flex-row sm:justify-between">
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-center text-sm font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              Kembali ke Dashboard
            </Link>

            {!isCheckedIn && (
              <Link
                to="/form"
                className="rounded-xl bg-cyan-400 px-5 py-2.5 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Validasi Kehadiran
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* MODAL / PREVIEW CETAK ID CARD */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm print:p-0 print:bg-white">
          {/* Styling khusus untuk cetak ID card standar ukuran CR80 (54mm x 86mm atau proporsi serupa) */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-id-card, #printable-id-card * {
                visibility: visible;
              }
              #printable-id-card {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                width: 320px;
                height: 500px;
                box-shadow: none !important;
                margin: 0;
              }
            }
          `}</style>

          <div className="flex flex-col items-center space-y-6">
            {/* Tombol Aksi Modal (Hidden saat print) */}
            <div className="flex gap-4 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-cyan-300"
              >
                Cetak / Print
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Tutup
              </button>
            </div>

            {/* KARTU ID CARD */}
            <div
              id="printable-id-card"
              className="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl shadow-2xl"
              style={{
                width: '320px',
                height: '500px',
                backgroundImage: `url('/images/bg-idcard.png')`, // Sesuaikan path background image lu di sini
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Top Section: Logo / Header Title */}
              <div className="w-full pt-8 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                  Official Participant
                </p>
                <h3 className="text-sm font-extrabold tracking-wider text-white">
                  EVENT TRISAKTI
                </h3>
              </div>

              {/* Middle Section: Foto Peserta */}
              <div className="flex flex-col items-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white/30 shadow-xl bg-slate-800">
                  {photoUrl && !imageError ? (
                    <img
                      src={photoUrl}
                      alt={participant.name}
                      className="h-full w-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-400">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Nama & Pekerjaan */}
                <div className="mt-4 px-4 text-center">
                  <h2 className="line-clamp-1 text-lg font-bold uppercase tracking-wide text-white drop-shadow">
                    {participant.name}
                  </h2>
                  <p className="mt-0.5 line-clamp-1 text-xs font-medium text-cyan-200 drop-shadow">
                    {participant.pekerjaan || 'Peserta'}
                  </p>
                </div>
              </div>

              {/* Bottom Section: QR Code / Barcode & ID Registrasi */}
              <div className="w-full pb-10 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-white p-2 shadow-md">
                  {/* Simulasi QR Code menggunakan API publik atau teks ID Registrasi */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(participant.id_registrasi)}`}
                    alt="QR Code"
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="mt-2 font-mono text-[11px] font-bold tracking-widest text-white/90">
                  {participant.id_registrasi}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
