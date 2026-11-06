import { useState, useEffect, useRef } from 'react'
import {
  confirmAttendance,
  checkExistingParticipant,
  searchParticipantsByName,
  fetchRsvpSettings,
  type RsvpSettings,
  type Participant,
} from './data'

export function LandingPage() {
  // View states: 'loading' | 'form' | 'ticket' | 'declined'
  const [view, setView] = useState<'loading' | 'form' | 'ticket' | 'declined'>('loading')
  const [existingParticipant, setExistingParticipant] = useState<Participant | null>(null)

  // 2 Form Fields (Nama & WhatsApp)
  const [inputName, setInputName] = useState('')
  const [inputPhone, setInputPhone] = useState('')

  // Autocomplete / Autoreading state
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [suggestions, setSuggestions] = useState<Participant[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Loading & error state
  const [loading, setLoading] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Status penutupan RSVP & Pencarian E-Ticket
  const [rsvpSettings, setRsvpSettings] = useState<RsvpSettings | null>(null)
  const [checkQuery, setCheckQuery] = useState('')
  const [checkLoading, setCheckLoading] = useState(false)
  const [checkMsg, setCheckMsg] = useState('')

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Klik di luar dropdown untuk menutup saran
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Parsing URL Parameter (Opsional / Fleksibel untuk Backward-Compatibility)
  useEffect(() => {
    async function initFromUrl() {
      if (typeof window === 'undefined') return

      try {
        // Ambil status buka/tutup konfirmasi online
        const settings = await fetchRsvpSettings().catch(() => null)
        if (settings) {
          setRsvpSettings(settings)
        }

        const searchParams = new URLSearchParams(window.location.search)
        const token = searchParams.get('token')
        const idReg = searchParams.get('idRegistrasi') || searchParams.get('id')

        // Jika ada idRegistrasi langsung di query string
        if (idReg) {
          const found = await checkExistingParticipant(idReg)
          if (found) {
            setExistingParticipant(found)
            setSelectedParticipant(found)
            setInputName(found.name)
            setInputPhone(found.notelp || '')

            if (found.rsvp_status === 'confirmed') {
              setView('ticket')
              return
            } else if (found.rsvp_status === 'declined') {
              setView('declined')
              return
            }
          }
        }

        // Jika ada token Base64
        if (token) {
          try {
            const jsonStr = decodeURIComponent(escape(atob(token.replace(/-/g, '+').replace(/_/g, '/'))))
            const payload = JSON.parse(jsonStr)

            const phone = payload?.phone || payload?.p || ''
            const name = payload?.name || payload?.n || ''
            const idRegistrasi = payload?.id || payload?.id_registrasi || ''

            if (phone || idRegistrasi) {
              const found = await checkExistingParticipant(idRegistrasi || phone)
              if (found) {
                setExistingParticipant(found)
                setSelectedParticipant(found)
                setInputName(found.name)
                setInputPhone(found.notelp || phone)

                if (found.rsvp_status === 'confirmed') {
                  setView('ticket')
                  return
                } else if (found.rsvp_status === 'declined') {
                  setView('declined')
                  return
                }
              } else {
                setInputName(name)
                setInputPhone(phone)
              }
            }
          } catch (err) {
            console.error('Gagal memproses token undangan:', err)
          }
        }
      } catch (err) {
        console.error('Inisialisasi landing page gagal:', err)
      } finally {
        setView((prev) => (prev === 'loading' ? 'form' : prev))
      }
    }

    void initFromUrl()
  }, [])

  // Autoreading saat mengetik nama (bahkan 1 kata / beberapa huruf)
  function handleNameChange(val: string) {
    setInputName(val)
    setError('')

    // Reset pilihan jika input diubah dari nama terpilih sebelumnya
    if (selectedParticipant && selectedParticipant.name.toLowerCase() !== val.toLowerCase()) {
      setSelectedParticipant(null)
    }

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    const trimmed = val.trim()
    if (trimmed.length === 0) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce pencarian
    searchTimerRef.current = setTimeout(async () => {
      try {
        setIsSearching(true)
        const results = await searchParticipantsByName(trimmed)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
      } catch (err) {
        console.error('Gagal autoread peserta:', err)
      } finally {
        setIsSearching(false)
      }
    }, 150)
  }

  // Saat nama dipilih dari dropdown autoreading
  function handleSelectParticipant(p: Participant) {
    setInputName(p.name)
    setInputPhone(p.notelp || '')
    setSelectedParticipant(p)
    setExistingParticipant(p)
    setShowSuggestions(false)
    setError('')
  }

  // Reset pilihan untuk ganti nama
  function handleResetSelection() {
    setInputName('')
    setInputPhone('')
    setSelectedParticipant(null)
    setExistingParticipant(null)
    setError('')
  }

  // Aksi Konfirmasi Hadir
  const handleConfirmPresence = async () => {
    if (!inputName.trim()) {
      setError('Silakan ketik dan pilih Nama Anda dari daftar undangan resmi.')
      return
    }

    // Pengamanan: Pastikan peserta memilih dari database atau nama terdaftar
    if (!selectedParticipant) {
      setError('Nama Anda belum terverifikasi di daftar undangan. Silakan pilih nama Anda dari saran yang muncul saat mengetik.')
      return
    }

    // Pengamanan Double Reservasi / Konfirmasi di Frontend
    const rsvpCurrent = (selectedParticipant.rsvp_status || '').trim().toLowerCase()
    if (rsvpCurrent === 'confirmed') {
      setView('ticket')
      return
    }

    if (!inputPhone.trim() || inputPhone.trim().replace(/\D/g, '').length < 8) {
      setError('Silakan isi Nomor WhatsApp yang aktif untuk pengiriman QR E-Ticket.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const res = await confirmAttendance({
        notelp: inputPhone.trim(),
        id_registrasi: selectedParticipant.id_registrasi,
        name: selectedParticipant.name,
        pekerjaan: selectedParticipant.pekerjaan || '',
        email: selectedParticipant.email || '',
        gate: String(selectedParticipant.gate || '1'),
        role_permission: String(selectedParticipant.role_permission || '1'),
        action: 'confirm',
      })

      if (res.data) {
        setExistingParticipant(res.data)
        setView('ticket')
      } else {
        setError('Gagal memproses konfirmasi. Silakan coba kembali atau hubungi panitia.')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kendala saat melakukan konfirmasi kehadiran',
      )
    } finally {
      setLoading(false)
    }
  }

  // Aksi Berhalangan Hadir
  const handleDeclinePresence = async () => {
    if (!inputName.trim()) {
      setError('Silakan pilih Nama Anda terlebih dahulu.')
      return
    }

    try {
      setDeclining(true)
      setError('')

      const res = await confirmAttendance({
        notelp: inputPhone.trim() || selectedParticipant?.notelp || '0800000000',
        id_registrasi: selectedParticipant?.id_registrasi,
        name: selectedParticipant?.name || inputName.trim(),
        action: 'decline',
      })

      if (res.data) {
        setExistingParticipant(res.data)
      }
      setView('declined')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memproses pilihan berhalangan hadir',
      )
    } finally {
      setDeclining(false)
    }
  }

  // Handler Pencarian E-Ticket saat link RSVP ditutup
  async function handleCheckTicket(e: React.FormEvent) {
    e.preventDefault()
    const q = checkQuery.trim()
    if (!q) return
    try {
      setCheckLoading(true)
      setCheckMsg('')
      const found = await checkExistingParticipant(q)
      if (found) {
        if (found.rsvp_status === 'confirmed') {
          setExistingParticipant(found)
          setSelectedParticipant(found)
          setView('ticket')
        } else {
          setCheckMsg(
            `Bapak/Ibu ${found.name}, data Anda ditemukan dengan status ${
              found.rsvp_status === 'declined' ? 'Berhalangan Hadir' : 'Belum Konfirmasi'
            }. Batas waktu konfirmasi online telah ditutup oleh panitia. Silakan hubungi panitia untuk informasi registrasi langsung di lokasi.`
          )
        }
      } else {
        setCheckMsg('Data tidak ditemukan. Pastikan ID Registrasi atau nomor WhatsApp yang Anda masukkan sudah terdaftar.')
      }
    } catch (err) {
      setCheckMsg('Terjadi kendala saat memeriksa data. Silakan coba beberapa saat lagi.')
    } finally {
      setCheckLoading(false)
    }
  }

  // TAMPILAN 1: LOADING AWAL
  if (view === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#090d16] px-4 text-white">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent mx-auto" />
          <p className="text-sm font-medium text-amber-200/80">Menyiapkan portal undangan resmi...</p>
        </div>
      </main>
    )
  }

  // TAMPILAN 2: E-TIKET DIGITAL DENGAN QR CODE (JIKA SUDAH KONFIRMASI)
  if (view === 'ticket' && existingParticipant) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(
      existingParticipant.id_registrasi
    )}`

    return (
      <main className="relative min-h-screen overflow-hidden bg-[#0a0f1d] px-4 py-10 text-white sm:px-6">
        {/* Ambient Warm Golden Lighting */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/2 top-[-10%] h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[10%] h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[130px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-xl space-y-6">
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              E-Ticket Masuk Resmi & Pengambilan Souvenir
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white font-serif">
              Peluncuran Buku: Timah, Manusia, dan Masa Depan
            </h1>
            <p className="text-xs text-amber-100/70 font-sans tracking-wide">
              Menata Ulang Arah Pembangunan Hijau dan Digital
            </p>
          </div>

          {/* Banner info saat RSVP ditutup */}
          {rsvpSettings?.status === 'closed' && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-center text-xs text-amber-200/90 space-y-1">
              <p className="font-bold text-amber-300">ℹ️ Konfirmasi Kehadiran Online Telah Ditutup</p>
              <p className="text-[11px] text-slate-300">
                E-Ticket dan QR Code Anda tetap aktif dan sah digunakan untuk registrasi masuk di lokasi acara.
              </p>
            </div>
          )}

          {/* Ticket Card Container */}
          <div className="overflow-hidden rounded-[2.5rem] border border-amber-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shadow-2xl backdrop-blur-xl">
            {/* Event Time & Venue Bar */}
            <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 p-4 text-center text-xs text-slate-300 space-y-1">
              <p className="font-bold text-amber-300">Senin, 9 November 2026 • 15.00 - 19.00 WIB</p>
              <p className="text-slate-300">Sumba Room, Hotel Borobudur Jakarta</p>
            </div>

            {/* QR Code Presentation */}
            <div className="p-8 text-center space-y-6">
              <div className="inline-block rounded-3xl bg-white p-4 shadow-2xl shadow-black/60 border-4 border-amber-400/30">
                <img
                  src={qrUrl}
                  alt={`QR Code ${existingParticipant.id_registrasi}`}
                  className="h-56 w-56 object-contain sm:h-64 sm:w-64"
                />
              </div>

              {/* ID & Gate Badge */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-xl bg-slate-950 px-4 py-2 font-mono text-base font-black text-amber-300 border border-amber-500/40 shadow-inner">
                  {existingParticipant.id_registrasi}
                </span>
                <span className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-300 border border-emerald-500/40">
                  Gate {existingParticipant.gate || '1'}
                </span>
              </div>

              {/* Guest Details */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-left space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Nama Tamu Undangan</span>
                  <span className="font-bold text-white text-base">{existingParticipant.name}</span>
                </div>
                {existingParticipant.pekerjaan && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Instansi / Jabatan</span>
                    <span className="text-slate-200">{existingParticipant.pekerjaan}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">No. WhatsApp</span>
                  <span className="text-slate-200 font-mono">{existingParticipant.notelp}</span>
                </div>
                {existingParticipant.waktu_konfirmasi && (
                  <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-white/5">
                    <span>Waktu Konfirmasi</span>
                    <span>{new Date(existingParticipant.waktu_konfirmasi).toLocaleString('id-ID')} WIB</span>
                  </div>
                )}
              </div>

              {/* Akses Masuk Notice */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 text-left">
                <b className="text-emerald-200">Akses Pintu Masuk (Gate):</b>
                <p className="mt-0.5 text-emerald-300/90 leading-relaxed">
                  E-Ticket QR Code resmi ini milik Anda. Silakan tunjukkan layar ponsel ini kepada petugas registrasi di pintu masuk Gate acara untuk validasi kedatangan.
                </p>
              </div>

              {/* Akses Pengambilan Souvenir */}
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-left">
                <p className="text-slate-300 leading-relaxed">
                  <b className="text-amber-200">Akses Pengambilan Souvenir:</b> QR Code ini berlaku juga untuk mengambil paket souvenir.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-4 text-sm font-bold text-slate-950 hover:from-amber-300 hover:to-amber-400 transition shadow-xl shadow-amber-500/20 active:scale-[0.98]"
                >
                  Cetak / Simpan E-Ticket
                </button>

                {rsvpSettings?.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => setView('form')}
                    className="w-full sm:w-auto rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  >
                    Kembali ke Form
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // TAMPILAN 3: JIKA TAMU MEMILIH BERHALANGAN HADIR
  if (view === 'declined') {
    return (
      <main className="relative min-h-screen flex items-center justify-center bg-[#0a0f1d] px-4 py-16 text-white">
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-2">
            <span className="rounded-full bg-slate-800 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Konfirmasi Dicatat
            </span>
            <h2 className="text-2xl font-bold text-white font-serif">Terima Kasih Atas Konfirmasi Anda</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Bapak/Ibu <b className="text-white">{inputName || existingParticipant?.name || 'Tamu Undangan'}</b>, kami mencatat bahwa Anda berhalangan hadir pada acara:
            </p>
            <p className="text-sm font-bold text-amber-300">
              Peluncuran Buku: Timah, Manusia, dan Masa Depan
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-xs text-slate-400 text-left">
            Kami sangat menghargai konfirmasi Anda. Semoga pada kesempatan acara berikutnya kita dapat berjumpa kembali.
          </div>

          {rsvpSettings?.status !== 'closed' && (
            <div className="pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setView('form')}
                className="text-xs text-amber-400 hover:text-amber-300 underline font-medium transition"
              >
                Berubah pikiran? Klik di sini untuk mengonfirmasi kehadiran
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  // TAMPILAN JIKA PORTAL KONFIRMASI DITUTUP OLEH PANITIA / KLIEN
  if (rsvpSettings?.status === 'closed') {
    return (
      <main className="relative min-h-screen flex items-center justify-center bg-[#070b14] px-4 py-12 text-white">
        {/* Background Ambient Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-[20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-rose-600/10 blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[20%] h-[400px] w-[400px] rounded-full bg-amber-600/10 blur-[150px]" />
        </div>

        <div className="relative z-10 w-full max-w-xl space-y-6">
          {/* Header Badge */}
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-300 shadow-sm">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
              <span>Portal Konfirmasi Ditutup</span>
            </span>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white font-serif">
              Peluncuran Buku: Timah, Manusia, dan Masa Depan
            </h1>
            <p className="text-xs text-amber-100/70 font-sans tracking-wide">
              Menata Ulang Arah Pembangunan Hijau dan Digital
            </p>
          </div>

          {/* Main Card Announcement */}
          <div className="overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="border-b border-slate-800 pb-5 text-center space-y-2">
              <h2 className="text-xl font-bold text-white font-serif">
                {rsvpSettings.title || 'Konfirmasi Kehadiran Telah Ditutup'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {rsvpSettings.message ||
                  'Batas waktu konfirmasi kehadiran secara online untuk acara Peluncuran Buku telah ditutup oleh panitia pelaksana. Bagi Bapak/Ibu tamu undangan yang telah melakukan konfirmasi kehadiran sebelumnya, e-Ticket dan QR Code tetap dapat diakses di bawah ini.'}
              </p>
            </div>

            {/* Event Time & Venue Info */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 text-center text-xs text-slate-300 space-y-1">
              <p className="font-bold text-amber-300">Waktu & Tempat Acara:</p>
              <p className="text-white font-semibold">Senin, 9 November 2026 • 15.00 - 19.00 WIB</p>
              <p className="text-slate-400">Sumba Room, Hotel Borobudur Jakarta</p>
            </div>

            {/* Cek / Ambil E-Ticket Bagi yang Sudah Konfirmasi */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-950/80 p-5 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Sudah Pernah Konfirmasi Hadir?
                </p>
                <p className="text-xs text-slate-400">
                  Masukkan ID Registrasi atau nomor WhatsApp Anda untuk membuka e-Ticket & QR Code:
                </p>
              </div>

              <form onSubmit={handleCheckTicket} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={checkQuery}
                    onChange={(e) => {
                      setCheckQuery(e.target.value)
                      setCheckMsg('')
                    }}
                    placeholder="Contoh: 0812xxxx atau REG-XXXX"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={checkLoading || !checkQuery.trim()}
                    className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-cyan-400 transition active:scale-95 disabled:opacity-50"
                  >
                    {checkLoading ? 'Memeriksa...' : 'Buka E-Ticket'}
                  </button>
                </div>

                {checkMsg && (
                  <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 leading-relaxed">
                    {checkMsg}
                  </p>
                )}
              </form>
            </div>

            {/* Contact Note */}
            <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/80 space-y-1">
              <p>Untuk pertanyaan dan bantuan di lokasi acara, silakan hubungi:</p>
              <p className="font-semibold text-slate-300">{rsvpSettings.contact_person || 'Panitia Pelaksana'}</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // TAMPILAN 4: FORMULIR UTAMA DENGAN KEY VISUAL (KV) RESMI & PENGAMANAN DOUBLE RESERVASI
  const rsvpStatus = (selectedParticipant?.rsvp_status || '').trim().toLowerCase()
  const isConfirmedHadir = rsvpStatus === 'confirmed'
  const isDeclined = rsvpStatus === 'declined'

  return (
    <main className="relative min-h-screen bg-[#070b14] text-white">
      {/* Background Luxury Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[20%] top-[-10%] h-[600px] w-[600px] rounded-full bg-amber-600/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[10%] h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[150px]" />
      </div>

      {/* TOP HEADER BRANDING */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-md">
              T
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Undangan Resmi
              </p>
              <h2 className="text-sm font-semibold text-white">
                Peluncuran Buku: Timah, Manusia, dan Masa Depan
              </h2>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-semibold text-amber-300">
            Hotel Borobudur Jakarta • 9 Nov 2026
          </span>
        </div>
      </header>

      {/* MAIN CONTAINER: HORIZONTAL 1 BARIS DI DESKTOP, VERTIKAL 1 BARIS DI MOBILE */}
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-4 xl:gap-5">
          
          {/* POSTER 1: UNDANGAN RESMI */}
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-[20%] xl:w-[21%] mx-auto lg:mx-0 shrink-0">
            <div className="overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-slate-900/60 p-2 shadow-2xl shadow-black/80 backdrop-blur-xl">
              <div 
                onClick={() => setPreviewImage('/invitation-v2.jpg')}
                className="group relative aspect-[1024/726] w-full cursor-pointer overflow-hidden rounded-2xl bg-slate-950"
                title="Klik untuk memperbesar gambar"
              >
                <img
                  src="/invitation-v2.jpg"
                  alt="Key Visual Undangan Resmi Peluncuran Buku Timah, Manusia, dan Masa Depan"
                  className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-lg border border-amber-500/40 backdrop-blur-sm">
                    🔍 Perbesar
                  </span>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/20" />
              </div>
            </div>
          </div>

          {/* POSTER 2: KATA PENGANTAR */}
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-[20%] xl:w-[21%] mx-auto lg:mx-0 shrink-0">
            <div className="overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-slate-900/60 p-2 shadow-2xl shadow-black/80 backdrop-blur-xl">
              <div 
                onClick={() => setPreviewImage('/kata-pengantar.jpg')}
                className="group relative aspect-[1024/726] w-full cursor-pointer overflow-hidden rounded-2xl bg-slate-950"
                title="Klik untuk memperbesar gambar"
              >
                <img
                  src="/kata-pengantar.jpg"
                  alt="Kata Pengantar Menteri ESDM RI Peluncuran Buku Timah, Manusia, dan Masa Depan"
                  className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-lg border border-amber-500/40 backdrop-blur-sm">
                    🔍 Perbesar
                  </span>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/20" />
              </div>
            </div>
          </div>

          {/* POSTER 3: AGENDA ACARA */}
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-[20%] xl:w-[21%] mx-auto lg:mx-0 shrink-0">
            <div className="overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-slate-900/60 p-2 shadow-2xl shadow-black/80 backdrop-blur-xl">
              <div 
                onClick={() => setPreviewImage('/agenda.jpg')}
                className="group relative aspect-[1024/726] w-full cursor-pointer overflow-hidden rounded-2xl bg-slate-950"
                title="Klik untuk memperbesar gambar"
              >
                <img
                  src="/agenda.jpg"
                  alt="Agenda Acara Peluncuran Buku Timah, Manusia, dan Masa Depan"
                  className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-lg border border-amber-500/40 backdrop-blur-sm">
                    🔍 Perbesar
                  </span>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/20" />
              </div>
            </div>
          </div>

          {/* FORMULIR KONFIRMASI (RSVP) */}
          <section className="w-full max-w-lg lg:max-w-none lg:flex-1 mx-auto lg:mx-0">
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8 space-y-6">
              
              {/* Title Section */}
              <div className="space-y-1.5">
                <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                  Konfirmasi Kehadiran Tamu (RSVP)
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
                  Reservasi Undangan
                </h1>
              </div>

              {/* Error Notice */}
              {error && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/50 p-4 text-xs text-rose-200 animate-fadeIn">
                  <p className="font-bold text-rose-300">Perhatian:</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              )}

              {/* Info Notice Jika Sudah Pernah Konfirmasi Hadir (E-Ticket) */}
              {isConfirmedHadir && selectedParticipant && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-200 animate-fadeIn space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                      Status: Konfirmasi Hadir
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-emerald-300">Informasi Registrasi:</p>
                    <p className="mt-0.5 leading-relaxed text-slate-200">
                      Halo Bapak/Ibu <b className="text-white">{selectedParticipant.name}</b>, konfirmasi kehadiran Anda telah tercatat di sistem. E-Ticket QR Code Anda sudah terbit.
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setView('ticket')}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:opacity-95 transition shadow-lg active:scale-95 flex items-center justify-center"
                    >
                      Buka / Tampilkan E-Ticket QR Code Saya
                    </button>
                  </div>
                </div>
              )}

              {/* Info Notice Jika Statusnya Berhalangan Hadir */}
              {isDeclined && selectedParticipant && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-200 animate-fadeIn space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                      Status: Berhalangan Hadir
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-rose-300">Status Konfirmasi Anda:</p>
                    <p className="mt-0.5 leading-relaxed text-slate-200">
                      Bapak/Ibu <b className="text-white">{selectedParticipant.name}</b>, Anda tercatat <b>Berhalangan Hadir</b> pada acara ini.
                    </p>
                  </div>
                  <p className="text-[11px] text-amber-300 pt-1">
                    Berubah pikiran dan ingin hadir? Silakan klik tombol <b>Ubah Menjadi Hadir</b> di bawah untuk menerbitkan E-Ticket QR Code.
                  </p>
                </div>
              )}

              {/* FORMULIR INPUT 2 FIELD (NAMA & WHATSAPP) */}
              <div className="space-y-5">
                
                {/* FIELD 1: NAMA LENGKAP DENGAN AUTOREADING */}
                <div className="relative" ref={dropdownRef}>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <span>Nama Lengkap</span>
                      <span className="text-amber-400">*</span>
                    </label>
                    {isSearching && (
                      <span className="text-[11px] text-amber-300 animate-pulse flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                        Mencari di database...
                      </span>
                    )}
                    {selectedParticipant && !isSearching && (
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Terverifikasi di Database
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={inputName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true)
                      }}
                      placeholder="Ketik nama lengkap Anda..."
                      className="w-full rounded-2xl border-2 border-slate-700 bg-slate-950/90 px-4 py-3.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none transition shadow-inner"
                    />
                    {selectedParticipant && (
                      <button
                        type="button"
                        onClick={handleResetSelection}
                        title="Hapus dan pilih nama lain"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full bg-slate-800 p-1 text-xs text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* DROPDOWN AUTOREADING SUGGESTIONS */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-amber-500/30 bg-slate-900/98 shadow-2xl backdrop-blur-xl overflow-hidden divide-y divide-white/5 animate-fadeIn max-h-64 overflow-y-auto">
                      {suggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectParticipant(p)}
                          className="w-full px-4 py-3 text-left transition hover:bg-amber-500/10 block group"
                        >
                          <p className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                            {p.name}
                          </p>
                          {p.pekerjaan && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {p.pekerjaan}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Keterangan saat tamu terpilih */}
                  {selectedParticipant && (
                    <div className="mt-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 p-3 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <b>{selectedParticipant.name}</b> • {selectedParticipant.pekerjaan || 'Tamu Undangan'}
                      </div>
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-mono font-bold text-amber-300 text-[11px]">
                        {selectedParticipant.id_registrasi}
                      </span>
                    </div>
                  )}
                </div>

                {/* FIELD 2: NOMOR TELEPON / WHATSAPP */}
                <div>
                  <div className="mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <span>Nomor WhatsApp</span>
                      <span className="text-amber-400">*</span>
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type="tel"
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full rounded-2xl border-2 border-slate-700 bg-slate-950/90 px-4 py-3.5 text-sm font-mono font-semibold text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none transition shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (HANYA MUNCUL JIKA BELUM KONFIRMASI HADIR) */}
              {!isConfirmedHadir && (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    disabled={loading || declining}
                    onClick={handleConfirmPresence}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-6 py-4 text-sm font-bold text-slate-950 transition-all hover:opacity-95 shadow-xl shadow-amber-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                        <span>Memproses Verifikasi...</span>
                      </>
                    ) : isDeclined ? (
                      'Ubah Menjadi Hadir & Terbitkan Tiket QR'
                    ) : (
                      'Konfirmasi Hadir & Terbitkan Tiket QR'
                    )}
                  </button>

                  {!isDeclined && (
                    <button
                      type="button"
                      disabled={loading || declining}
                      onClick={handleDeclinePresence}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-[0.98] disabled:opacity-50"
                    >
                      {declining ? 'Mencatat...' : 'Mohon Maaf, Berhalangan Hadir'}
                    </button>
                  )}
                </div>
              )}

              {/* Protokoler Notice */}
              <div className="border-t border-white/5 pt-4 text-center">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Data konfirmasi kehadiran Anda terlindungi secara resmi dan digunakan untuk penerbitan E-Ticket QR Code serta penukaran paket souvenir pada acara.
                </p>
              </div>

            </div>
          </section>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-slate-500">
        Panitia Penyelenggara Peluncuran Buku: Timah, Manusia, dan Masa Depan • Hotel Borobudur Jakarta
      </footer>

      {/* LIGHTBOX MODAL: PREVIEW FULL SIZE IMAGE */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-h-[92vh] max-w-5xl overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950 shadow-2xl p-2"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/90 text-white hover:bg-amber-500 hover:text-black transition shadow-xl border border-white/20 font-bold text-sm"
              title="Tutup Preview"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Perbesar Gambar Undangan"
              className="max-h-[88vh] w-auto max-w-full rounded-xl object-contain shadow-inner"
            />
          </div>
        </div>
      )}
    </main>
  )
}
