import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCurrentUser } from '../../lib/use-current-user'
import {
  checkoutParticipant,
  findParticipant,
  searchParticipantsByName,
  type Participant,
} from './data'
import axios from 'axios'

const AUTO_SUBMIT_DELAY_MS = 2000

export function CheckoutPage() {
  const [registrationId, setRegistrationId] = useState('')
  const [inputMode, setInputMode] = useState<'id' | 'name'>('id')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [suggestions, setSuggestions] = useState<Participant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Ref untuk mengunci ID yang sedang/sudah dipproses agar tidak re-trigger loop
  const lastAttemptedId = useRef('')

  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus kembali ke input jika sedang tidak loading, sukses, atau error
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

  // Timer 3 detik untuk reset halaman setelah SUKSES
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

  // Timer 3 detik untuk reset halaman setelah ERROR (ID Tidak Terdaftar)
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

  // Handler eksekusi checkout
  const processCheckout = useCallback(async (idToProcess: string, participant?: Participant) => {
    const value = idToProcess.trim()

    if (!value || loading || successMessage || error || lastAttemptedId.current === value) return

    if (!currentUser) {
      navigate({ to: '/login' })
      return
    }

    // Kunci ID ini agar useEffect tidak memprosesnya lagi
    lastAttemptedId.current = value

    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      // Ambil data detail peserta terlebih dahulu untuk ditampilkan di TV
      const peserta = participant ?? await findParticipant(value)
      
      await checkoutParticipant(peserta.id_registrasi, String(currentUser.id))
      setSuccessMessage('Clock out berhasil di simpan')

      // Broadcast ke TV agar langsung ganti ke muka peserta ini
      const channel = new BroadcastChannel('event_checkin_channel')
      channel.postMessage({
        type: 'CHECK_IN_SUCCESS',
        participant: peserta,
      })
      channel.close()
    } catch (err) {
      // Tampilkan notifikasi error persis format request
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
  }, [loading, successMessage, error, currentUser, navigate])

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
      const timer = setTimeout(
        () => processCheckout(trimmedId),
        AUTO_SUBMIT_DELAY_MS,
      )
      return () => clearTimeout(timer)
    }
  }, [registrationId, inputMode, loading, successMessage, error, processCheckout])

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
    void processCheckout(participant.id_registrasi, participant)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inputMode === 'name') {
      if (selectedParticipant) {
        void processCheckout(selectedParticipant.id_registrasi, selectedParticipant)
      } else {
        setError('Silakan pilih nama peserta dari daftar yang muncul.')
      }
    } else if (lastAttemptedId.current !== registrationId.trim()) {
      processCheckout(registrationId)
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
              onClick={() => navigate({ to: '/validation' })}
              className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-amber-800 hover:bg-slate-100 transition"
            >
              Gate Masuk
            </button>
            <button
              type="button"
              className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-800/20"
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
              Validasi Peserta Keluar
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-600">
              Scan ID registrasi atau cari peserta berdasarkan nama untuk mencatat log aktivitas keluar.
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
                htmlFor="checkout-registration-id"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-amber-900"
              >
                {inputMode === 'id' ? 'ID Registrasi' : 'Nama Lengkap'}
              </label>

              <div className="relative">
                <input
                  ref={inputRef}
                  id="checkout-registration-id"
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
                  ? 'Sistem otomatis memproses ID registrasi saat ter-scan.'
                  : 'Pilih nama dari hasil pencarian untuk memproses clock out.'}
              </p>

              {/* Banner Sukses Log Checkout */}
              {successMessage && (
                <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center shadow-md">
                  <p className="text-base font-bold text-emerald-800">
                    {successMessage}
                  </p>
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    Halaman akan siap kembali dalam 3 detik...
                  </p>
                </div>
              )}

              {/* Banner Error / ID Tidak Terdaftar */}
              {error && (
                <div className="mt-5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-center shadow-md">
                  <p className="text-base font-bold text-rose-800">
                    {error}
                  </p>
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    Halaman akan siap kembali dalam 3 detik...
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
