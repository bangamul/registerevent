import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { saveRegistrationId } from '../../lib/registration-session'
import { useCurrentUser } from '../../lib/use-current-user'
import { findParticipant, checkinParticipant } from './data'
import axios from 'axios'

export function ValidationPage() {
  const [registrationId, setRegistrationId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // State Sesi (1 atau 2) - simpan ke localStorage biar ga reset saat refresh
  const [activeSession, setActiveSession] = useState<1 | 2>(() => {
    const saved = localStorage.getItem('validation_active_session')
    return saved ? (Number(saved) as 1 | 2) : 1
  })

  // Update localStorage saat sesi diganti
  const handleSessionChange = (session: 1 | 2) => {
    setActiveSession(session)
    localStorage.setItem('validation_active_session', String(session))
    // Reset state jika ada pesan gantung
    setError('')
    setSuccessMessage('')
    setRegistrationId('')
    lastAttemptedId.current = ''
    inputRef.current?.focus()
  }

  // Ref untuk cegah infinite loop saat ID ngasal / ter-scan berulang
  const lastAttemptedId = useRef('')
  const inputRef = useRef<HTMLInputElement>(null)

  const navigate = useNavigate()
  const currentUser = useCurrentUser()

  // Auto focus input
  useEffect(() => {
    if (!loading && !successMessage && !error) {
      inputRef.current?.focus()
    }
  }, [loading, successMessage, error])

  // Timer reset 3 detik kalau Check-in Ulang Sukses
  useEffect(() => {
    if (!successMessage) return

    const timer = setTimeout(() => {
      setSuccessMessage('')
      setRegistrationId('')
      setError('')
      lastAttemptedId.current = ''
      inputRef.current?.focus()
    }, 3000)

    return () => clearTimeout(timer)
  }, [successMessage])

  // Timer reset 3 detik kalau Error / ID Tidak Terdaftar / Tidak Punya Akses
  useEffect(() => {
    if (!error) return

    const timer = setTimeout(() => {
      setError('')
      setRegistrationId('')
      lastAttemptedId.current = ''
      inputRef.current?.focus()
    }, 3000)

    return () => clearTimeout(timer)
  }, [error])

  // Core Processing Function
  const processValidation = useCallback(
    async (idToProcess: string) => {
      const value = idToProcess.trim()

      if (!value || loading || successMessage || error) return

      if (!currentUser) {
        navigate({ to: '/login' })
        return
      }

      // Lock ID agar tidak diproses berulang
      // eslint-disable-next-line react-hooks/immutability
      lastAttemptedId.current = value

      setError('')
      setSuccessMessage('')
      setLoading(true)

      try {
        const peserta = await findParticipant(value)

        if (!peserta) {
          setError('ID anda tidak terdaftar')
          return
        }

        // 💡 VALIDASI HAK AKSES SESI 2
        if (activeSession === 2) {
          const rolePerm = String(peserta.role_permission ?? '')
          if (rolePerm !== '2') {
            setError('Akses Ditolak: Peserta tidak terdaftar untuk Sesi 2')
            return
          }

          // SCENARIO SESI 2: Catat log & isi waktu_sesi_2 (di backend)
          await checkinParticipant(value, String(currentUser.id), 2)
          setSuccessMessage(`Check-in Sesi 2 Berhasil: ${peserta.name}`)
        } else {
          // SCENARIO SESI 1:
          if (peserta.waktu_hadir) {
            // Sudah pernah validasi (waktu_hadir ada) -> Catat Log Check-in
            await checkinParticipant(value, String(currentUser.id), 1)
            setSuccessMessage(`Check-in Sesi 1 Berhasil: ${peserta.name}`)
          } else {
            // Belum pernah validasi (waktu_hadir null) -> Simpan session & lanjut ke /form
            saveRegistrationId(currentUser.id, peserta.id_registrasi)
            navigate({ to: '/form' })
          }
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('ID anda tidak terdaftar')
        } else if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message ?? 'ID anda tidak terdaftar')
        } else {
          setError('ID anda tidak terdaftar')
        }
      } finally {
        setLoading(false)
      }
    },
    [loading, successMessage, error, currentUser, navigate, activeSession],
  )

  // AUTO-SUBMIT READINESS CHECK
  useEffect(() => {
    const trimmedId = registrationId.trim()
    const isValidFormat = trimmedId.length >= 5

    if (
      isValidFormat &&
      !loading &&
      !successMessage &&
      !error &&
      lastAttemptedId.current !== trimmedId
    ) {
      processValidation(trimmedId)
    }
  }, [registrationId, loading, successMessage, error, processValidation])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lastAttemptedId.current !== registrationId.trim()) {
      processValidation(registrationId)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">

        {/* SESSION SWITCHER TOGGLE */}
        <div className="mb-6 flex rounded-2xl bg-slate-900 p-1.5 border border-slate-800">
          <button
            type="button"
            onClick={() => handleSessionChange(1)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition ${
              activeSession === 1
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sesi 1
          </button>

          <button
            type="button"
            onClick={() => handleSessionChange(2)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition ${
              activeSession === 2
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sesi 2 (Khusus Role 2)
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400/80">
            Validation Station • Mode Sesi {activeSession}
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Scan ID Registrasi
          </h1>

          <p className="mt-2 leading-7 text-slate-400 text-sm">
            {activeSession === 1
              ? 'Scanner 2D aktif untuk semua peserta umum & registrasi awal.'
              : 'Scanner 2D aktif khusus peserta Sesi 2 (Role Permission 2).'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="registration-id"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              ID Registrasi
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                id="registration-id"
                name="registrationId"
                type="text"
                value={registrationId}
                disabled={loading || !!successMessage || !!error}
                onChange={(event) => {
                  setRegistrationId(event.target.value)
                  setError('')
                }}
                placeholder="Scan QR Code Peserta..."
                autoComplete="off"
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-white/50 focus:ring-2 focus:ring-white/10 disabled:opacity-50"
              />

              <span
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              >
                ⌁
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Sistem otomatis memproses registrasi atau log check-in saat scanned.
            </p>

            {/* Banner Sukses Log Check-In (Auto Clear 3 Detik) */}
            {successMessage && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <p className="text-base font-semibold text-emerald-400">
                  {successMessage}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Halaman siap kembali dalam 3 detik...
                </p>
              </div>
            )}

            {/* Banner Error (Auto Clear 3 Detik) */}
            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
                <p className="text-base font-semibold text-rose-400">
                  {error}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Halaman siap kembali dalam 3 detik...
                </p>
              </div>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
