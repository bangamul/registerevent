import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useCurrentUser } from '../../lib/use-current-user'
import { useRegistrationId } from '../../lib/use-registration-id'
import { findParticipant, type Participant } from './data'

export function ProfilePage() {
  const currentUser = useCurrentUser()
  const registrationId = useRegistrationId(currentUser?.id)

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 💡 1. Fetch data peserta awal saat halaman/ID registrasi di-load
  useEffect(() => {
    if (!registrationId) {
      setLoading(false)
      setError('ID Registrasi tidak ditemukan.')
      return
    }

    async function loadParticipant() {
      try {
        setLoading(true)
        setError('')
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
        setParticipant(updatedData)
        setError('')
      }
    }

    return () => {
      channel.close()
    }
  }, [])

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat px-6 text-slate-900"
        style={{ backgroundImage: "url('/images/bg-book.jpeg')" }}
      >
        <div className="rounded-2xl border border-amber-900/15 bg-white/90 px-8 py-5 shadow-2xl backdrop-blur-md">
          <p className="text-sm font-bold text-amber-900 animate-pulse flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-700 animate-ping" />
            Memuat data peserta...
          </p>
        </div>
      </main>
    )
  }

  if (error || !participant) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat px-6 text-slate-900"
        style={{ backgroundImage: "url('/images/bg-book.jpeg')" }}
      >
        <section className="w-full max-w-xl rounded-3xl border border-amber-900/15 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-md">
          <p className="text-base font-bold text-rose-800">
            {error || 'Data peserta tidak ditemukan.'}
          </p>

          <Link
            to="/form"
            className="mt-6 inline-block rounded-xl border border-slate-300 bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition"
          >
            Kembali ke form admin
          </Link>
        </section>
      </main>
    )
  }

  const isAlreadyValidated = Boolean(participant.waktu_hadir)

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-cover bg-center bg-no-repeat px-6 py-10 text-slate-900 relative"
      style={{ backgroundImage: "url('/images/bg-book.jpeg')" }}
    >
      <section className="relative z-10 w-full max-w-3xl rounded-[2.5rem] border border-amber-900/20 bg-white/95 p-8 text-center shadow-[0_20px_60px_rgba(120,53,15,0.15)] backdrop-blur-md sm:p-12">
        {/* HEADER BADGE */}
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 border border-amber-300/60 px-5 py-1.5 text-xs font-extrabold uppercase tracking-[0.3em] text-amber-900 shadow-sm">
          <span>✨</span>
          <span>WELCOME TO THE EVENT</span>
        </div>

        {/* NAMA PESERTA */}
        <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-tight">
          {participant.name}
        </h1>

        {/* JABATAN / INSTANSI */}
        <p className="mt-3 text-lg font-bold text-amber-800 sm:text-2xl">
          {participant.pekerjaan ?? 'Tamu Undangan'}
        </p>

        {/* ELEGANT DIVIDER WITH ACCENT */}
        <div className="mx-auto my-8 flex items-center justify-center gap-3 max-w-xs opacity-60">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-900" />
          <span className="text-xs text-amber-900 font-serif">◆</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-900" />
        </div>

        {/* STATUS KEHADIRAN & WAKTU (HERO BOX GOLD TONE) */}
        <div className="mx-auto max-w-xl">
          <div
            className={`rounded-2xl border-2 p-6 transition-all duration-300 shadow-sm ${
              isAlreadyValidated
                ? 'border-amber-500/60 bg-gradient-to-b from-amber-50/90 to-amber-100/70'
                : 'border-slate-300 bg-slate-50/90'
            }`}
          >
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-900/70">
              STATUS KEHADIRAN
            </span>

            <p
              className={`mt-1.5 text-2xl font-black sm:text-3xl tracking-wide ${
                isAlreadyValidated ? 'text-amber-950' : 'text-slate-600'
              }`}
            >
              {isAlreadyValidated ? '✓ SUDAH VALIDASI' : '⏳ BELUM VALIDASI'}
            </p>

            {participant.waktu_hadir ? (
              <div className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-white/90 border border-amber-300 px-4 py-1.5 text-xs font-bold text-slate-800 shadow-sm">
                <span className="text-amber-800 font-extrabold">🕒 Waktu Masuk:</span>
                <span className="font-mono text-slate-900 font-black">
                  {new Date(participant.waktu_hadir).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}{' '}
                  WIB
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Menunggu konfirmasi scan barcode dari petugas...
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER ACRONYM */}
      <footer className="relative z-10 mt-6 text-center text-xs font-bold text-slate-700">
        Peluncuran Buku: Timah, Manusia, dan Masa Depan
      </footer>
    </main>
  )
}
