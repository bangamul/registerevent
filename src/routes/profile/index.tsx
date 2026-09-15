import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useCurrentUser } from '../../lib/use-current-user'
import { useRegistrationId } from '../../lib/use-registration-id'
import { findParticipant, type Participant } from './data'

// Tentukan Base API URL (sesuaikan dengan VITE_API_IMAGE / environment variable di projekmu)
// const BASE_URL = import.meta.env.VITE_API_IMAGE || 'http://localhost:5173'
const BASE_URL = import.meta.env.VITE_API_IMAGE || 'http://192.168.10.2/trisakti'

// Helper untuk memastikan URL foto valid (baik jika dari CDN/external link maupun endpoint lokal API)
function getPhotoUrl(foto: string | null | undefined): string | null {
  if (!foto) return null
  if (foto.startsWith('http://') || foto.startsWith('https://')) return foto

  // Menghapus slash di awal jika ada
  const cleanFotoPath = foto.startsWith('/') ? foto.slice(1) : foto
  return `${BASE_URL}/assets/images/${cleanFotoPath}`
}

export function ProfilePage() {
  const currentUser = useCurrentUser()
  const registrationId = useRegistrationId(currentUser?.id)

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState(false)

  // 💡 1. Fetch data peserta awal saat halaman/ID registrasi di-load
  useEffect(() => {
    if (!registrationId) {
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

        const data = await findParticipant(registrationId)

        setParticipant(data)
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
  }, [registrationId])

  // 💡 2. Listener BroadcastChannel untuk menangkap sinyal validasi real-time dari /form
  useEffect(() => {
    const channel = new BroadcastChannel('event_checkin_channel')

    channel.onmessage = (event) => {
      if (event.data?.type === 'CHECK_IN_SUCCESS') {
        const updatedData: Participant = event.data.participant

        // Pastikan update hanya terjadi jika ID registrasi cocok dengan TV yang sedang aktif
        setParticipant((prev) => {
          if (prev && prev.id_registrasi === updatedData.id_registrasi) {
            return updatedData
          }
          return prev
        })
      }
    }

    return () => {
      channel.close()
    }
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-sm text-slate-400">
          Memuat data peserta...
        </p>
      </main>
    )
  }

  if (error || !participant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center">
          <p className="text-sm text-rose-300">
            {error || 'Data peserta tidak ditemukan.'}
          </p>

          <Link
            to="/form"
            className="mt-6 inline-block text-sm text-slate-400 hover:text-white"
          >
            Kembali ke form admin
          </Link>
        </section>
      </main>
    )
  }

  const initials = participant.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  const photoUrl = getPhotoUrl(participant.foto)
  const isAlreadyValidated = Boolean(participant.waktu_hadir)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl backdrop-blur sm:p-14">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
          Registration confirmed
        </p>

        {photoUrl && !imageError ? (
          <img
            src={photoUrl}
            alt={participant.name}
            onError={() => setImageError(true)}
            className="mx-auto mt-8 h-28 w-28 rounded-full border-2 border-white/10 object-cover shadow-xl sm:h-36 sm:w-36"
          />
        ) : (
          <div className="mx-auto mt-8 flex h-28 w-28 items-center justify-center rounded-full bg-white text-4xl font-black text-slate-950 shadow-xl sm:h-36 sm:w-36 sm:text-5xl">
            {initials}
          </div>
        )}

        <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-6xl">
          {participant.name}
        </h1>

        <p className="mt-4 text-lg text-slate-300 sm:text-2xl">
          {participant.pekerjaan ?? 'Peserta Event Trisakti 2026'}
        </p>

        {/* Row 1: Identitas Utama */}
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
          <Info
            label="Registration ID"
            value={participant.id_registrasi}
          />

          <Info
            label="Independent ID"
            value={participant.id_independent}
          />

          <Info
            label="Email"
            value={participant.email ?? '-'}
          />
        </div>

        {/* Row 2: Telpon, Gate, Role Permission */}
        <div className="mx-auto mt-4 grid max-w-3xl gap-4 sm:grid-cols-3">
          <Info
            label="No. Telpon"
            value={participant.notelp}
          />

          <Info
            label="Gate"
            value={participant.gate ?? '-'}
          />

          <Info
            label="Role Permission"
            value={participant.role_permission ?? '-'}
          />
        </div>

        {/* Status Check-in Card (Full Width / Standout) */}
        <div className="mx-auto mt-4 max-w-3xl">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition-all duration-300">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Status Kehadiran
            </p>
            <p
              className={`mt-2 text-base font-semibold ${
                isAlreadyValidated ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isAlreadyValidated ? 'Sudah Validasi' : 'Belum Validasi'}
            </p>
          </div>
        </div>

        {participant.waktu_hadir && (
          <p className="mt-8 text-sm text-slate-400">
            Waktu hadir:{' '}
            {new Date(participant.waktu_hadir).toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}{' '}
            WIB
          </p>
        )}

        <p className="mt-12 hidden text-sm text-slate-500">
          Silakan menunggu proses registrasi dari admin.
        </p>

        <Link
          to="/form"
          className="mt-6 hidden text-sm text-slate-500 hover:text-white"
        >
          Kembali ke form admin
        </Link>
      </section>
    </main>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  )
}
