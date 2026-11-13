import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCurrentUser } from '../../lib/use-current-user'
import {
  claimSouvenir,
  fetchSouvenirSettings,
  updateSouvenirSettings,
  resetSouvenirClaim,
  searchParticipantsByName,
  type SouvenirSettings,
  type SouvenirClaimResult,
  type Participant,
} from './data'

const AUTO_SUBMIT_DELAY_MS = 2000

export function SouvenirPage() {
  const [registrationId, setRegistrationId] = useState('')
  const [inputMode, setInputMode] = useState<'id' | 'name'>('id')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [suggestions, setSuggestions] = useState<Participant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SouvenirClaimResult | null>(null)
  const [settings, setSettings] = useState<SouvenirSettings | null>(null)
  const [recentClaims, setRecentClaims] = useState<Array<{
    id_registrasi: string
    name: string
    waktu: string
  }>>([])

  // Modal Setting Booth
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [tempMode, setTempMode] = useState<'auto' | 'open' | 'closed'>('auto')
  const [tempStartTime, setTempStartTime] = useState('17:00')
  const [savingSettings, setSavingSettings] = useState(false)

  // Audio effects synthesizer
  const playSound = useCallback((type: 'success' | 'warning' | 'error') => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()

      if (type === 'success') {
        const notes = [523.25, 659.25, 783.99] // C5, E5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1)
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(ctx.currentTime + idx * 0.1)
          osc.stop(ctx.currentTime + idx * 0.1 + 0.3)
        })
      } else {
        // Warning / Error Buzzer
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(220, ctx.currentTime)
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      }
    } catch {
      // AudioContext might be blocked until user interaction, ignore safely
    }
  }, [])

  const lastAttemptedId = useRef('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const currentUser = useCurrentUser()

  // Load Settings & Stats
  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchSouvenirSettings()
      setSettings(data)
      setTempMode(data.mode)
      setTempStartTime(data.start_time)
    } catch (err) {
      console.error('Gagal memuat pengaturan souvenir:', err)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings()
    const interval = setInterval(loadSettings, 10000)
    return () => clearInterval(interval)
  }, [loadSettings])

  // Auto focus input
  useEffect(() => {
    if (!loading && !result && !showSettingsModal) {
      inputRef.current?.focus()
    }
  }, [loading, result, showSettingsModal])

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

  // Timer auto dismiss result card
  useEffect(() => {
    if (!result) return

    const duration = result.code === 'ALREADY_CLAIMED' ? 5000 : 3500
    const timer = setTimeout(() => {
      setResult(null)
      setRegistrationId('')
      setSelectedParticipant(null)
      setSuggestions([])
      lastAttemptedId.current = ''
      inputRef.current?.focus()
    }, duration)

    return () => clearTimeout(timer)
  }, [result])

  // Eksekusi Scan Souvenir
  const processSouvenirScan = useCallback(
    async (idToProcess: string, forceOverride: boolean = false) => {
      const value = idToProcess.trim()
      if (!value || loading || result) return

      lastAttemptedId.current = value
      setLoading(true)

      try {
        const petugasName = currentUser?.id ? `Admin #${currentUser.id}` : 'Meja Souvenir'
        const res = await claimSouvenir(value, String(currentUser?.id ?? '1'), petugasName, forceOverride)

        setResult(res)

        if (res.success) {
          playSound('success')
          if (res.data) {
            setRecentClaims((prev) => [
              {
                id_registrasi: res.data!.id_registrasi,
                name: res.data!.name,
                waktu: new Date().toLocaleTimeString('id-ID'),
              },
              ...prev.slice(0, 9),
            ])
          }
          // Refresh counter
          loadSettings()
        } else if (res.code === 'ALREADY_CLAIMED') {
          playSound('warning')
        } else {
          playSound('error')
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        playSound('error')
        setResult({
          success: false,
          code: 'SERVER_ERROR',
          message: 'Terjadi kesalahan sistem saat memproses scan.',
        })
      } finally {
        setLoading(false)
      }
    },
    [loading, result, currentUser, playSound, loadSettings],
  )

  // Auto-submit saat QR code di-scan (panjang minimal 5 karakter)
  useEffect(() => {
    const trimmed = registrationId.trim()
    if (
      inputMode === 'id' &&
      trimmed.length >= 5 &&
      !loading &&
      !result &&
      lastAttemptedId.current !== trimmed
    ) {
      const timer = setTimeout(
        () => processSouvenirScan(trimmed),
        AUTO_SUBMIT_DELAY_MS,
      )
      return () => clearTimeout(timer)
    }
  }, [registrationId, inputMode, loading, result, processSouvenirScan])

  function handleInputModeChange(mode: 'id' | 'name') {
    setInputMode(mode)
    setRegistrationId('')
    setSelectedParticipant(null)
    setSuggestions([])
    setIsSearching(false)
    setResult(null)
    lastAttemptedId.current = ''
    inputRef.current?.focus()
  }

  function handleSelectParticipant(participant: Participant) {
    setRegistrationId(participant.name)
    setSelectedParticipant(participant)
    setSuggestions([])
    void processSouvenirScan(participant.id_registrasi)
  }

  // Submit manual lewat Enter
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (inputMode === 'name') {
      if (selectedParticipant) {
        processSouvenirScan(selectedParticipant.id_registrasi)
      } else {
        setResult({
          success: false,
          code: 'NOT_FOUND',
          message: 'Silakan pilih nama peserta dari daftar yang muncul.',
        })
      }
    } else if (registrationId.trim() && lastAttemptedId.current !== registrationId.trim()) {
      processSouvenirScan(registrationId.trim())
    }
  }

  // Simpan Pengaturan Booth
  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      const updated = await updateSouvenirSettings({
        souvenir_mode: tempMode,
        souvenir_start_time: tempStartTime,
      })
      setSettings(updated)
      setShowSettingsModal(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      alert('Gagal menyimpan pengaturan booth souvenir')
    } finally {
      setSavingSettings(false)
    }
  }

  // Quick Toggle Mode (Buka Sekarang / Auto)
  async function handleQuickMode(newMode: 'auto' | 'open' | 'closed') {
    try {
      const updated = await updateSouvenirSettings({ souvenir_mode: newMode })
      setSettings(updated)
      setTempMode(newMode)
    } catch {
      alert('Gagal mengubah mode booth')
    }
  }

  // Reset klaim untuk testing/koreksi
  async function handleReset(idReg: string) {
    if (!confirm(`Reset status souvenir untuk ID ${idReg} agar bisa diambil ulang?`)) return
    try {
      await resetSouvenirClaim(idReg, String(currentUser?.id ?? '1'))
      alert(`Berhasil reset souvenir ${idReg}`)
      setResult(null)
      loadSettings()
    } catch {
      alert('Gagal mereset souvenir')
    }
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-cover bg-center bg-no-repeat px-6 py-8 text-slate-900 relative"
      style={{ backgroundImage: "url('/images/bg-book.jpeg')" }}
    >
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        {/* NAVIGATION STATION SWITCHER */}
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
              onClick={() => navigate({ to: '/validation/checkout' })}
              className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-amber-800 hover:bg-slate-100 transition"
            >
              Gate Keluar
            </button>
            <button
              type="button"
              className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-800/20"
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

        {/* STATUS BOOTH & TIME SCHEDULE BANNER */}
        <div className="mb-6 w-full rounded-2xl border border-amber-900/15 bg-white/90 p-4 shadow-md backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-4 w-4 rounded-full ${
                  settings?.is_open
                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse'
                    : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Status Booth Souvenir:
                  </span>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                      settings?.is_open
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {settings?.is_open ? 'AKTIF / DIBUKA' : 'TERKUNCI / BELUM BUKA'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  {settings?.status_text ?? 'Memuat jadwal...'}
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS FOR OPERATOR */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              {settings?.mode === 'open' ? (
                <button
                  type="button"
                  onClick={() => handleQuickMode('auto')}
                  title="Kembalikan ke jadwal otomatis jam"
                  className="rounded-xl bg-slate-100 border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  ⏱️ Pasang Auto
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleQuickMode('open')}
                  title="Paksa buka booth souvenir sekarang untuk testing / tamu"
                  className="rounded-xl bg-emerald-700 text-white border border-emerald-800 px-3 py-1.5 text-[11px] font-bold hover:bg-emerald-800 transition active:scale-95 shadow-sm"
                >
                  🔓 Buka Sekarang
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                title="Atur jam buka dan mode booth souvenir"
                className="rounded-xl bg-slate-100 border border-slate-300 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                ⚙️ Atur Jam
              </button>
            </div>
          </div>
        </div>

        {/* MAIN SCAN CARD */}
        <section className="relative w-full overflow-hidden rounded-3xl border border-amber-900/15 bg-white/95 p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-4 py-1 text-xs font-extrabold text-amber-900">
              🎁 Meja Pengambilan Souvenir
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Scan QR Code Souvenir
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-slate-600">
              Arahkan scanner pada QR Code E-Ticket tamu undangan (1x penukaran).
            </p>
          </div>

          {/* DYNAMIC RESULT DISPLAY (SUKSES / ALREADY CLAIMED / BELUM BUKA) */}
          {result && (
            <div className="mt-6 animate-in fade-in zoom-in-95 duration-200">
              {/* 1. SUKSES KLAIM */}
              {result.code === 'SUCCESS' && (
                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center shadow-lg">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl border border-emerald-300">
                    ✅
                  </div>
                  <span className="mt-3 inline-block rounded-full bg-emerald-200 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-900 border border-emerald-400">
                    SOUVENIR BERHASIL DIAMBIL
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    {result.data?.name}
                  </h2>
                  <p className="text-sm font-mono font-bold text-emerald-800">
                    ID: {result.data?.id_registrasi} • {result.data?.pekerjaan || 'Tamu Undangan'}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-100/80 border border-emerald-300 px-4 py-2 text-xs font-bold text-emerald-900">
                    <span>🕒 Waktu: <b>{new Date().toLocaleTimeString('id-ID')} WIB</b></span>
                    <span>•</span>
                    <span>📦 1 Paket Souvenir Diberikan</span>
                  </div>
                </div>
              )}

              {/* 2. SOUVENIR SUDAH PERNAH DIAMBIL (ALREADY CLAIMED) */}
              {result.code === 'ALREADY_CLAIMED' && (
                <div className="rounded-2xl border-2 border-rose-500 bg-rose-50 p-6 text-center shadow-lg">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl animate-bounce border border-rose-300">
                    ⚠️
                  </div>
                  <span className="mt-3 inline-block rounded-full bg-rose-200 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-rose-900 border border-rose-400">
                    SOUVENIR SUDAH PERNAH DIAMBIL!
                  </span>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    {result.data?.name || 'Tamu Undangan'}
                  </h2>
                  <p className="text-sm font-mono font-bold text-rose-800">
                    ID: {result.data?.id_registrasi}
                  </p>

                  <div className="mt-4 rounded-xl border border-rose-200 bg-white p-3.5 text-xs text-slate-700 text-left shadow-sm">
                    <p className="font-extrabold text-rose-800">Catatan Verifikasi:</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      • QR Code ini <b>sudah pernah ditukarkan</b> untuk souvenir.
                    </p>
                    <p className="font-semibold text-slate-800">
                      • Waktu Pengambilan: <b>{result.data?.waktu_souvenir ?? '-'}</b>
                    </p>
                    {result.data?.souvenir_petugas && (
                      <p className="font-semibold text-slate-800">
                        • Dicatat Oleh: <b>{result.data.souvenir_petugas}</b>
                      </p>
                    )}
                    <p className="text-rose-700 font-extrabold mt-1.5">
                      ⛔ Mohon maaf, 1 QR Code hanya berlaku untuk 1 paket souvenir.
                    </p>
                  </div>

                  {/* Reset Button (Opsional untuk Panitia) */}
                  <div className="mt-4 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReset(result.data!.id_registrasi)}
                      className="rounded-xl border border-rose-300 bg-rose-100 px-3.5 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-200 transition"
                    >
                      🔄 Reset Status (Testing / Override)
                    </button>
                  </div>
                </div>
              )}

              {/* 3. WAKTU BELUM TIBA / BOOTH TUTUP */}
              {(result.code === 'NOT_STARTED_YET' || result.code === 'BOOTH_CLOSED') && (
                <div className="rounded-2xl border-2 border-amber-600 bg-amber-50 p-6 text-center shadow-lg">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl border border-amber-300">
                    ⛔
                  </div>
                  <span className="mt-3 inline-block rounded-full bg-amber-200 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-950 border border-amber-400">
                    PENGAMBILAN SOUVENIR BELUM DIBUKA
                  </span>
                  <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                    {result.message}
                  </h2>
                  <p className="mt-2 text-xs font-semibold text-slate-700 max-w-md mx-auto">
                    QR Code scan tidak dapat diproses karena waktu pengambilan belum tiba atau booth masih dalam status terkunci.
                  </p>

                  <div className="mt-5 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => processSouvenirScan(lastAttemptedId.current, true)}
                      className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 transition shadow-md"
                    >
                      ⚡ Buka Khusus (Force Override)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickMode('open')}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition shadow-sm"
                    >
                      🔓 Buka Booth Untuk Semua
                    </button>
                  </div>
                </div>
              )}

              {/* 4. ID NOT FOUND / ERROR LAIN */}
              {result.code === 'NOT_FOUND' && (
                <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 p-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl border border-rose-300">
                    ❌
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-rose-900">{result.message}</h3>
                  <p className="text-xs font-medium text-slate-600 mt-1">
                    Pastikan QR Code berasal dari E-Ticket resmi acara ini.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* INPUT FORM SCANNER OR NAME SEARCH */}
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="mb-5 flex rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-inner">
              <button
                type="button"
                disabled={loading || Boolean(result)}
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
                disabled={loading || Boolean(result)}
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
            <div className="relative">
              <input
                ref={inputRef}
                id="souvenir-participant-input"
                name={inputMode === 'id' ? 'registrationId' : 'participantName'}
                type="text"
                inputMode={inputMode === 'id' ? 'none' : 'text'}
                value={registrationId}
                onChange={(e) => {
                  setRegistrationId(e.target.value)
                  setSelectedParticipant(null)
                  setSuggestions([])
                  setIsSearching(false)
                }}
                disabled={loading || Boolean(result)}
                placeholder={inputMode === 'id' ? 'Scan QR Code E-Ticket Peserta...' : 'Ketik nama peserta...'}
                className="w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 pl-12 text-base font-bold text-slate-950 placeholder-slate-400 shadow-sm outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-700/10 disabled:opacity-50"
              />
              {inputMode === 'id' ? (
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-amber-800">
                  🔍
                </div>
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
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <span className="flex h-5 w-5 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                </div>
              )}
            </div>

            <p className="mt-2.5 text-center text-xs font-semibold text-slate-600">
              {inputMode === 'id'
                ? '💡 Arahkan scanner barcode / QR ke tiket tamu. ID akan dipproses otomatis.'
                : 'Pilih nama dari hasil pencarian untuk memproses pengambilan souvenir.'}
            </p>
          </form>

          {/* REAL-TIME STATS COUNTERS */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center shadow-sm">
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                Total Tamu
              </span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {settings?.stats.total_peserta ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-center shadow-sm">
              <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                Terdistribusi
              </span>
              <p className="text-2xl font-black text-emerald-900 mt-0.5">
                {settings?.stats.claimed_count ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center shadow-sm">
              <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider">
                Sisa Souvenir
              </span>
              <p className="text-2xl font-black text-amber-900 mt-0.5">
                {settings?.stats.unclaimed_count ?? 0}
              </p>
            </div>
          </div>

          {/* RECENT CLAIMS LIST */}
          {recentClaims.length > 0 && (
            <div className="mt-8 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Riwayat Scan Terakhir (Sesi Ini):
                </span>
                <span className="text-xs font-semibold text-slate-500">{recentClaims.length} penukaran</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {recentClaims.map((item, idx) => (
                  <div
                    key={`${item.id_registrasi}-${idx}`}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2 text-xs border border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="font-mono text-slate-500 text-[11px]">({item.id_registrasi})</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-600">{item.waktu} WIB</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* FOOTER */}
      <footer className="relative z-10 mt-8 text-center text-xs font-semibold text-slate-700">
        Peluncuran Buku: Timah, Manusia, dan Masa Depan • Souvenir Redemption Module
      </footer>

      {/* MODAL SETTING JAM & STATUS BOOTH */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900">⚙️ Pengaturan Waktu & Status Booth</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mode Operasional Booth
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempMode('auto')}
                    className={`rounded-xl py-2.5 text-xs font-bold transition border ${
                      tempMode === 'auto'
                        ? 'bg-amber-700 text-white border-amber-800 shadow-md'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    ⏱️ Auto (Sesuai Jam)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempMode('open')}
                    className={`rounded-xl py-2.5 text-xs font-bold transition border ${
                      tempMode === 'open'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-md'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    🟢 Buka Sekarang
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempMode('closed')}
                    className={`rounded-xl py-2.5 text-xs font-bold transition border ${
                      tempMode === 'closed'
                        ? 'bg-rose-700 text-white border-rose-800 shadow-md'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    🔴 Tutup Booth
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                  {tempMode === 'auto' && '• Booth otomatis terbuka saat jam mencapai batas waktu yang ditentukan.'}
                  {tempMode === 'open' && '• Booth dipaksa buka sekarang, tamu bebas scan souvenir.'}
                  {tempMode === 'closed' && '• Booth ditutup penuh, seluruh scan akan ditolak.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Jadwal Jam Buka Pengambilan (WIB)
                </label>
                <input
                  type="time"
                  value={tempStartTime}
                  onChange={(e) => setTempStartTime(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-700 focus:outline-none"
                />
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  Default: 17:00 WIB (sesuai rundown penutupan acara).
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="rounded-xl bg-amber-700 px-5 py-2 text-xs font-bold text-white hover:bg-amber-800 transition shadow-md"
              >
                {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
