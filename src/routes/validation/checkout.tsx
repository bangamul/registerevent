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

export function CheckoutPage() {
  const [registrationId, setRegistrationId] = useState('')
  const [inputMode, setInputMode] = useState<'id' | 'name'>('id')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [suggestions, setSuggestions] = useState<Participant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Ref untuk mengunci ID yang sedang/sudah diproses agar tidak re-trigger loop
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

  // AUTO-SUBMIT READINESS CHECK
  useEffect(() => {
    const trimmedId = registrationId.trim()
    const isValidFormat = trimmedId.length >= 5 

    // Jalankan HANYA jika ID belum pernah di-submit sebelumnya
    if (
      inputMode === 'id' &&
      isValidFormat && 
      !loading && 
      !successMessage && 
      !error && 
      lastAttemptedId.current !== trimmedId
    ) {
      processCheckout(trimmedId)
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-8 text-white">
      {/* STATION SWITCHER HEADER */}
      <div className="mb-6 flex w-full max-w-xl flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => navigate({ to: '/validation' })}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            🚪 Gate Masuk
          </button>
          <button
            type="button"
            className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md"
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
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">
            Checkout Station
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Validasi Peserta Keluar
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            Scan ID registrasi atau cari peserta berdasarkan nama untuk mencatat log aktivitas keluar.
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
              htmlFor="checkout-registration-id"
              className="mb-2 block text-sm font-medium text-slate-200"
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
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 disabled:opacity-50"
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
                ? 'Sistem otomatis memproses ID registrasi saat ter-scan.'
                : 'Pilih nama dari hasil pencarian untuk memproses clock out.'}
            </p>

            {/* Banner Sukses (Auto Clear 3 Detik) */}
            {successMessage && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <p className="text-base font-semibold text-emerald-400">
                  {successMessage}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Halaman akan siap kembali dalam 3 detik...
                </p>
              </div>
            )}

            {/* Banner Error / ID Tidak Terdaftar (Auto Clear 3 Detik) */}
            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
                <p className="text-base font-semibold text-rose-400">
                  {error}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Halaman akan siap kembali dalam 3 detik...
                </p>
              </div>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
