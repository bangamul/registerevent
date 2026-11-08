import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { saveRegistrationId } from '../../lib/registration-session'
import { useCurrentUser } from '../../lib/use-current-user'
import {
  findParticipant,
  searchParticipantsByName,
  checkinParticipant,
  type Participant,
} from './data'
import axios from 'axios'

const AUTO_SUBMIT_DELAY_MS = 2000

export function ValidationPage() {
  const [registrationId, setRegistrationId] = useState('')
  const [inputMode, setInputMode] = useState<'id' | 'name'>('id')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [suggestions, setSuggestions] = useState<Participant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

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

  useEffect(() => {
    if (inputMode !== 'name' || !registrationId.trim() || selectedParticipant) {
      return
    }

    let active = true
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchParticipantsByName(registrationId.trim())
        if (active) setSuggestions(results)
      } finally {
        if (active) setIsSearching(false)
      }
    }, 150)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [inputMode, registrationId, selectedParticipant])

  // Timer reset 3 detik kalau Check-in Ulang Sukses
  useEffect(() => {
    if (!successMessage) return

    const timer = setTimeout(() => {
      setSuccessMessage('')
      setRegistrationId('')
      setSelectedParticipant(null)
      setSuggestions([])
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
      setSelectedParticipant(null)
      setSuggestions([])
      lastAttemptedId.current = ''
      inputRef.current?.focus()
    }, 3000)

    return () => clearTimeout(timer)
  }, [error])

  // Core Processing Function
  const processValidation = useCallback(
    async (idToProcess: string, participant?: Participant) => {
      const value = idToProcess.trim()

      if (
        !value ||
        loading ||
        successMessage ||
        error ||
        lastAttemptedId.current === value
      ) return

      if (!currentUser) {
        navigate({ to: '/login' })
        return
      }

      // Lock ID agar tidak diproses berulang
      lastAttemptedId.current = value

      setError('')
      setSuccessMessage('')
      setLoading(true)

      try {
        const peserta = participant ?? await findParticipant(value)

        if (!peserta) {
          setError(inputMode === 'name' ? 'Peserta tidak ditemukan' : 'ID anda tidak terdaftar')
          return
        }

        // 💡 Broadcast awal ke TV Profile: tampilkan profil peserta segera
        const broadcastToProfile = (data: typeof peserta) => {
          const channel = new BroadcastChannel('event_checkin_channel')
          channel.postMessage({ type: 'CHECK_IN_SUCCESS', participant: data })
          channel.close()
        }

        // Tampilkan profil dulu (data belum update)
        broadcastToProfile(peserta)

        if (peserta.waktu_hadir) {
          // Sudah pernah validasi -> Catat Log Check-in
          saveRegistrationId(currentUser.id, peserta.id_registrasi)
          const updatedSesi1 = await checkinParticipant(
            peserta.id_registrasi,
            String(currentUser.id),
            1,
          )
          broadcastToProfile(updatedSesi1) // 💡 Broadcast ulang dengan data terbaru
          setSuccessMessage(`Check-in Sesi 1 Berhasil: ${peserta.name}`)
        } else {
          // Belum pernah validasi -> Langsung check-in tanpa redirect ke /form
          saveRegistrationId(currentUser.id, peserta.id_registrasi)
          const updatedFirst = await checkinParticipant(
            peserta.id_registrasi,
            String(currentUser.id),
            1,
          )
          broadcastToProfile(updatedFirst) // 💡 Broadcast dengan waktu_hadir terisi
          setSuccessMessage(`Validasi Berhasil: ${peserta.name}`)
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError(inputMode === 'name' ? 'Peserta tidak ditemukan' : 'ID anda tidak terdaftar')
        } else if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message ?? 'Gagal memvalidasi peserta')
        } else {
          setError(err instanceof Error ? err.message : 'Gagal memvalidasi peserta')
        }
      } finally {
        setLoading(false)
      }
    },
    [loading, successMessage, error, currentUser, navigate, inputMode],
  )

  // Wait for scanner keystrokes to stop before looking up the scanned ID.
  useEffect(() => {
    const trimmedId = registrationId.trim()
    const isValidFormat = trimmedId.length >= 5

    if (
      inputMode === 'id' &&
      isValidFormat &&
      !loading &&
      !successMessage &&
      !error &&
      lastAttemptedId.current !== trimmedId
    ) {
      const timer = setTimeout(() => processValidation(trimmedId), AUTO_SUBMIT_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [registrationId, inputMode, loading, successMessage, error, processValidation])

  function handleInputModeChange(mode: 'id' | 'name') {
    setInputMode(mode)
    setRegistrationId('')
    setSelectedParticipant(null)
    setSuggestions([])
    setIsSearching(false)
    setError('')
    setSuccessMessage('')
    lastAttemptedId.current = ''
    inputRef.current?.focus()
  }

  function handleSelectParticipant(participant: Participant) {
    setRegistrationId(participant.name)
    setSelectedParticipant(participant)
    setSuggestions([])
    void processValidation(participant.id_registrasi, participant)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inputMode === 'name') {
      if (selectedParticipant) {
        void processValidation(selectedParticipant.id_registrasi, selectedParticipant)
      } else {
        setError('Silakan pilih nama peserta dari daftar yang muncul.')
      }
    } else if (lastAttemptedId.current !== registrationId.trim()) {
      processValidation(registrationId)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-8 text-white">
      {/* STATION SWITCHER HEADER */}
      <div className="mb-6 flex w-full max-w-xl flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md"
          >
            🚪 Gate Masuk
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/validation/checkout' })}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            🏃 Gate Keluar
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/validation/souvenir' })}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 hover:text-white hover:bg-amber-500/20 transition"
          >
            🎁 Meja Souvenir
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: '/dashboard' })}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
        >
          📊 Dashboard
        </button>
      </div>

      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-1.5 text-center text-xs font-semibold text-slate-950 hidden">
          <span className="inline-block rounded-xl bg-amber-500 px-4 py-2.5 shadow-md">
            Sesi 1
          </span>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400/80 hidden">
            Validation Station • Mode Sesi 1
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Validasi Peserta
          </h1>

          <p className="mt-2 leading-7 text-slate-400 text-sm">
            Scan ID registrasi atau cari peserta berdasarkan nama lengkap.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <div className="mb-4 flex rounded-xl border border-slate-800 bg-slate-900 p-1">
              <button
                type="button"
                disabled={loading || !!successMessage || !!error}
                onClick={() => handleInputModeChange('id')}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  inputMode === 'id'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ID Registrasi
              </button>
              <button
                type="button"
                disabled={loading || !!successMessage || !!error}
                onClick={() => handleInputModeChange('name')}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  inputMode === 'name'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Nama Lengkap
              </button>
            </div>
            <label
              htmlFor="participant-input"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              {inputMode === 'id' ? 'ID Registrasi' : 'Nama Lengkap'}
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                id="participant-input"
                name={inputMode === 'id' ? 'registrationId' : 'participantName'}
                type="text"
                inputMode={inputMode === 'id' ? 'none' : 'text'}
                value={registrationId}
                disabled={loading || !!successMessage || !!error}
                onChange={(event) => {
                  setRegistrationId(event.target.value)
                  setSelectedParticipant(null)
                  setSuggestions([])
                  setIsSearching(false)
                  setError('')
                }}
                placeholder={inputMode === 'id' ? 'Scan QR Code Peserta...' : 'Ketik nama peserta...'}
                autoComplete="off"
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-white/50 focus:ring-2 focus:ring-white/10 disabled:opacity-50"
              />

              {inputMode === 'id' ? (
                <span
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                >
                  ⌁
                </span>
              ) : (
                <>
                  {isSearching && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                      Mencari...
                    </span>
                  )}
                  {suggestions.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
                      {suggestions.map((participant) => (
                        <button
                          key={participant.id}
                          type="button"
                          onClick={() => handleSelectParticipant(participant)}
                          className="block w-full rounded-lg px-3 py-3 text-left hover:bg-slate-800"
                        >
                          <span className="block font-semibold text-white">{participant.name}</span>
                          <span className="mt-1 block text-xs text-slate-400">
                            {participant.pekerjaan || 'Tamu Undangan'}
                            {participant.seating_arrangement && (
                              <span className="ml-2 font-semibold text-amber-300">
                                • 🪑 {participant.seating_arrangement}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {inputMode === 'id'
                ? 'Sistem otomatis memproses ID setelah pemindaian selesai.'
                : 'Pilih nama dari hasil pencarian untuk memproses check-in.'}
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
