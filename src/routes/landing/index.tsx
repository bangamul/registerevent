import { useState, useEffect } from 'react'
import { confirmAttendance, checkExistingParticipant, type Participant } from './data'

interface RsvpData {
  name: string
  notelp: string
  pekerjaan: string
  email: string
  gate: string
  role_permission: string
  id_registrasi: string
}

export function LandingPage() {
  // View states: 'loading' | 'rsvp' | 'ticket' | 'declined' | 'no-token'
  const [view, setView] = useState<'loading' | 'rsvp' | 'ticket' | 'declined' | 'no-token'>('loading')
  const [existingParticipant, setExistingParticipant] = useState<Participant | null>(null)
  const [rsvpData, setRsvpData] = useState<RsvpData | null>(null)
  const [loading, setLoading] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState('')

  // Parsing Token dari URL saat pertama kali halaman dimuat
  useEffect(() => {
    async function initFromUrl() {
      if (typeof window === 'undefined') return

      const searchParams = new URLSearchParams(window.location.search)
      const token = searchParams.get('token')
      const idReg = searchParams.get('idRegistrasi') || searchParams.get('id')

      // Jika ada idRegistrasi langsung di query string
      if (idReg) {
        const found = await checkExistingParticipant(idReg)
        if (found) {
          setExistingParticipant(found)
          if (found.rsvp_status === 'declined') {
            setView('declined')
          } else if (found.rsvp_status === 'confirmed') {
            setView('ticket')
          } else {
            setRsvpData({
              name: found.name,
              notelp: found.notelp,
              pekerjaan: found.pekerjaan || '',
              email: found.email || '',
              gate: String(found.gate || '1'),
              role_permission: String(found.role_permission || '1'),
              id_registrasi: found.id_registrasi,
            })
            setView('rsvp')
          }
          return
        }
      }

      // Jika ada token dari WhatsApp Blast
      if (token) {
        try {
          const jsonStr = decodeURIComponent(escape(atob(token.replace(/-/g, '+').replace(/_/g, '/'))))
          const payload = JSON.parse(jsonStr)

          const phone = payload?.phone || payload?.p
          const name = payload?.name || payload?.n || 'Tamu Undangan'
          const pekerjaan = payload?.pekerjaan || payload?.instansi || ''
          const email = payload?.email || ''
          const gate = String(payload?.gate || payload?.g || '1')
          const role_permission = String(payload?.role_permission || payload?.r || '1')
          const id_registrasi = payload?.id || payload?.id_registrasi || ''

          if (phone) {
            // Cek apakah nomor WA ini sudah tercatat di database
            const found = await checkExistingParticipant(phone)

            if (found) {
              setExistingParticipant(found)
              if (found.rsvp_status === 'declined') {
                setRsvpData({
                  name: found.name || name,
                  notelp: found.notelp || phone,
                  pekerjaan: found.pekerjaan || pekerjaan,
                  email: found.email || email,
                  gate: String(found.gate || gate),
                  role_permission: String(found.role_permission || role_permission),
                  id_registrasi: found.id_registrasi,
                })
                setView('declined')
              } else if (found.rsvp_status === 'confirmed') {
                // SUDAH PERNAH KONFIRMASI: Langsung tampilkan tiket QR
                setView('ticket')
              } else {
                // BELUM KONFIRMASI: Tampilkan Kartu RSVP Konfirmasi Kehadiran
                setRsvpData({
                  name: found.name || name,
                  notelp: found.notelp || phone,
                  pekerjaan: found.pekerjaan || pekerjaan,
                  email: found.email || email,
                  gate: String(found.gate || gate),
                  role_permission: String(found.role_permission || role_permission),
                  id_registrasi: found.id_registrasi,
                })
                setView('rsvp')
              }
              return
            }

            // Jika belum ada di database tapi membawa token sah
            setRsvpData({
              name,
              notelp: phone,
              pekerjaan,
              email,
              gate,
              role_permission,
              id_registrasi,
            })
            setView('rsvp')
            return
          }
        } catch (err) {
          console.error('Gagal memproses token undangan:', err)
        }
      }

      // Jika dibuka tanpa token resmi
      setView('no-token')
    }

    void initFromUrl()
  }, [])

  // Aksi 1: Konfirmasi Kehadiran (Hadir)
  const handleConfirmPresence = async () => {
    if (!rsvpData) return

    try {
      setLoading(true)
      setError('')

      const updated = await confirmAttendance({
        notelp: rsvpData.notelp,
        id_registrasi: rsvpData.id_registrasi,
        name: rsvpData.name,
        pekerjaan: rsvpData.pekerjaan,
        email: rsvpData.email,
        gate: rsvpData.gate,
        role_permission: rsvpData.role_permission,
        action: 'confirm',
      })

      if (updated) {
        setExistingParticipant(updated)
        setView('ticket')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengonfirmasi kehadiran. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // Aksi 2: Konfirmasi Berhalangan Hadir (Tidak Hadir)
  const handleDeclinePresence = async () => {
    if (!rsvpData) return
    if (!confirm('Apakah Anda yakin berhalangan hadir pada acara ini?')) return

    try {
      setDeclining(true)
      setError('')

      await confirmAttendance({
        notelp: rsvpData.notelp,
        id_registrasi: rsvpData.id_registrasi,
        name: rsvpData.name,
        action: 'decline',
      })

      setView('declined')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan status konfirmasi.')
    } finally {
      setDeclining(false)
    }
  }

  // TAMPILAN 1: LOADING STATE
  if (view === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mx-auto" />
          <p className="text-sm text-slate-400">Memverifikasi tautan undangan resmi Anda...</p>
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
      <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 text-white sm:px-6">
        {/* Ambient Glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-[-10%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[130px]" />
          <div className="absolute bottom-[-10%] left-[20%] h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[130px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-xl space-y-6">
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              E-Ticket Masuk Resmi
            </span>
            <h1 className="text-2xl font-extrabold sm:text-3xl text-white">
              Peluncuran Buku: Timah, Manusia, dan Masa Depan
            </h1>
            <p className="text-xs text-slate-400">
              Menata Ulang Arah Pembangunan Hijau dan Digital
            </p>
          </div>

          {/* Ticket Card Container */}
          <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
            {/* Event Time & Venue Bar */}
            <div className="border-b border-white/10 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 p-5 text-center text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-emerald-400">📅 Senin, 9 November 2026 • 15.00 - 19.00 WIB</p>
              <p className="text-slate-400">📍 Sumba Room, Hotel Borobudur Jakarta</p>
            </div>

            {/* QR Code Presentation */}
            <div className="p-8 text-center space-y-6">
              <div className="inline-block rounded-3xl bg-white p-4 shadow-xl shadow-black/40">
                <img
                  src={qrUrl}
                  alt={`QR Code ${existingParticipant.id_registrasi}`}
                  className="h-56 w-56 object-contain sm:h-64 sm:w-64"
                />
              </div>

              {/* ID & Gate Badge */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-xl bg-slate-950 px-4 py-2 font-mono text-base font-bold text-cyan-400 border border-slate-800">
                  {existingParticipant.id_registrasi}
                </span>
                <span className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 border border-emerald-500/30">
                  Gate {existingParticipant.gate || '1'}
                </span>
              </div>

              {/* Guest Details */}
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-left space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Nama Tamu</span>
                  <span className="font-bold text-white">{existingParticipant.name}</span>
                </div>
                {existingParticipant.pekerjaan && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Instansi / Profesi</span>
                    <span className="text-slate-200">{existingParticipant.pekerjaan}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">No. WhatsApp</span>
                  <span className="text-slate-200">{existingParticipant.notelp}</span>
                </div>
              </div>

              {/* Security Safeguard Notice */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 text-left flex items-start gap-2.5">
                <span className="text-base">✓</span>
                <div>
                  <b>Kehadiran Terkonfirmasi:</b> E-Ticket QR Code resmi ini milik Anda. Silakan tunjukkan layar ini kepada petugas registrasi di pintu masuk Gate acara.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
                >
                  📸 Cetak / Simpan E-Ticket
                </button>
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
      <main className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-16 text-white">
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center shadow-2xl backdrop-blur-xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 text-3xl">
            ✉️
          </div>

          <div className="space-y-2">
            <span className="rounded-full bg-slate-800 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Konfirmasi Dicatat
            </span>
            <h2 className="text-2xl font-bold text-white">Terima Kasih Atas Konfirmasi Anda</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Bapak/Ibu <b className="text-white">{rsvpData?.name || existingParticipant?.name || 'Tamu Undangan'}</b>, kami mencatat bahwa Anda berhalangan hadir pada acara:
            </p>
            <p className="text-sm font-semibold text-cyan-400">
              Peluncuran Buku: Timah, Manusia, dan Masa Depan
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-xs text-slate-400 text-left">
            Kami sangat menghargai waktu dan konfirmasi Anda. Semoga kita dapat berjumpa pada kesempatan acara berikutnya.
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmPresence}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium transition"
            >
              Berubah pikiran? Klik di sini untuk Konfirmasi Hadir & Terbitkan Tiket QR
            </button>
          </div>
        </div>
      </main>
    )
  }

  // TAMPILAN 4: AKSES TANPA TOKEN RESMI
  if (view === 'no-token') {
    return (
      <main className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-16 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 text-2xl">
            🔒
          </div>
          <h2 className="mt-4 text-xl font-bold">Portal Undangan Khusus</h2>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Halaman konfirmasi acara <b>Peluncuran Buku Timah, Manusia, dan Masa Depan</b> hanya dapat diakses melalui tautan khusus yang dikirimkan ke nomor WhatsApp tamu undangan resmi.
          </p>
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-500 text-left">
            Silakan periksa pesan WhatsApp Anda untuk mengklik tautan resmi konfirmasi kehadiran.
          </div>
        </div>
      </main>
    )
  }

  // TAMPILAN 5: KARTU KONFIRMASI KEHADIRAN (1-CLICK RSVP) - TIDAK PERLU KETIK DARI NOL
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
      {/* Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[10%] h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl space-y-6">
        {/* Header Event */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            ✨ Undangan Resmi Eksklusif
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl text-white">
            Peluncuran Buku: Timah, Manusia, dan Masa Depan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Menata Ulang Arah Pembangunan Hijau dan Digital
          </p>
        </div>

        {/* Card RSVP Konfirmasi */}
        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10 space-y-6">
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Event Venue & Date */}
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">Hari & Tanggal</p>
                <p className="font-semibold text-white">Senin, 9 November 2026</p>
                <p className="text-slate-400">15.00 - 19.00 WIB</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-lg">📍</span>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">Lokasi Acara</p>
                <p className="font-semibold text-white">Sumba Room</p>
                <p className="text-slate-400">Hotel Borobudur Jakarta</p>
              </div>
            </div>
          </div>

          {/* Kartu Profil Tamu Undangan */}
          <div className="space-y-4">
            <div className="border-b border-white/5 pb-2">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Penerima Undangan Resmi
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-slate-950/50 to-slate-900/40 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="text-xs text-cyan-400 font-medium">Kepada Yth.</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                    {rsvpData?.name || 'Tamu Undangan'}
                  </h2>
                  <p className="text-sm text-slate-300">
                    {rsvpData?.pekerjaan || 'Tamu Kehormatan'}
                  </p>
                </div>

                <span className="inline-flex self-start sm:self-center items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                  <span>🔒</span> Terverifikasi WhatsApp
                </span>
              </div>

              {/* Grid Detail Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 text-xs">
                <div>
                  <p className="text-slate-500">No. WhatsApp</p>
                  <p className="font-medium text-slate-200 mt-0.5">{rsvpData?.notelp || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Sesi Acara</p>
                  <p className="font-medium text-cyan-400 mt-0.5">Sesi {rsvpData?.role_permission || '1'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Akses Pintu</p>
                  <p className="font-medium text-emerald-400 mt-0.5">Gate {rsvpData?.gate || '1'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Invitation Notice */}
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 text-xs text-slate-400 leading-relaxed">
            💡 <b>Konfirmasi Cukup 1 Klik:</b> Data Anda telah dipersiapkan oleh panitia. Mohon klik tombol di bawah ini untuk mengonfirmasi kehadiran Anda dan menerbitkan <b>E-Ticket QR Code</b> yang akan digunakan untuk akses masuk di lokasi acara.
          </div>

          {/* Action Buttons: Hadir vs Berhalangan */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={loading || declining}
              onClick={handleConfirmPresence}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-4 text-base font-bold text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:from-emerald-400 hover:to-cyan-400 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Menerbitkan E-Ticket QR Code...</span>
                </>
              ) : (
                <>
                  <span className="text-lg transition group-hover:scale-110">🎟️</span>
                  <span>Konfirmasi Hadir & Ambil Tiket QR</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={loading || declining}
              onClick={handleDeclinePresence}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-xs font-medium text-slate-400 transition hover:bg-slate-900 hover:text-slate-200 disabled:opacity-50"
            >
              {declining ? (
                <span>Mencatat konfirmasi...</span>
              ) : (
                <span>Maaf, Saya Berhalangan Hadir</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
