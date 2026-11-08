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

  const showProfileAndReturnToValidation = useCallback((message: string) => {
    setSuccessMessage(message)
    navigate({ to: '/profile' })
    window.setTimeout(() => {
      navigate({ to: '/validation', replace: true })
    }, 5000)
  }, [navigate])

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
          showProfileAndReturnToValidation(`Check-in Sesi 1 Berhasil: ${peserta.name}`)
        } else {
          // Belum pernah validasi -> Langsung check-in tanpa redirect ke /form
          saveRegistrationId(currentUser.id, peserta.id_registrasi)
          const updatedFirst = await checkinParticipant(
            peserta.id_registrasi,
            String(currentUser.id),
            1,
          )
          broadcastToProfile(updatedFirst) // 💡 Broadcast dengan waktu_hadir terisi
          showProfileAndReturnToValidation(`Validasi Berhasil: ${peserta.name}`)
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
    [
      loading,
      successMessage,
      error,
      currentUser,
      navigate,
      inputMode,
      showProfileAndReturnToValidation,
    ],
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
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-cover bg-center bg-no-repeat px-6 py-8 text-slate-900"
      style={{ backgroundImage: "url('/images/bg-book.jpeg')" }}
    >
      <div className="flex w-full max-w-xl flex-col items-center">
        {/* STATION SWITCHER HEADER */}
        <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/90 p-2 border border-amber-900/10 shadow-lg backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-800/20"
            >
              Gate Masuk
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/validation/checkout' })}
              className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-amber-800 hover:bg-slate-100 transition"
            >
              Gate Keluar
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/validation/souvenir' })}
              className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-amber-800 hover:bg-slate-100 transition"
            >
              Meja Souvenir
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' })}
            className="rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 transition hidden!"
          >
            Dashboard
          </button>
        </div>

        {/* MAIN VALIDATION CARD */}
        <section className="w-full rounded-3xl border border-amber-900/15 bg-white/95 p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Validasi Peserta
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-600">
              Scan ID registrasi atau cari peserta berdasarkan nama lengkap.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              {/* TAB SWITCHER */}
              <div className="mb-5 flex rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-inner">
                <button
                  type="button"
                  disabled={loading || !!successMessage || !!error}
                  onClick={() => handleInputModeChange('id')}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-extrabold transition-all ${
                    inputMode === 'id'
                      ? 'bg-amber-700 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ID Registrasi
                </button>
                <button
                  type="button"
                  disabled={loading || !!successMessage || !!error}
                  onClick={() => handleInputModeChange('name')}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-extrabold transition-all ${
                    inputMode === 'name'
                      ? 'bg-amber-700 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nama Lengkap
                </button>
              </div>

              <label
                htmlFor="participant-input"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-amber-900"
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
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-4 pr-12 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-700/10 disabled:opacity-50 shadow-sm"
                />

                {inputMode === 'id' ? (
                  <span
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl font-black text-amber-800"
                    aria-hidden="true"
                  >
                    ⌁
                  </span>
                ) : (
                  <>
                    {isSearching && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-800">
                        Mencari...
                      </span>
                    )}
                    {suggestions.length > 0 && (
                      <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl">
                        {suggestions.map((participant) => (
                          <button
                            key={participant.id}
                            type="button"
                            onClick={() => handleSelectParticipant(participant)}
                            className="block w-full rounded-lg px-4 py-3 text-left transition hover:bg-amber-50"
                          >
                            <span className="block font-bold text-slate-900">{participant.name}</span>
                            <span className="mt-0.5 block text-xs font-medium text-amber-800">
                              {participant.pekerjaan || 'Tamu Undangan'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <p className="mt-2.5 text-xs font-medium text-slate-600">
                {inputMode === 'id'
                  ? 'Sistem otomatis memproses ID setelah pemindaian selesai.'
                  : 'Pilih nama dari hasil pencarian untuk memproses check-in.'}
              </p>

              {/* Banner Sukses Log Check-In */}
              {successMessage && (
                <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center shadow-md">
                  <p className="text-base font-bold text-emerald-800">
                    {successMessage}
                  </p>
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    Halaman siap kembali dalam 3 detik...
                  </p>
                </div>
              )}

              {/* Banner Error */}
              {error && (
                <div className="mt-5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-center shadow-md">
                  <p className="text-base font-bold text-rose-800">
                    {error}
                  </p>
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    Halaman siap kembali dalam 3 detik...
                  </p>
                </div>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
